import { AccountsTable } from '@/components/current-accounts/AccountsTable'
import { ArrowDownUp } from 'lucide-react'

export const metadata = { title: 'Cuentas Corrientes — Jamrock' }

export default function CuentasCorrientesPage() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-950/40 rounded-lg flex items-center justify-center">
          <ArrowDownUp className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cuentas Corrientes</h2>
          <p className="text-sm text-slate-500 mt-0.5">Saldos de socios y proveedores</p>
        </div>
      </div>

      <AccountsTable />
    </div>
  )
}
