'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import type { Member, ReprocannStatus } from '@/types/database'
import { REPROCANN_STATUS_LABELS } from '@/lib/constants'

const STATUS_COLORS: Record<ReprocannStatus, string> = {
  activo: '#16a34a',
  en_tramite: '#ca8a04',
  vencido: '#dc2626',
  cancelado: '#6b7280',
}

interface MemberCarnetProps {
  member: Member
}

export function MemberCarnet({ member }: MemberCarnetProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const fullName = `${member.first_name} ${member.last_name}`
  const statusColor = STATUS_COLORS[member.reprocann_status as ReprocannStatus] ?? '#6b7280'

  useEffect(() => {
    if (!qrCanvasRef.current || !member.qr_code) return
    QRCode.toCanvas(qrCanvasRef.current, member.qr_code, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  }, [member.qr_code])

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 print:bg-white print:p-0">
      {/* Botón imprimir — oculto al imprimir */}
      <button
        onClick={handlePrint}
        className="mb-6 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 print:hidden"
      >
        Imprimir carnet
      </button>

      {/* Carnet — tamaño CR80 (85.6 x 54 mm) */}
      <div
        className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none"
        style={{ width: 340, minHeight: 215 }}
      >
        {/* Header verde */}
        <div className="bg-[#16a34a] px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">🌿</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Jamrock Club</p>
            <p className="text-green-100 text-xs">Asociación Civil</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white font-mono text-xs font-bold">{member.member_number}</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 flex gap-4 items-start">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-bold text-base leading-tight truncate">{fullName}</p>
            <p className="text-slate-500 text-xs mt-0.5">DNI {member.dni}</p>

            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: statusColor }}
                >
                  REPROCANN: {REPROCANN_STATUS_LABELS[member.reprocann_status] || member.reprocann_status}
                </span>
              </div>
              {member.reprocann_expiry && (
                <p className="text-xs text-slate-400">
                  Vence: {new Date(member.reprocann_expiry).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Alta: {new Date(member.created_at).toLocaleDateString('es-AR')}
              </p>
            </div>
          </div>

          {/* QR */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            {member.qr_code ? (
              <>
                <canvas ref={qrCanvasRef} style={{ width: 80, height: 80 }} />
                <p className="text-xs text-slate-300 font-mono">{member.qr_code}</p>
              </>
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center">
                <p className="text-xs text-slate-400">Sin QR</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 print:hidden">
        Este carnet es de uso exclusivo del club. No transferible.
      </p>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  )
}
