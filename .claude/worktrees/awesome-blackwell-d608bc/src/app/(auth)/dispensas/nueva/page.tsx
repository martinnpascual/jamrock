import { CheckoutWizard } from '../components/CheckoutWizard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock } from 'lucide-react'

export default function NuevaDispensaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dispensas">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 h-8">
              <ArrowLeft className="w-3.5 h-3.5" />
              Historial
            </Button>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-700">Nueva dispensa</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5" />
          El registro es permanente e inmutable
        </div>
      </div>

      <CheckoutWizard />
    </div>
  )
}
