import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MemberCarnet } from '@/components/shared/MemberCarnet'
import type { Member } from '@/types/database'

export default async function CarnetPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: memberRaw, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (error || !memberRaw) notFound()

  return <MemberCarnet member={memberRaw as Member} />
}
