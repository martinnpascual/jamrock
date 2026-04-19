'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, ZapOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRCameraScannerProps {
  onScan: (value: string) => void
  onClose: () => void
}

export function QRCameraScanner({ onScan, onClose }: QRCameraScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef   = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null)
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [scanned, setScanned] = useState(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* ignore */ }
      try { scannerRef.current.clear() } catch { /* ignore */ }
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startScanner() {
      try {
        // Dynamic import para evitar SSR crash
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled || !containerRef.current) return

        const containerId = 'qr-camera-container'
        const scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (scanned) return
            setScanned(true)
            onScan(decodedText.trim())
            stopScanner()
          },
          () => { /* errores de frame, ignorar */ }
        )

        if (!cancelled) setStatus('scanning')
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
          setErrorMsg(msg.includes('NotAllowedError')
            ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
            : 'No se pudo iniciar la cámara. Asegurate de estar en HTTPS y dar permiso.')
          setStatus('error')
        }
      }
    }

    startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl ring-1 ring-white/[0.08] w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#2DC814]" />
            <span className="text-sm font-semibold text-slate-100">Escanear carnet QR</span>
          </div>
          <button
            onClick={() => { stopScanner(); onClose() }}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área de cámara */}
        <div className="relative bg-black aspect-square">
          {/* Contenedor del escáner */}
          <div id="qr-camera-container" ref={containerRef} className="w-full h-full" />

          {/* Overlay de carga */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <div className="w-10 h-10 rounded-full border-2 border-[#2DC814]/30 border-t-[#2DC814] animate-spin" />
              <p className="text-xs text-slate-400">Iniciando cámara...</p>
            </div>
          )}

          {/* Overlay de error */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <ZapOff className="w-10 h-10 text-red-400" />
              <p className="text-sm text-slate-300">{errorMsg}</p>
            </div>
          )}

          {/* Marco de escaneo animado */}
          {status === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[220px] h-[220px]">
                {/* Esquinas del marco */}
                <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#2DC814] rounded-tl-sm" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#2DC814] rounded-tr-sm" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#2DC814] rounded-bl-sm" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#2DC814] rounded-br-sm" />
                {/* Línea de escaneo */}
                <div className="absolute left-2 right-2 h-px bg-[#2DC814]/60 animate-scan-line" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-center gap-2">
          {status === 'scanning' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#2DC814] animate-pulse" />
              <p className="text-xs text-slate-400">Apuntá al QR del carnet del socio</p>
            </>
          ) : status === 'error' ? (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Cámara no disponible
            </div>
          ) : (
            <p className="text-xs text-slate-500">Iniciando cámara...</p>
          )}
        </div>
      </div>
    </div>
  )
}
