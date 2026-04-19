'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface MemberQRProps {
  value: string
  size?: number
  className?: string
}

export function MemberQR({ value, size = 180, className }: MemberQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
