'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useFilters(keys: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const [values, setValues] = useState<Record<string, string>>({})

  // Initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial: Record<string, string> = {}
    keys.forEach((k) => {
      const v = params.get(k)
      if (v) initial[k] = v
    })
    if (Object.keys(initial).length > 0) setValues(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = useCallback(
    (key: string, value: string) => {
      setValues((prev) => {
        const next = { ...prev }
        if (value) next[key] = value
        else delete next[key]

        const params = new URLSearchParams(window.location.search)
        if (value) params.set(key, value)
        else params.delete(key)
        const str = params.toString()
        router.replace(str ? `${pathname}?${str}` : pathname, { scroll: false })
        return next
      })
    },
    [router, pathname]
  )

  const clear = useCallback(
    (clearKeys?: string[]) => {
      const toClear = clearKeys ?? keys
      setValues((prev) => {
        const next = { ...prev }
        toClear.forEach((k) => delete next[k])
        const params = new URLSearchParams(window.location.search)
        toClear.forEach((k) => params.delete(k))
        const str = params.toString()
        router.replace(str ? `${pathname}?${str}` : pathname, { scroll: false })
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname]
  )

  const hasActive = keys.some((k) => !!values[k])

  return { values, set, clear, hasActive }
}
