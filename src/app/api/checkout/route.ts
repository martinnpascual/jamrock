/**
 * POST /api/checkout
 *
 * Flujo atómico de checkout: dispensa + productos + pago.
 * Usa createAdminClient() (service_role) para bypassear RLS en todos los inserts.
 *
 * DISEÑO DE CC:
 *   Las sales se crean SIN member_id para evitar que sale_to_cc_movement
 *   genere DÉBITO duplicado. La asociación socio↔venta vive en checkout_items.
 *   CC se maneja exclusivamente aquí:
 *     PAGO:     DÉBITO manual (total) + CRÉDITO via payment trigger → neto 0
 *     FIADO:    DÉBITO manual (total) → queda como deuda
 *     MIXTO_3:  DÉBITO manual (total) + CRÉDITO via payment (parte pagada) + DÉBITO fiado (parte CC)
 *     GRATIS (total=0): sin movimiento CC
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkoutRequestSchema } from '@/lib/validations/checkout'
import { logActivity, getUserName } from '@/lib/audit'

export async function POST(request: NextRequest) {
  // ── Autenticación ─────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para registrar checkout' }, { status: 403 })
  }

  // ── Parsear body ──────────────────────────────────────────────────────────
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = checkoutRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { member_id, dispensations: dispInputs, items = [], payment } = parsed.data
  const admin = createAdminClient()

  // ── PASO 1: VALIDACIONES ──────────────────────────────────────────────────

  // 1a. Socio existe y no está eliminado
  const { data: member, error: memberErr } = await admin
    .from('members')
    .select('id, first_name, last_name, member_number, reprocann_status')
    .eq('id', member_id)
    .eq('is_deleted', false)
    .single()

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
  }

  // 1b. REPROCANN activo
  if (member.reprocann_status !== 'activo') {
    return NextResponse.json(
      { error: `Dispensa bloqueada: REPROCANN ${member.reprocann_status}` },
      { status: 422 }
    )
  }

  // 1c. Validar lotes medicinales: existen, no eliminados, stock suficiente
  //     Acumular gramos por lot_id para evitar que múltiples dispensas del mismo lote excedan stock
  const uniqueLotIds = Array.from(new Set(dispInputs.map(d => d.lot_id)))
  const { data: lotRows, error: lotErr } = await admin
    .from('medical_stock_lots')
    .select('id, genetics, current_grams, price_per_gram')
    .in('id', uniqueLotIds)
    .eq('is_deleted', false)

  if (lotErr) {
    return NextResponse.json({ error: 'Error al validar lotes medicinales' }, { status: 500 })
  }

  const lotsMap = new Map((lotRows ?? []).map(l => [l.id, l]))

  // Acumular gramos solicitados por lote
  const gramsByLot: Record<string, number> = {}
  for (const d of dispInputs) {
    gramsByLot[d.lot_id] = (gramsByLot[d.lot_id] ?? 0) + d.quantity_grams
  }

  for (const [lotId, gramsNeeded] of Object.entries(gramsByLot)) {
    const lot = lotsMap.get(lotId)
    if (!lot) {
      return NextResponse.json({ error: `Lote medicinal no encontrado: ${lotId}` }, { status: 404 })
    }
    if (lot.current_grams < gramsNeeded) {
      return NextResponse.json(
        { error: `Stock insuficiente para "${lot.genetics}". Disponible: ${lot.current_grams}g, solicitado: ${gramsNeeded}g` },
        { status: 422 }
      )
    }
  }

  // 1d. Validar productos del carrito (batch query)
  type ProductRow = { id: string; name: string; price: number; stock_quantity: number }
  const productsMap: Record<string, ProductRow> = {}

  if (items.length > 0) {
    const productIds = items.map(i => i.product_id)
    const { data: productRows, error: prodErr } = await admin
      .from('commercial_products')
      .select('id, name, price, stock_quantity')
      .in('id', productIds)
      .eq('is_deleted', false)

    if (prodErr) {
      return NextResponse.json({ error: 'Error al validar productos' }, { status: 500 })
    }

    const foundProducts = new Map((productRows ?? []).map(p => [p.id, p]))

    for (const item of items) {
      const product = foundProducts.get(item.product_id)
      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.product_id}` }, { status: 404 })
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock_quantity}` },
          { status: 422 }
        )
      }
      productsMap[item.product_id] = product
    }
  }

  // 1e. Precio por gramo: prioridad al precio del lote, fallback a config global
  // Cargar config global una vez (fallback para lotes sin precio)
  let globalPricePerGram = 0
  {
    const { data: configRow } = await admin
      .from('app_config')
      .select('value')
      .eq('key', 'dispensation_price_per_gram')
      .single()
    const dispConfig = (configRow?.value as { enabled: boolean; price: number }) ?? { enabled: false, price: 0 }
    globalPricePerGram = dispConfig.enabled ? Number(dispConfig.price) : 0
  }

  // 1f. Calcular totales con descuento para cada dispensa
  const allowedDiscounts = [0, 5, 10, 15, 20, 25]

  interface DispCalc {
    input: typeof dispInputs[number]
    lot: typeof lotRows extends (infer T)[] ? T : never
    pricePerGram: number
    subtotal: number
    discountPercent: number
    discountAmount: number
    amount: number
  }

  const dispCalcs: DispCalc[] = dispInputs.map(d => {
    const lot = lotsMap.get(d.lot_id)!
    const ppg = Number(lot.price_per_gram ?? 0) || globalPricePerGram
    const sub = ppg * d.quantity_grams
    const disc = allowedDiscounts.includes(d.discount_percent ?? 0) ? (d.discount_percent ?? 0) : 0
    const discAmt = sub * (disc / 100)
    return {
      input: d,
      lot,
      pricePerGram: ppg,
      subtotal: sub,
      discountPercent: disc,
      discountAmount: discAmt,
      amount: sub - discAmt,
    }
  })

  const dispensationAmount = dispCalcs.reduce((sum, d) => sum + d.amount, 0)

  const productsAmount = items.reduce((sum, item) => {
    return sum + (productsMap[item.product_id].price * item.quantity)
  }, 0)
  const totalAmount = dispensationAmount + productsAmount

  // 1g. Extraer montos de pago según método
  const amountCash     = Number(payment.method !== 'cuenta_corriente' ? (payment.amount_cash ?? 0) : 0)
  const amountTransfer = Number(payment.method !== 'cuenta_corriente' ? (payment.amount_transfer ?? 0) : 0)
  const amountCC       = payment.method === 'mixto_3' ? Number((payment as { amount_cc?: number }).amount_cc ?? 0) : 0
  const transferDetail = 'transfer_detail' in payment ? (payment.transfer_detail ?? null) : null
  const transferAmountReceived = 'transfer_amount_received' in payment ? Number(payment.transfer_amount_received ?? 0) : 0

  // 1h. Validar montos de pago
  if (payment.method === 'mixto_3' && totalAmount > 0) {
    // mixto_3: los 3 montos deben cubrir el total
    if (amountCash + amountTransfer + amountCC < totalAmount) {
      return NextResponse.json(
        { error: `Monto insuficiente. Total: $${totalAmount}, Cubierto: $${amountCash + amountTransfer + amountCC}` },
        { status: 422 }
      )
    }
    // Al menos 2 de los 3 montos deben ser > 0
    const nonZeroCount = [amountCash, amountTransfer, amountCC].filter(v => v > 0).length
    if (nonZeroCount < 2) {
      return NextResponse.json(
        { error: 'El pago mixto de 3 vías requiere al menos 2 montos mayores a 0' },
        { status: 422 }
      )
    }
    // transfer_amount_received >= amount_transfer si fue provisto
    if (amountTransfer > 0 && transferAmountReceived > 0 && transferAmountReceived < amountTransfer) {
      return NextResponse.json(
        { error: 'El monto depositado por transferencia no puede ser menor al monto asignado' },
        { status: 422 }
      )
    }
  } else if (payment.method !== 'cuenta_corriente' && totalAmount > 0) {
    if (amountCash + amountTransfer < totalAmount) {
      return NextResponse.json(
        { error: `Monto insuficiente. Total: $${totalAmount}, Recibido: $${amountCash + amountTransfer}` },
        { status: 422 }
      )
    }
  }

  // Validar transfer_amount_received para transferencia y mixto también
  if ((payment.method === 'transferencia' || payment.method === 'mixto') && amountTransfer > 0 && transferAmountReceived > 0 && transferAmountReceived < amountTransfer) {
    return NextResponse.json(
      { error: 'El monto depositado por transferencia no puede ser menor al monto asignado' },
      { status: 422 }
    )
  }

  // 1i. Extraer cc_mode para cuenta_corriente
  const ccMode = payment.method === 'cuenta_corriente' && 'cc_mode' in payment
    ? (payment.cc_mode as 'fiado' | 'saldo')
    : 'fiado'

  // 1j. Validar CC si hay monto fiado (mixto_3 con CC o cuenta_corriente puro)
  if (payment.method === 'cuenta_corriente' || (payment.method === 'mixto_3' && amountCC > 0)) {
    const ccAmount = payment.method === 'cuenta_corriente' ? totalAmount : amountCC
    const { data: ccAccount } = await admin
      .from('current_accounts')
      .select('balance, credit_limit')
      .eq('member_id', member_id)
      .eq('is_deleted', false)
      .single()

    // Si es saldo, validar que el balance sea suficiente
    if (payment.method === 'cuenta_corriente' && ccMode === 'saldo') {
      const balance = ccAccount?.balance ?? 0
      if (balance < totalAmount) {
        return NextResponse.json(
          { error: `Saldo insuficiente para cubrir el total. Saldo: $${balance}, Total: $${totalAmount}` },
          { status: 422 }
        )
      }
    }

    if (ccAccount && ccAccount.credit_limit > 0 && ccMode !== 'saldo') {
      const newBalance = ccAccount.balance - ccAmount
      if (newBalance < -ccAccount.credit_limit) {
        return NextResponse.json(
          { error: `La deuda excede el límite de crédito ($${ccAccount.credit_limit})` },
          { status: 422 }
        )
      }
    }
  }

  // ── PASO 2: CREAR DISPENSAS ───────────────────────────────────────────────
  const isFiado = payment.method === 'cuenta_corriente' && ccMode === 'fiado'
  const isSaldo = payment.method === 'cuenta_corriente' && ccMode === 'saldo'
  const isMixto3 = payment.method === 'mixto_3'
  const paymentStatusForDisp: 'sin_cargo' | 'pagado' | 'fiado' | 'parcial' =
    totalAmount === 0 ? 'sin_cargo'
    : isFiado ? 'fiado'
    : isSaldo ? 'pagado'
    : (isMixto3 && amountCC > 0) ? 'parcial'
    : 'pagado'

  const createdDispensations: { id: string; dispensation_number: string }[] = []

  for (const dc of dispCalcs) {
    const { data: disp, error: dispErr } = await admin
      .from('dispensations')
      .insert({
        member_id,
        lot_id:           dc.input.lot_id,
        genetics:         dc.input.genetics,
        quantity_grams:   dc.input.quantity_grams,
        notes:            dc.input.notes ?? null,
        type:             'normal',
        created_by:       user.id,
        price_per_gram:   dc.pricePerGram,
        subtotal:         dc.subtotal,
        discount_percent: dc.discountPercent,
        discount_amount:  dc.discountAmount,
        total_amount:     dc.amount,
        payment_method:   totalAmount === 0 ? null : ((isFiado || isSaldo) ? 'cuenta_corriente' : payment.method),
        payment_status:   paymentStatusForDisp,
      })
      .select('id, dispensation_number')
      .single()

    if (dispErr || !disp) {
      console.error('checkout: error creating dispensation:', dispErr?.code)
      // Rollback previously created dispensations
      for (const prev of createdDispensations) {
        const prevCalc = dispCalcs[createdDispensations.indexOf(prev)]
        await admin.from('dispensations').insert({
          member_id,
          lot_id:         prevCalc.input.lot_id,
          genetics:       prevCalc.input.genetics,
          quantity_grams: prevCalc.input.quantity_grams,
          notes:          'Anulación automática por error en checkout',
          type:           'anulacion',
          nullifies_id:   prev.id,
          created_by:     user.id,
        })
      }
      return NextResponse.json({ error: 'Error al registrar dispensa' }, { status: 500 })
    }
    createdDispensations.push(disp)
  }

  const rollbackDispensation = async () => {
    for (const disp of createdDispensations) {
      const dc = dispCalcs[createdDispensations.indexOf(disp)]
      await admin.from('dispensations').insert({
        member_id,
        lot_id:         dc.input.lot_id,
        genetics:       dc.input.genetics,
        quantity_grams: dc.input.quantity_grams,
        notes:          'Anulación automática por error en checkout',
        type:           'anulacion',
        nullifies_id:   disp.id,
        created_by:     user.id,
      })
    }
  }

  // ── PASO 3: CREAR VENTAS (sin member_id para evitar doble CC) ─────────────
  const saleIds: Record<string, string> = {}

  for (const item of items) {
    const product = productsMap[item.product_id]
    const { data: sale, error: saleErr } = await admin
      .from('sales')
      .insert({
        product_id:     item.product_id,
        member_id:      null,
        quantity:       item.quantity,
        unit_price:     product.price,
        total:          product.price * item.quantity,
        payment_method: (isFiado || isSaldo) ? null : payment.method === 'mixto_3' ? 'mixto_3' : payment.method,
        created_by:     user.id,
      })
      .select('id')
      .single()

    if (saleErr || !sale) {
      console.error('checkout: error creating sale:', saleErr?.code)
      await rollbackDispensation()
      return NextResponse.json({ error: 'Error al registrar venta de producto' }, { status: 500 })
    }
    saleIds[item.product_id] = sale.id
  }

  // ── PASO 4: CC y PAGO ─────────────────────────────────────────────────────
  let paymentId: string | null = null
  let ccMovementId: string | null = null
  let ccFiadoMovementId: string | null = null
  let changeGiven = 0
  let ccBalanceAfter = 0

  if (totalAmount > 0) {
    // Obtener o crear CC del socio
    const { data: existingCC } = await admin
      .from('current_accounts')
      .select('id, balance')
      .eq('member_id', member_id)
      .eq('is_deleted', false)
      .single()

    let accountId: string

    if (existingCC) {
      accountId = existingCC.id
    } else {
      const { data: newCC, error: ccCreateErr } = await admin
        .from('current_accounts')
        .insert({ entity_type: 'socio', member_id, created_by: user.id })
        .select('id, balance')
        .single()
      if (ccCreateErr || !newCC) {
        await rollbackDispensation()
        return NextResponse.json({ error: 'Error al obtener cuenta corriente' }, { status: 500 })
      }
      accountId = newCC.id
    }

    // 4a. DÉBITO manual por el checkout (total completo)
    const dispensasParts = dispCalcs.map((dc, i) =>
      `${dc.input.genetics} ${dc.input.quantity_grams}g`
    ).join(' + ')
    const dispensasNumbers = createdDispensations.map(d => d.dispensation_number).join(', ')
    const itemsDescription = items.length > 0
      ? ` + Productos: ${items.map(i => `${productsMap[i.product_id].name} ×${i.quantity}`).join(', ')}`
      : ''
    const debitDescription = `Dispensa: ${dispensasParts} — ${dispensasNumbers}${itemsDescription}`

    const ccConcept = isSaldo ? 'checkout_saldo' : isFiado ? 'checkout_fiado' : 'checkout_deuda'

    const { data: debitMovement, error: debitErr } = await admin
      .from('current_account_movements')
      .insert({
        account_id:    accountId,
        movement_type: 'debito',
        amount:        totalAmount,
        balance_after: 0,
        concept:       ccConcept,
        description:   debitDescription,
        source_type:   'manual',
        source_id:     null,
        created_by:    user.id,
      })
      .select('id, balance_after')
      .single()

    if (debitErr || !debitMovement) {
      console.error('checkout: error creating debit movement:', debitErr?.message)
      await rollbackDispensation()
      return NextResponse.json({ error: 'Error al registrar movimiento en cuenta corriente' }, { status: 500 })
    }
    ccMovementId   = debitMovement.id
    ccBalanceAfter = debitMovement.balance_after

    // 4b. PAGO (si no es fiado ni saldo puro)
    if (!isFiado && !isSaldo) {
      // Para mixto_3: la parte pagada es cash + transfer (sin CC)
      const paidAmount = isMixto3 ? (amountCash + amountTransfer) : totalAmount
      changeGiven = isMixto3
        ? Math.max(0, (amountCash + amountTransfer) - (totalAmount - amountCC))
        : Math.max(0, amountCash + amountTransfer - totalAmount)

      if (paidAmount > 0) {
        const paymentNotes = `Dispensa: ${dispensasParts} — ${dispensasNumbers}` +
          (items.length > 0 ? ` + ${items.length} producto(s)` : '') +
          (changeGiven > 0 ? ` — Vuelto: $${changeGiven.toFixed(0)}` : '') +
          (isMixto3 && amountCC > 0 ? ` — Fiado parcial: $${amountCC}` : '') +
          (transferDetail ? ` — Transf. detalle: ${transferDetail}` : '')

        const { data: newPayment, error: paymentErr } = await admin
          .from('payments')
          .insert({
            member_id,
            amount:         paidAmount,
            concept:        'dispensa',
            payment_method: payment.method,
            notes:          paymentNotes,
            created_by:     user.id,
          })
          .select('id')
          .single()

        if (paymentErr || !newPayment) {
          console.error('checkout: error creating payment:', paymentErr?.code)
          await rollbackDispensation()
          return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
        }
        paymentId = newPayment.id
      }

      // 4c. Sumar efectivo a caja abierta del día
      if (amountCash > 0) {
        const today = new Date().toISOString().split('T')[0]

        // Buscar caja ABIERTA del día (la más reciente si hay 2 turnos)
        const { data: openReg } = await admin
          .from('cash_registers')
          .select('id, expected_total')
          .eq('register_date', today)
          .eq('status', 'abierta')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (openReg) {
          await admin
            .from('cash_registers')
            .update({ expected_total: Number(openReg.expected_total) + amountCash })
            .eq('id', openReg.id)
        }
        // Si no hay caja abierta, el pago se registra igual pero no se suma a ninguna caja
      }

      // Actualizar balance after del débito (ahora que el payment trigger ya corrió)
      const { data: updatedCC } = await admin
        .from('current_accounts')
        .select('balance')
        .eq('id', accountId)
        .single()
      if (updatedCC) ccBalanceAfter = updatedCC.balance
    }

    // 4d. Si es mixto_3 con CC > 0: crear movimiento DÉBITO adicional por la parte fiada
    if (isMixto3 && amountCC > 0) {
      const cashDesc = amountCash > 0 ? `$${amountCash} efectivo` : ''
      const transDesc = amountTransfer > 0 ? `$${amountTransfer} transferencia` : ''
      const paidParts = [cashDesc, transDesc].filter(Boolean).join(' + ')

      const { data: fiadoMov, error: fiadoErr } = await admin
        .from('current_account_movements')
        .insert({
          account_id:    accountId,
          movement_type: 'debito',
          amount:        amountCC,
          balance_after: 0,
          concept:       'checkout_fiado_parcial',
          description:   `Pago parcial fiado — $${amountCC} de $${totalAmount} total. Pagó ${paidParts}`,
          source_type:   'manual',
          source_id:     null,
          created_by:    user.id,
        })
        .select('id, balance_after')
        .single()

      if (fiadoErr || !fiadoMov) {
        console.error('checkout: error creating fiado parcial movement:', fiadoErr?.message)
      } else {
        ccFiadoMovementId = fiadoMov.id
        ccBalanceAfter = fiadoMov.balance_after
      }
    }
  }

  // ── PASO 5: CREAR checkout_transaction ────────────────────────────────────
  const isFree = totalAmount === 0
  const isCCPure = isFiado || isSaldo
  const paymentStatus = isFree ? 'pagado'
    : isFiado ? 'fiado'
    : isSaldo ? 'pagado'
    : (isMixto3 && amountCC > 0) ? 'parcial'
    : 'pagado'

  const { data: transaction, error: txnErr } = await admin
    .from('checkout_transactions')
    .insert({
      member_id,
      dispensation_id:          createdDispensations[0].id,
      dispensation_amount:      dispensationAmount,
      products_amount:          productsAmount,
      total_amount:             totalAmount,
      payment_status:           paymentStatus,
      payment_method:           isFree || isCCPure ? null : payment.method,
      amount_paid:              isFree || isCCPure ? 0 : (isMixto3 ? amountCash + amountTransfer : totalAmount),
      amount_cash:              amountCash,
      amount_transfer:          amountTransfer,
      amount_charged_to_cc:     isCCPure ? totalAmount : amountCC,
      change_given:             changeGiven,
      transfer_detail:          transferDetail,
      transfer_amount_received: transferAmountReceived > 0 ? transferAmountReceived : null,
      payment_id:               paymentId,
      cc_movement_id:           ccMovementId ?? ccFiadoMovementId,
      notes:                    dispInputs[0].notes ?? null,
      created_by:               user.id,
    })
    .select('id, transaction_number')
    .single()

  if (txnErr || !transaction) {
    console.error('checkout: error creating transaction:', txnErr?.code)
    await rollbackDispensation()
    return NextResponse.json({ error: 'Error al registrar transacción' }, { status: 500 })
  }

  // ── PASO 6: CREAR checkout_items ──────────────────────────────────────────
  if (items.length > 0) {
    const itemsToInsert = items.map(item => {
      const product = productsMap[item.product_id]
      return {
        transaction_id: transaction.id,
        product_id:     item.product_id,
        product_name:   product.name,
        quantity:       item.quantity,
        unit_price:     product.price,
        subtotal:       product.price * item.quantity,
        sale_id:        saleIds[item.product_id] ?? null,
      }
    })

    const { error: itemsErr } = await admin
      .from('checkout_items')
      .insert(itemsToInsert)

    if (itemsErr) {
      console.error('checkout: error creating checkout_items:', itemsErr.code)
    }
  }

  // ── PASO 7: AUDITORÍA + RESPUESTA ─────────────────────────────────────────
  const userName = await getUserName(supabase, user.id)
  const memberName = member?.first_name && member?.last_name
    ? `${member.first_name} ${member.last_name}` : 'Socio'

  const totalGrams = dispCalcs.reduce((s, d) => s + d.input.quantity_grams, 0)
  const geneticsSummary = dispCalcs.map(d => `${d.input.quantity_grams}g ${d.input.genetics}`).join(', ')

  await logActivity({
    admin,
    userId: user.id,
    userName,
    action: 'dispensar',
    entity: 'checkout',
    entityId: transaction.transaction_number,
    description: `Dispensó ${geneticsSummary} a ${memberName} por ${totalAmount > 0 ? `$${totalAmount.toLocaleString('es-AR')}` : 'gratis'} (${paymentStatus})`,
    metadata: {
      member_id,
      member_name: memberName,
      dispensations: dispCalcs.map(d => ({ genetics: d.input.genetics, grams: d.input.quantity_grams })),
      total_grams: totalGrams,
      total: totalAmount,
      payment_method: isFree || isCCPure ? null : payment.method,
      payment_status: paymentStatus,
      amount_cash: amountCash,
      amount_transfer: amountTransfer,
      amount_cc: isCCPure ? totalAmount : amountCC,
      products_count: items.length,
    },
  })

  return NextResponse.json({
    success: true,
    transaction: {
      transaction_number:    transaction.transaction_number,
      dispensation_number:   createdDispensations.map(d => d.dispensation_number).join(', '),
      total_amount:          totalAmount,
      dispensation_amount:   dispensationAmount,
      products_amount:       productsAmount,
      payment_status:        paymentStatus,
      payment_method:        isFree || isCCPure ? null : payment.method,
      amount_paid:           isFree || isCCPure ? 0 : (isMixto3 ? amountCash + amountTransfer : totalAmount),
      amount_cash:           amountCash,
      amount_transfer:       amountTransfer,
      amount_charged_to_cc:  isCCPure ? totalAmount : amountCC,
      change_given:          changeGiven,
      transfer_detail:       transferDetail,
      cc_balance:            ccBalanceAfter,
    },
  }, { status: 201 })
}
