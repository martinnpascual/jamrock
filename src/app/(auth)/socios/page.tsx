import { MembersTable } from '@/components/tables/MembersTable'

export default function SociosPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Socios</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de socios, estados REPROCANN y carnets digitales
        </p>
      </div>
      <MembersTable />
    </div>
  )
}
