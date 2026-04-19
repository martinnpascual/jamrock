'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterOption = { value: string; label: string }

export type FilterDef =
  | {
      type: 'select'
      key: string
      label: string
      options: FilterOption[]
      placeholder?: string
    }
  | {
      type: 'daterange'
      fromKey: string
      toKey: string
      label: string
    }

type FilterBarProps = {
  filters: FilterDef[]
  values: Record<string, string>
  onSet: (key: string, value: string) => void
  onClear: (keys?: string[]) => void
  className?: string
}

export function FilterBar({ filters, values, onSet, onClear, className }: FilterBarProps) {
  const [open, setOpen] = useState(false)

  // Collect all active filters as chips
  const activeChips: { key: string; label: string; displayValue: string }[] = []
  for (const f of filters) {
    if (f.type === 'select') {
      const v = values[f.key]
      if (v) {
        const opt = f.options.find((o) => o.value === v)
        activeChips.push({ key: f.key, label: f.label, displayValue: opt?.label ?? v })
      }
    } else if (f.type === 'daterange') {
      const from = values[f.fromKey]
      const to = values[f.toKey]
      if (from || to) {
        const display = [from, to].filter(Boolean).join(' → ')
        activeChips.push({ key: f.fromKey, label: f.label, displayValue: display })
      }
    }
  }

  const activeCount = activeChips.length

  return (
    <div className={cn('space-y-2', className)}>
      {/* Toggle button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            open || activeCount > 0
              ? 'bg-[#2DC814]/10 border-[#2DC814]/30 text-[#2DC814]'
              : 'bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="bg-[#2DC814]/20 text-[#2DC814] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onClear()}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Filter controls — shown when open */}
      {open && (
        <div className="flex flex-wrap gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          {filters.map((f) => {
            if (f.type === 'select') {
              return (
                <div key={f.key} className="flex flex-col gap-1 min-w-[160px]">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {f.label}
                  </label>
                  <select
                    value={values[f.key] ?? ''}
                    onChange={(e) => onSet(f.key, e.target.value)}
                    className="text-sm bg-[#111] border border-white/[0.1] text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/40 appearance-none cursor-pointer"
                  >
                    <option value="">{f.placeholder ?? `Todos`}</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            if (f.type === 'daterange') {
              return (
                <div key={f.fromKey} className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={values[f.fromKey] ?? ''}
                      onChange={(e) => onSet(f.fromKey, e.target.value)}
                      className="text-sm bg-[#111] border border-white/[0.1] text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/40"
                    />
                    <span className="text-xs text-slate-500">→</span>
                    <input
                      type="date"
                      value={values[f.toKey] ?? ''}
                      onChange={(e) => onSet(f.toKey, e.target.value)}
                      className="text-sm bg-[#111] border border-white/[0.1] text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/40"
                    />
                    {(values[f.fromKey] || values[f.toKey]) && (
                      <button
                        type="button"
                        onClick={() => {
                          onSet(f.fromKey, '')
                          onSet(f.toKey, '')
                        }}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {/* Active filter chips — always visible when there are active filters */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              className="text-xs gap-1.5 border-[#2DC814]/30 bg-[#2DC814]/5 text-[#2DC814] pr-1"
            >
              <span className="text-slate-500">{chip.label}:</span>
              {chip.displayValue}
              <button
                type="button"
                onClick={() => {
                  // For daterange chips, clear both keys
                  const f = filters.find(
                    (x) => (x.type === 'select' && x.key === chip.key) ||
                    (x.type === 'daterange' && x.fromKey === chip.key)
                  )
                  if (f?.type === 'daterange') {
                    onSet(f.fromKey, '')
                    onSet(f.toKey, '')
                  } else {
                    onSet(chip.key, '')
                  }
                }}
                className="ml-0.5 text-[#2DC814]/60 hover:text-[#2DC814] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
