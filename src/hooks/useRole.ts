'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'
import type { Profile } from '@/types/database'

export function useRole() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const role = profile?.role as UserRole | undefined

  return {
    profile,
    role,
    loading,
    isGerente: role === 'gerente',
    isSecretaria: role === 'secretaria',
    isCultivador: role === 'cultivador',
    can: (allowedRoles: UserRole[]) => role ? allowedRoles.includes(role) : false,
  }
}
