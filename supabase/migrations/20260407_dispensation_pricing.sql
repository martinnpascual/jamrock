-- Migración: dispensation_pricing
-- Agrega columnas de precio y descuento a la tabla dispensations (INMUTABLE)
-- Solo aplica a registros nuevos. Los existentes quedan con NULL/defaults.

ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS price_per_gram  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS subtotal         NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS discount_percent INTEGER       DEFAULT 0 CHECK (discount_percent IN (0, 5, 10, 15, 20, 25));
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS payment_method   TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'cuenta_corriente'));
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'sin_cargo' CHECK (payment_status IN ('sin_cargo', 'pagado', 'fiado'));
