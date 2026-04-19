import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MemberForm } from '@/components/forms/MemberForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Member } from '@/types/database'

export default async function EditarSocioPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: memberRaw, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  const member = memberRaw as Member | null

  if (error || !member || !memberRaw) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/socios/${params.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 h-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a ficha
          </Button>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600 font-medium">
          Editar — {member.first_name} {member.last_name}
        </span>
      </div>
      <MemberForm member={member} mode="edit" />
    </div>
  )
}
