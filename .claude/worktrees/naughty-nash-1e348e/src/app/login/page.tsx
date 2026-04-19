'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const authError = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Registrar inicio de sesión de trabajo (fire-and-forget)
    fetch('/api/work-sessions', { method: 'POST' }).catch(() => {})

    // Full page reload para que el middleware lea los cookies de sesión correctamente
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2DC814] to-[#1a8a0c] rounded-xl flex items-center justify-center shadow-lg shadow-[#2DC814]/20">
            <Leaf className="w-7 h-7 text-white drop-shadow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Jamrock Club</h1>
            <p className="text-sm text-slate-500">Sistema de gestión</p>
          </div>
        </div>

        <Card className="shadow-xl border-white/[0.06] bg-[#151515]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">Iniciar sesión</CardTitle>
            <CardDescription className="text-slate-500">Ingresá tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            {(error || authError === 'unauthorized') && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/50 border border-red-900/50 rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error || 'Tu cuenta no tiene acceso o está inactiva.'}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold"
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          ¿Problemas para acceder? Contactá al gerente del club.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
