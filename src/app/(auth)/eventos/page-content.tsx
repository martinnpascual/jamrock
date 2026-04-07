'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSchema, EVENT_STATUSES, type EventFormData } from '@/lib/validations/event'
import {
  useEvents, useCreateEvent, useDeleteEvent, useUpdateEventStatus,
  useEventAttendees, useAddAttendee, useMarkAttendance, useRemoveAttendee,
  type EventRow,
} from '@/hooks/useEvents'
import { useMembers } from '@/hooks/useMembers'
import { useRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CalendarDays, Plus, Loader2, Trash2, ChevronDown, ChevronUp, UserPlus, Users, CheckCircle2, XCircle, TrendingUp, TrendingDown, MapPin, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function statusInfo(s: string) {
  return EVENT_STATUSES.find(x => x.value === s) ?? EVENT_STATUSES[0]
}

export default function EventosPage() {
  const { data: events = [], isLoading } = useEvents()
  const createEvent = useCreateEvent()
  const { role } = useRole()
  const isGerente = role === 'gerente'
  const [openNew, setOpenNew] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const filtered = filterStatus === 'all' ? events : events.filter(e => e.status === filterStatus)
  const upcoming = events.filter(e => e.status === 'planificado' || e.status === 'activo').length
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: 'planificado', total_cost: 0, total_income: 0 },
  })
  async function onSubmit(data: EventFormData) {
    try { await createEvent.mutateAsync(data); reset(); setOpenNew(false) } catch { /**/ }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Eventos</h2>
          <p className="text-sm text-slate-500 mt-0.5">{events.length} evento(s) &middot; {upcoming} próximo(s)</p>
        </div>
        {isGerente && (
          <Button onClick={() => setOpenNew(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />Nuevo evento
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors', filterStatus === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400')}>
          Todos ({events.length})
        </button>
        {EVENT_STATUSES.map(s => {
          const count = events.filter(e => e.status === s.value).length
          return (
            <button key={s.value} onClick={() => setFilterStatus(s.value)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors', filterStatus === s.value ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400')}>
              {s.label} ({count})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <CalendarDays className="w-10 h-10 mb-3" />
          <p className="text-sm">No hay eventos</p>
          {isGerente && <button onClick={() => setOpenNew(true)} className="mt-2 text-xs text-green-600 hover:underline">Crear primer evento</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => (
            <EventCard key={ev.id} event={ev} isExpanded={expandedId === ev.id} onToggle={() => setExpandedId(expandedId === ev.id ? null : ev.id)} isGerente={isGerente} />
          ))}
        </div>
      )}

      <Dialog open={openNew} onOpenChange={o => { if (!o) { reset(); setOpenNew(false) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuevo evento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Reunión mensual socios" {...register('name')} className={errors.name ? 'border-red-400' : ''} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea placeholder="Descripción del evento..." rows={2} {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha y hora *</Label>
                <Input type="datetime-local" {...register('event_date')} className={errors.event_date ? 'border-red-400' : ''} />
                {errors.event_date && <p className="text-xs text-red-500">{errors.event_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ubicación</Label>
                <Input placeholder="Sede del club..." {...register('location')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select defaultValue="planificado" onValueChange={v => v !== null && setValue('status', v as EventFormData['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Costo ($)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0" {...register('total_cost')} />
              </div>
              <div className="space-y-1.5">
                <Label>Ingresos ($)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0" {...register('total_income')} />
              </div>
            </div>
            {createEvent.error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{(createEvent.error as Error).message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setOpenNew(false) }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createEvent.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting || createEvent.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : 'Crear evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventCard({ event: ev, isExpanded, onToggle, isGerente }: { event: EventRow; isExpanded: boolean; onToggle: () => void; isGerente: boolean }) {
  const deleteEvent = useDeleteEvent()
  const updateStatus = useUpdateEventStatus()
  const si = statusInfo(ev.status)
  const balance = (ev.total_income ?? 0) - (ev.total_cost ?? 0)

  return (
    <div className={cn('bg-white border rounded-xl shadow-sm overflow-hidden', isExpanded ? 'shadow-md border-slate-300' : 'border-slate-200')}>
      <div className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <div className="flex-shrink-0 text-center w-12">
          <p className="text-xs text-slate-400 uppercase leading-none">{new Date(ev.event_date).toLocaleString('es-AR', { month: 'short' })}</p>
          <p className="text-2xl font-bold text-slate-700 leading-tight">{new Date(ev.event_date).getDate()}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{ev.name}</p>
            <Badge variant="outline" className={cn('text-xs shrink-0', si.color)}>{si.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {ev.location && <span className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
            <span className="text-xs text-slate-400">{new Date(ev.event_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-xs text-slate-400 flex items-center gap-0.5"><Users className="w-3 h-3" />{(ev.event_attendees?.[0] as { count: number } | undefined)?.count ?? 0}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className={cn('text-sm font-semibold', balance >= 0 ? 'text-green-600' : 'text-red-500')}>{balance >= 0 ? '+' : ''}{ARS(balance)}</p>
          <p className="text-xs text-slate-400">balance</p>
        </div>
        <div className="ml-1 flex-shrink-0 text-slate-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/40">
          {ev.description && <p className="text-sm text-slate-600 italic">{ev.description}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-red-400" />Costos</p>
              <p className="text-base font-bold text-slate-700 mt-0.5">{ARS(ev.total_cost ?? 0)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-green-400" />Ingresos</p>
              <p className="text-base font-bold text-slate-700 mt-0.5">{ARS(ev.total_income ?? 0)}</p>
            </div>
            <div className={cn('rounded-lg p-3 border', balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
              <p className="text-xs text-slate-500">Balance</p>
              <p className={cn('text-base font-bold mt-0.5', balance >= 0 ? 'text-green-700' : 'text-red-600')}>{balance >= 0 ? '+' : ''}{ARS(balance)}</p>
            </div>
          </div>
          <AttendeesPanel eventId={ev.id} isGerente={isGerente} eventStatus={ev.status} />
          {isGerente && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Estado:</span>
                <Select value={ev.status} onValueChange={v => v !== null && updateStatus.mutate({ id: ev.id, status: v })}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                </Select>
                {updateStatus.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              <button onClick={() => { if (confirm('Eliminar este evento?')) deleteEvent.mutate(ev.id) }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AttendeesPanel({ eventId, isGerente, eventStatus }: { eventId: string; isGerente: boolean; eventStatus: string }) {
  const { data: attendees = [], isLoading } = useEventAttendees(eventId)
  const { data: members = [] } = useMembers()
  const addAttendee = useAddAttendee()
  const markAttendance = useMarkAttendance()
  const removeAttendee = useRemoveAttendee()
  const [selectedMember, setSelectedMember] = useState('')
  const [addError, setAddError] = useState('')
  const attendeeIds = new Set(attendees.map(a => a.members?.id))
  const availableMembers = members.filter(m => !attendeeIds.has(m.id))
  const canEdit = isGerente && eventStatus !== 'cerrado' && eventStatus !== 'cancelado'

  async function handleAdd() {
    if (!selectedMember) return
    setAddError('')
    try { await addAttendee.mutateAsync({ eventId, memberId: selectedMember }); setSelectedMember('') }
    catch (e) { setAddError((e as Error).message) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Asistentes ({attendees.length})</p>
      {canEdit && (
        <div className="flex gap-2">
          <Select value={selectedMember} onValueChange={v => v !== null && setSelectedMember(v)}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Agregar socio..." /></SelectTrigger>
            <SelectContent>
              {availableMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.first_name} {m.last_name} · {m.member_number}</SelectItem>)}
              {availableMembers.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Todos los socios ya están agregados</div>}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!selectedMember || addAttendee.isPending} className="h-8 bg-green-600 hover:bg-green-700 text-white px-3">
            {addAttendee.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}
      {addError && <p className="text-xs text-red-500">{addError}</p>}
      {isLoading ? (
        <div className="space-y-1">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : attendees.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">Sin asistentes registrados</p>
      ) : (
        <div className="space-y-1.5">
          {attendees.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
              <div className="flex items-center gap-2">
                <button onClick={() => canEdit && markAttendance.mutate({ eventId, attendeeId: a.id, attended: !a.attended })} disabled={!canEdit}
                  className={cn('flex-shrink-0', canEdit ? 'cursor-pointer' : 'cursor-default')}>
                  {a.attended ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                </button>
                <span className="text-xs font-medium text-slate-700">{a.members ? `${a.members.first_name} ${a.members.last_name}` : '—'}</span>
                <span className="text-xs text-slate-400 font-mono">{a.members?.member_number}</span>
              </div>
              {canEdit && <button onClick={() => { if (confirm('¿Quitar este asistente del evento?')) removeAttendee.mutate({ eventId, attendeeId: a.id }) }} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
          <p className="text-xs text-slate-400">{attendees.filter(a => a.attended).length} de {attendees.length} asistieron</p>
        </div>
      )}
    </div>
  )
}
