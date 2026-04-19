'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserRole, Profile } from '@/types/database'

export function useRole() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      setUser(authUser)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const role = profile?.role as UserRole | undefined
  const displayName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    '...'

  return {
    profile,
    user,
    role,
    loading,
    displayName,
    isGerente: role === 'gerente',
    isSecretaria: role === 'secretaria',
    isCultivador: role === 'cultivador',
    can: (allowedRoles: UserRole[]) => role ? allowedRoles.includes(role) : false,
  }
}
