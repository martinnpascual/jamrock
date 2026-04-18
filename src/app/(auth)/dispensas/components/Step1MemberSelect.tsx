'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search, QrCode, Loader2, AlertTriangle, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Member, ReprocannStatus } from '@/types/database'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Step1Props {
  onMemberSelected: (member: Member, ccBalance: number) => void
}

export function Step1MemberSelect({ onMemberSelected }: Step1Props) {
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [results, setResults]       = useState<Member[]>([])
  const [selected, setSelected]     = useState<Member | null>(null)
  const [ccBalance, setCCBalance]   = useState(0)
  const [searched, setSearched]     = useState(false)

  const supabase = createClient()

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    setSelected(null)
    setSearched(true)

    const q = query.trim()
    const { data, error: err } = await supabase
      .rpc('search_members', { query: q })

    if (err) {
      setError('Error al buscar socios')
    } else {
      setResults((data ?? []) as Member[])
    }
    setLoading(false)
  }

  async function selectMember(member: Member) {
    setSelected(member)
    setResults([])
    // Buscar saldo CC
    const { data: cc } = await supabase
      .from('current_accounts')
      .select('balance')
      .eq('member_id', member.id)
      .eq('is_deleted', false)
      .single()
    const balance = cc?.balance ?? 0
    setCCBalance(balance)
  }

  function confirmSelection() {
    if (!selected) return
    onMemberSelected(selected, ccBalance)
  }

  const isBlocked = selected && selected.reprocann_status !== 'activo'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Identificar socio</h2>
        <p className="text-sm text-slate-500 mt-0.5">Buscá por nombre, DNI, N° de socio o escaneá el QR</p>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            autoFocus
            placeholder="Nombre, DNI, SOC-0001 o QR..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            className="pl-9 h-11"
          />
        </div>
        <Button
          onClick={search}
          disabled={loading || !query.trim()}
          className="bg-[#2DC814] hover:bg-[#25a811] text-black font-bold h-11 px-5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          className="h-11 px-3 text-slate-400 cursor-not-allowed opacity-50"
          title="Escáner QR — próximamente"
          disabled
          type="button"
        >
          <QrCode className="w-4 h-4" />
        </Button>
      </div>

      {/* Resultados de búsqueda */}
      {results.length > 0 && (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {results.map(m => (
            <button
              key={m.id}
              onClick={() => selectMember(m)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-[#2DC814]/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#2DC814]">
                  {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-slate-400">DNI {m.dni} · {m.member_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={m.reprocann_status as ReprocannStatus} />
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && !selected && (
        <div className="flex flex-col items-center py-8 text-center">
          <User className="w-10 h-10 text-slate-600 mb-2" />
          <p className="text-sm text-slate-400">Sin resultados para &quot;{query}&quot;</p>
          <p className="text-xs text-slate-500 mt-1">Probá con otro nombre, DNI o número de socio</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Socio seleccionado */}
      {selected && (
        <div className={cn(
          'rounded-xl border p-4 space-y-3',
          isBlocked
            ? 'bg-red-950/20 border-red-900/50'
            : 'bg-[#2DC814]/5 border-[#2DC814]/20'
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#2DC814]/10 rounded-full flex items-center justify-center text-base font-bold text-[#2DC814] flex-shrink-0">
                {selected.first_name.charAt(0)}{selected.last_name.charAt(0)}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">{selected.first_name} {selected.last_name}</p>
                <p className="text-xs text-slate-400">DNI {selected.dni} · {selected.member_number}</p>
              </div>
            </div>
            <StatusBadge status={selected.reprocann_status as ReprocannStatus} />
          </div>

          {ccBalance !== 0 && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400">Saldo cuenta corriente</span>
              <span className={cn('font-semibold', ccBalance >= 0 ? 'text-[#2DC814]' : 'text-red-400')}>
                {ARS(ccBalance)}
              </span>
            </div>
          )}

          {isBlocked ? (
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Dispensa bloqueada</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  REPROCANN {selected.reprocann_status} — El socio no puede dispensarse hasta regularizar su estado.
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={confirmSelection}
              className="w-full bg-[#2DC814] hover:bg-[#25a811] text-black font-bold h-11 text-base"
            >
              Continuar con {selected.first_name}
            </Button>
          )}

          <button
            onClick={() => { setSelected(null); setResults([]); setSearched(false); setQuery('') }}
            className="w-full text-xs text-slate-500 hover:text-slate-300 underline text-center"
          >
            Buscar otro socio
          </button>
        </div>
      )}
    </div>
  )
}
