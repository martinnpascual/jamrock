-- Migración: precio de venta por gramo en cada lote
-- Cada lote puede tener su propio precio de venta al socio.
-- cost_per_gram = lo que pagamos al proveedor
-- price_per_gram = lo que le cobramos al socio

ALTER TABLE medical_stock_lots
  ADD COLUMN IF NOT EXISTS price_per_gram NUMERIC(10,2) DEFAULT 0;

-- Comentario descriptivo
COMMENT ON COLUMN medical_stock_lots.price_per_gram IS 'Precio de venta al socio por gramo. 0 = gratis/sin cargo.';
