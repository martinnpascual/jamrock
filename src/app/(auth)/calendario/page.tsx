'use client'

import { useState } from 'react'
import { useEventsForMonth, type EventRow } from '@/hooks/useEvents'
import { EVENT_STATUSES } from '@/lib/validations/event'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function statusColor(s: string) {
  const found = EVENT_STATUSES.find(x => x.value === s)
  if (!found) return 'bg-slate-400'
  const map: Record<string, string> = {
    planificado: 'bg-blue-500',
    activo:      'bg-green-500',
    cerrado:     'bg-slate-400',
    cancelado:   'bg-red-400',
  }
  return map[s] ?? 'bg-slate-400'
}

export default function CalendarioPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<EventRow | null>(null)

  const { data: events = [], isLoading } = useEventsForMonth(year, month)

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to 6 rows
  while (cells.length % 7 !== 0) cells.push(null)

  function eventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.event_date)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Calendario</h2>
        <p className="text-sm text-slate-500 mt-0.5">Vista mensual de eventos del club</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Calendario */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header mes */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-semibold text-slate-800">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Cargando eventos...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const dayEvents = day ? eventsForDay(day) : []
                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[72px] p-1.5 border-b border-r border-slate-100 last:border-r-0',
                      !day && 'bg-slate-50/50',
                      day && dayEvents.length > 0 && 'cursor-pointer hover:bg-blue-50/30 transition-colors',
                    )}
                    onClick={() => dayEvents.length > 0 && setSelected(dayEvents[0])}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mx-auto',
                          isToday(day) ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                        )}>
                          {day}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map(ev => (
                            <div
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); setSelected(ev) }}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs font-medium text-white truncate cursor-pointer hover:opacity-80 transition-opacity',
                                statusColor(ev.status),
                              )}
                              title={ev.name}
                            >
                              {ev.name}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 2} más</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Leyenda */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Estados</p>
            <div className="space-y-2">
              {EVENT_STATUSES.map(s => (
                <div key={s.value} className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusColor(s.value))} />
                  <span className="text-xs text-slate-600">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle evento seleccionado */}
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-slate-800">{selected.name}</h4>
                <button onClick={() => setSelected(null)} className="text-slate-300 hover:text-slate-500 text-lg leading-none">&times;</button>
              </div>
              <div className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', EVENT_STATUSES.find(s => s.value === selected.status)?.color ?? '')}>
                {EVENT_STATUSES.find(s => s.value === selected.status)?.label}
              </div>
              {selected.description && <p className="text-xs text-slate-500 italic">{selected.description}</p>}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(selected.event_date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}
                  {new Date(selected.event_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {selected.location && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />{selected.location}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Costos</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(selected.total_cost ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Ingresos</p>
                  <p className="text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(selected.total_income ?? 0)}
                  </p>
                </div>
              </div>
              <a href="/eventos" className="block text-center text-xs text-green-600 hover:underline pt-1">
                Ver en módulo Eventos &rarr;
              </a>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-400 text-center py-4">
                Hacé click en un evento del calendario para ver el detalle
              </p>
            </div>
          )}

          {/* Eventos del mes */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              {MONTHS[month]} — {events.length} evento(s)
            </p>
            {events.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Sin eventos este mes</p>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors',
                      selected?.id === ev.id && 'bg-slate-100',
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColor(ev.status))} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{ev.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(ev.event_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(ev.event_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
