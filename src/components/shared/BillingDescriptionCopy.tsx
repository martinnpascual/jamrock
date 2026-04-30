'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillingDescriptionCopyProps {
  description: string | null
  billingFrom?: string | null
  billingTo?: string | null
  memberName?: string
  cuit?: string | null
  amount?: number
  currency?: 'ars' | 'usd'
  className?: string
}

export function BillingDescriptionCopy({
  description,
  billingFrom,
  billingTo,
  memberName,
  cuit,
  amount,
  currency = 'ars',
  className,
}: BillingDescriptionCopyProps) {
  const [copied, setCopied] = useState(false)

  if (!description) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatAmount = (n: number | undefined) => {
    if (n == null) return '—'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'usd' ? 'USD' : 'ARS',
      minimumFractionDigits: 2,
    }).format(n)
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Descripción para factura
          </p>
          <p className="text-sm text-slate-800 leading-relaxed break-words">{description}</p>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            copied
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {(memberName || cuit || billingFrom || amount != null) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-slate-200 text-xs">
          {memberName && (
            <DataRow label="Nombre" value={memberName} />
          )}
          {cuit && (
            <DataRow label="CUIT" value={cuit} />
          )}
          {billingFrom && (
            <DataRow label="Período desde" value={formatDate(billingFrom)} />
          )}
          {billingTo && (
            <DataRow label="Período hasta" value={formatDate(billingTo)} />
          )}
          {amount != null && (
            <DataRow label="Monto" value={formatAmount(amount)} />
          )}
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  )
}
