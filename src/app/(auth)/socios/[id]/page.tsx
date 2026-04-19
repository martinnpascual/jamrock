import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MemberQR } from '@/components/shared/MemberQR'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Pencil,
  ArrowLeft,
  QrCode,
  Printer,
  Syringe,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingCart,
} from 'lucide-react'
import { MEMBER_TYPE_LABELS, REPROCANN_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Member, ReprocannStatus, Dispensation, Payment } from '@/types/database'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const [memberRes, dispensasRes, pagosRes, transaccionesRes] = await Promise.all([
    supabase
      .from('members')
      .select('*')
      .eq('id', params.id)
      .eq('is_deleted', false)
      .single(),
    supabase
      .from('dispensations')
      .select('*')
      .eq('member_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('payments')
      .select('*')
      .eq('member_id', params.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('checkout_transactions')
      .select('transaction_number, total_amount, payment_status, created_at')
      .eq('member_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (memberRes.error || !memberRes.data) notFound()

  const member = memberRes.data as Member
  const dispensas = (dispensasRes.data ?? []) as Dispensation[]
  const pagos = (pagosRes.data ?? []) as Payment[]
  const transacciones = transaccionesRes.data ?? []
  const fullName = `${member.first_name} ${member.last_name}`

  const isReprocannExpired =
    member.reprocann_expiry && new Date(member.reprocann_expiry) < new Date()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + acciones */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/socios">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 h-8">
              <ArrowLeft className="w-3.5 h-3.5" />
              Socios
            </Button>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-600 font-medium">{fullName}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/socios/${member.id}/carnet`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Printer className="w-3.5 h-3.5" />
              Carnet
            </Button>
          </Link>
          <Link href={`/socios/${member.id}/editar`}>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: info principal + QR */}
        <div className="space-y-4">
          {/* Card principal */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-6 pb-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-green-700">
                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-slate-800">{fullName}</h2>
              <p className="font-mono text-sm text-slate-500 mt-0.5">{member.member_number}</p>
              <div className="mt-3">
                <StatusBadge status={member.reprocann_status as ReprocannStatus} />
              </div>
              <Badge variant="outline" className="mt-2 text-xs">
                {MEMBER_TYPE_LABELS[member.member_type] || member.member_type}
              </Badge>
            </CardContent>
          </Card>

          {/* QR Card */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Código QR
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 pb-5">
              {member.qr_code ? (
                <>
                  <MemberQR value={member.qr_code} size={150} className="rounded-lg border border-slate-100 p-2" />
                  <p className="text-xs text-slate-400 font-mono">{member.qr_code}</p>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-4">QR no generado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: datos + historial */}
        <div className="lg:col-span-2 space-y-4">
          {/* Datos personales */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="DNI" value={member.dni} />
              <InfoRow
                label="Fecha de nacimiento"
                value={member.birth_date
                  ? new Date(member.birth_date).toLocaleDateString('es-AR')
                  : null}
              />
              <InfoRow
                label="Teléfono"
                value={member.phone}
                icon={<Phone className="w-3.5 h-3.5 text-slate-400" />}
              />
              <InfoRow
                label="Email"
                value={member.email}
                icon={<Mail className="w-3.5 h-3.5 text-slate-400" />}
              />
              <div className="sm:col-span-2">
                <InfoRow
                  label="Dirección"
                  value={member.address}
                  icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
                />
              </div>
            </CardContent>
          </Card>

          {/* REPROCANN */}
          <Card className={`shadow-sm border ${isReprocannExpired ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span>Estado REPROCANN</span>
                <StatusBadge status={member.reprocann_status as ReprocannStatus} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Estado" value={REPROCANN_STATUS_LABELS[member.reprocann_status]} />
              <InfoRow label="N° REPROCANN" value={member.reprocann_number} />
              <InfoRow
                label="Vencimiento"
                value={member.reprocann_expiry
                  ? new Date(member.reprocann_expiry).toLocaleDateString('es-AR')
                  : null}
              />
              {isReprocannExpired && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ REPROCANN vencido — el socio no puede recibir dispensas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {member.notes && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-line">{member.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Historial dispensas */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Dispensas recientes
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {dispensas.length} registros
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dispensas.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin dispensas registradas</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dispensas.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-slate-700">
                          {d.quantity_grams}g — {d.genetics}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(d.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-slate-400">{d.dispensation_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial pagos */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pagos recientes
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {pagos.length} registros
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pagos.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin pagos registrados</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pagos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-slate-700">${p.amount.toLocaleString('es-AR')}</p>
                        <p className="text-xs text-slate-400">
                          {p.concept} · {p.payment_method ? PAYMENT_METHOD_LABELS[p.payment_method] : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transacciones checkout */}
          {transacciones.length > 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Transacciones recientes
                  <span className="ml-auto text-xs font-normal text-slate-400">
                    {transacciones.length} registros
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {transacciones.map((t: any) => (
                    <div key={t.transaction_number} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-slate-700 font-mono">{t.transaction_number}</p>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          t.payment_status === 'pagado'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {t.payment_status === 'pagado' ? 'Pagado' : 'Fiado'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">{ARS(t.total_amount)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(t.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Alta: {new Date(member.created_at).toLocaleDateString('es-AR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 flex items-center gap-1.5">
        {icon}
        {value || <span className="text-slate-300 italic">—</span>}
      </p>
    </div>
  )
}
