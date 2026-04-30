import type { Condicion, PaymentConcept, PaymentMethod } from '@/types/database'

const CUOTA_BASE = 'Servicios de Asociaciones N.C.P. - Pago Cuota Social'
const APORTE_LABEL = 'Servicios de Asociaciones N.C.P. - Aporte para atender gastos sociales'
const CONTRIBUCION_LABEL = 'Servicios de Asociaciones N.C.P. - Contribución para atender gastos sociales'

function getTransferLabel(condicion: Condicion | string): string {
  return condicion === 'delegacion_sistema_vigente' ? APORTE_LABEL : CONTRIBUCION_LABEL
}

function buildCuotaLabel(concepts: PaymentConcept[]): string {
  const hasAfiliacion = concepts.includes('afiliacion')
  const hasMensual = concepts.includes('cuota_mensual')
  const hasAnual = concepts.includes('cuota_anual')

  if (hasAfiliacion && hasMensual) return 'Afiliación y Mensualidad'
  if (hasAfiliacion && hasAnual) return 'Afiliación y Anualidad'
  if (hasAfiliacion) return 'Afiliación'
  if (hasMensual) return 'Mensualidad'
  if (hasAnual) return 'Anualidad'
  return ''
}

export function generateBillingDescription(params: {
  condicion: Condicion | string
  concepts: PaymentConcept[]
  paymentMethod: PaymentMethod
}): string | null {
  const { condicion, concepts, paymentMethod } = params
  const cuotaConcepts: PaymentConcept[] = ['afiliacion', 'cuota_mensual', 'cuota_anual']
  const hasCuota = concepts.some(c => cuotaConcepts.includes(c))
  const hasProduct = concepts.includes('venta')

  if (paymentMethod === 'efectivo') {
    if (!hasCuota) return null
    return `${CUOTA_BASE} - ${buildCuotaLabel(concepts)}`
  }

  // Transferencia o mixto
  if (hasCuota && hasProduct) {
    const productPart = condicion === 'delegacion_sistema_vigente'
      ? 'Aporte para atender gastos sociales'
      : 'Contribución para atender gastos sociales'
    return `${CUOTA_BASE} - ${buildCuotaLabel(concepts)} - ${productPart}`
  }

  if (hasCuota) {
    return `${CUOTA_BASE} - ${buildCuotaLabel(concepts)}`
  }

  return getTransferLabel(condicion)
}

export function generateBillingPeriod(
  concepts: PaymentConcept[],
  paymentDate: Date
): { from: Date; to: Date } {
  if (concepts.includes('cuota_anual')) {
    const year = paymentDate.getFullYear()
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) }
  }
  return { from: paymentDate, to: paymentDate }
}

export function isBillable(
  concepts: PaymentConcept[],
  paymentMethod: PaymentMethod
): boolean {
  if (paymentMethod === 'efectivo') {
    return concepts.some(c => ['afiliacion', 'cuota_mensual', 'cuota_anual'].includes(c))
  }
  return true
}
