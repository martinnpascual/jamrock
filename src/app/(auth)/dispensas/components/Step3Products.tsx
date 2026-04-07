'use client'

import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/hooks/useCheckout'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Step3Props {
  cartItems:      CartItem[]
  onAddToCart:    (item: Omit<CartItem, 'quantity' | 'subtotal'>) => void
  onContinue:     () => void  // va a step 4
}

export function Step3Products({ cartItems, onAddToCart, onContinue }: Step3Props) {
  const { data: products = [], isLoading } = useProducts()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products.filter(p => p.stock_quantity > 0)
    return products.filter(p =>
      p.stock_quantity > 0 &&
      (p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
    )
  }, [products, search])

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  function getCartQty(productId: string) {
    return cartItems.find(i => i.product_id === productId)?.quantity ?? 0
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Agregar productos</h2>
        <p className="text-sm text-slate-500 mt-0.5">Buscá y agregá productos al pedido</p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          autoFocus
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {/* Lista de productos */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Package className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">
              {search ? `Sin resultados para "${search}"` : 'No hay productos con stock disponible'}
            </p>
          </div>
        ) : (
          filtered.map(product => {
            const inCart   = getCartQty(product.id)
            const lowStock = product.stock_quantity <= product.low_stock_threshold

            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-[#111111] border border-white/[0.06] rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-100 truncate">{product.name}</p>
                    {lowStock && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-[#2DC814]">{ARS(product.price)}</p>
                    <span className="text-xs text-slate-500">·</span>
                    <p className={cn('text-xs', lowStock ? 'text-amber-400' : 'text-slate-500')}>
                      {product.stock_quantity} en stock
                    </p>
                    {product.category && (
                      <>
                        <span className="text-xs text-slate-600">·</span>
                        <p className="text-xs text-slate-600 truncate">{product.category}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {inCart > 0 && (
                    <span className="text-xs font-semibold text-[#2DC814] bg-[#2DC814]/10 rounded-full px-2 py-0.5">
                      ×{inCart}
                    </span>
                  )}
                  <button
                    onClick={() => onAddToCart({
                      product_id:   product.id,
                      product_name: product.name,
                      unit_price:   product.price,
                    })}
                    className="w-8 h-8 rounded-lg bg-[#2DC814]/10 hover:bg-[#2DC814]/20 border border-[#2DC814]/20 flex items-center justify-center text-[#2DC814] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Continuar */}
      <Button
        onClick={onContinue}
        className="w-full h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold"
      >
        {cartCount > 0
          ? `Continuar con ${cartCount} producto${cartCount !== 1 ? 's' : ''}`
          : 'Continuar sin productos'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
