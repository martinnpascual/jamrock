'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxMember {
  id: string
  first_name: string
  last_name: string
  member_number: string
  dni: string
}

interface MemberComboboxProps {
  members: ComboboxMember[]
  value: string | null          // member_id o null
  onChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MemberCombobox({
  members,
  value,
  onChange,
  placeholder = 'Sin socio asociado',
  disabled = false,
  className,
}: MemberComboboxProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  const selected = value ? members.find(m => m.id === value) ?? null : null

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Filtrar socios (máx 20 resultados)
  const filtered = useMemo(() => {
    if (!query.trim()) return members.slice(0, 20)
    const q = query.toLowerCase()
    return members
      .filter(m =>
        m.first_name.toLowerCase().includes(q) ||
        m.last_name.toLowerCase().includes(q) ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.dni.includes(q) ||
        m.member_number.toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [members, query])

  function handleOpen() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(m: ComboboxMember | null) {
    onChange(m ? m.id : null)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md border text-sm transition-colors',
          'bg-[#0e0e0e] border-white/[0.12] text-slate-200',
          'hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50',
          disabled && 'opacity-50 cursor-not-allowed',
          open && 'border-[#2DC814]/50 ring-1 ring-[#2DC814]/30'
        )}
      >
        <span className={cn('flex items-center gap-2 truncate flex-1 min-w-0 text-left', !selected && 'text-slate-500')}>
          {selected ? (
            <>
              <User className="w-3.5 h-3.5 text-[#2DC814] flex-shrink-0" />
              <span className="truncate">{selected.first_name} {selected.last_name}</span>
              <span className="text-slate-500 text-xs flex-shrink-0">· {selected.member_number}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span
              onClick={handleClear}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[200] mt-1 w-full min-w-[260px] bg-[#1a1a1a] border border-white/[0.12] rounded-lg shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-white/[0.08]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI o número..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#0e0e0e] border border-white/[0.12] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2DC814]/40"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-52 overflow-y-auto">
            {/* Opción sin socio */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                'hover:bg-white/[0.06]',
                !value ? 'bg-white/[0.04] text-[#2DC814]' : 'text-slate-400'
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <X className="w-3 h-3" />
              </span>
              Sin socio asociado
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-500 text-center">No se encontraron socios</p>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                    'hover:bg-white/[0.06]',
                    value === m.id ? 'bg-[#2DC814]/10 text-[#2DC814]' : 'text-slate-200'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[#2DC814]/10 flex items-center justify-center text-[10px] font-bold text-[#2DC814] flex-shrink-0">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-slate-500">{m.member_number} · DNI {m.dni}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
