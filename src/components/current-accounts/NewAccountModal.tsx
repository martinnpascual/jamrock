'use client'

import { useState } from 'react'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useMembers } from '@/hooks/useMembers'
import { useSuppliers } from '@/hooks/useSuppliers'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowDownUp } from 'lucide-react'

interface NewAccountModalProps {
  open: boolean
  onClose: () => void
}

export function NewAccountModal({ open, onClose }: NewAccountModalProps) {
  const createMutation = useCreateAccount()
  const { data: members = [] } = useMembers()
  const { data: suppliers = [] } = useSuppliers()

  const [entityType, setEntityType] = useState<'socio' | 'proveedor' | ''>('')
  const [memberId, setMemberId] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('')

  function handleClose() {
    setEntityType('')
    setMemberId('')
    setSupplierId('')
    createMutation.reset()
    onClose()
  }

  async function handleSubmit() {
    if (!entityType) return
    if (entityType === 'socio' && !memberId) return
    if (entityType === 'proveedor' && !supplierId) return

    try {
      await createMutation.mutateAsync({
        entity_type: entityType,
        member_id: entityType === 'socio' ? memberId : null,
        supplier_id: entityType === 'proveedor' ? supplierId : null,
      })
      handleClose()
    } catch {
      // error shown below
    }
  }

  const isValid =
    (entityType === 'socio' && !!memberId) ||
    (entityType === 'proveedor' && !!supplierId)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-indigo-600" />
            Nueva cuenta corriente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tipo de entidad */}
          <div className="space-y-1.5">
            <Label>Tipo de titular *</Label>
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v as 'socio' | 'proveedor')
                setMemberId('')
                setSupplierId('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="socio">Socio</SelectItem>
                <SelectItem value="proveedor">Proveedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de socio */}
          {entityType === 'socio' && (
            <div className="space-y-1.5">
              <Label>Socio *</Label>
              <Select value={memberId} onValueChange={(v) => setMemberId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar socio..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                      <span className="text-slate-400 ml-2 font-mono text-xs">{m.member_number}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selector de proveedor */}
          {entityType === 'proveedor' && (
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Las cuentas corrientes también se crean automáticamente al registrar pagos, compras o ventas.
          </p>

          {createMutation.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">
              {(createMutation.error as Error).message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</>
            ) : (
              'Crear cuenta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
