-- =============================================================================
-- Migration: Mixed payment 3-way + Cash register shifts
-- Date: 2026-04-09
-- Description:
--   MEJORA 1: Soporte para pago mixto de 3 vías (efectivo + transferencia + CC)
--             + campos de detalle de transferencia
--   MEJORA 2: Turnos en caja (mañana/tarde)
-- =============================================================================

-- ── MEJORA 1: Nuevas columnas en checkout_transactions ──────────────────────

-- Detalle de la transferencia (comprobante, alias, etc.)
ALTER TABLE checkout_transactions ADD COLUMN IF NOT EXISTS transfer_detail TEXT;

-- Monto realmente depositado por transferencia (puede ser >= al asignado)
ALTER TABLE checkout_transactions ADD COLUMN IF NOT EXISTS transfer_amount_received NUMERIC(12,2) DEFAULT 0;

-- ── MEJORA 1: Actualizar CHECK constraints de payment_method ────────────────

-- checkout_transactions
ALTER TABLE checkout_transactions DROP CONSTRAINT IF EXISTS checkout_transactions_payment_method_check;
ALTER TABLE checkout_transactions ADD CONSTRAINT checkout_transactions_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

-- payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

-- sales
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

-- dispensations (tiene payment_method también)
ALTER TABLE dispensations DROP CONSTRAINT IF EXISTS dispensations_payment_method_check;
ALTER TABLE dispensations ADD CONSTRAINT dispensations_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3', 'cuenta_corriente'));

-- ── MEJORA 2: Turnos en cash_registers ──────────────────────────────────────

-- Eliminar constraint UNIQUE en register_date (ahora puede haber 2 registros por día)
ALTER TABLE cash_registers DROP CONSTRAINT IF EXISTS cash_registers_register_date_key;

-- Agregar columna de turno
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'mañana'
  CHECK (shift IN ('mañana', 'tarde'));

-- Agregar constraint UNIQUE compuesto: una caja por fecha+turno
ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_date_shift_unique
  UNIQUE (register_date, shift);
