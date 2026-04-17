-- Columnas de tercerización para lotes medicinales
ALTER TABLE medical_stock_lots
  ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS outsourced_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS cost_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sale_price_total NUMERIC(12,2);

-- net_profit = sale_price_total - cost_total (se calcula en query)
-- No se persiste como columna para evitar inconsistencias
