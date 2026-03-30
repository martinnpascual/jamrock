import { MemberForm } from '@/components/forms/MemberForm'

export default function NuevoSocioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Nuevo socio</h2>
        <p className="text-sm text-slate-500 mt-0.5">Completá los datos para dar de alta un nuevo socio</p>
      </div>
      <MemberForm mode="create" />
    </div>
  )
}
