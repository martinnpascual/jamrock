-- ============================================================
-- Migration: 20260407_checkout_transactions.sql
-- Módulo: Checkout unificado (dispensa + productos + pago)
-- Incluye: tablas, trigger de numeración, RLS, audit, app_config
-- ============================================================
-- NOTA DE DISEÑO CC:
--   Las ventas creadas por checkout NO llevan member_id para evitar
--   que el trigger sale_to_cc_movement genere DÉBITO duplicado.
--   La asociación socio↔venta se preserva vía checkout_items.
--   Los movimientos en CC son exclusivamente manejados por el
--   endpoint /api/checkout:
--     • PAGO:  DÉBITO manual (total checkout) + CRÉDITO via payment trigger → neto 0
--     • FIADO: DÉBITO manual (total checkout) sin CRÉDITO → queda como deuda
-- ============================================================

-- ============================================================
-- 1. TABLA: checkout_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout_transactions (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number     TEXT        UNIQUE NOT NULL,               -- TXN-00001 (via trigger)

  -- Socio
  member_id              UUID        NOT NULL REFERENCES members(id),

  -- Dispensa asociada (siempre presente)
  dispensation_id        UUID        REFERENCES dispensations(id),
  dispensation_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,          -- $0 si dispensa gratis

  -- Productos (detalle en checkout_items)
  products_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,          -- subtotal productos

  -- Totales
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,          -- dispensation + products

  -- Estado del pago
  payment_status         TEXT        NOT NULL DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente', 'pagado', 'fiado', 'parcial')),

  payment_method         TEXT
    CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),

  -- Desglose del pago
  amount_paid            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_cash            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_transfer        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_charged_to_cc   NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_given           NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Referencias a entidades creadas
  payment_id             UUID        REFERENCES payments(id),
  cc_movement_id         UUID        REFERENCES current_account_movements(id),

  -- Metadata
  notes                  TEXT,

  -- Audit estándar (tabla NO inmutable — permite soft delete para anulaciones)
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID        REFERENCES auth.users(id),
  is_deleted             BOOLEAN     NOT NULL DEFAULT false,
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID        REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checkout_member_id
  ON checkout_transactions(member_id);

CREATE INDEX IF NOT EXISTS idx_checkout_created_at
  ON checkout_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_payment_status
  ON checkout_transactions(payment_status);

CREATE INDEX IF NOT EXISTS idx_checkout_not_deleted
  ON checkout_transactions(id) WHERE is_deleted = false;

COMMENT ON TABLE checkout_transactions
  IS 'Transacciones de checkout: agrupa dispensa + productos + pago en una sola operación';

-- ============================================================
-- 2. TABLA: checkout_items
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout_items (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   UUID        NOT NULL REFERENCES checkout_transactions(id) ON DELETE CASCADE,

  -- Producto (snapshot al momento de la venta)
  product_id       UUID        NOT NULL REFERENCES commercial_products(id),
  product_name     TEXT        NOT NULL,           -- snapshot: nombre al momento de vender
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(10,2) NOT NULL,         -- snapshot: precio al momento de vender
  subtotal         NUMERIC(12,2) NOT NULL,         -- quantity × unit_price

  -- Referencia a la sale creada (para compatibilidad con stock y reportes)
  sale_id          UUID        REFERENCES sales(id),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_items_transaction_id
  ON checkout_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_checkout_items_product_id
  ON checkout_items(product_id);

COMMENT ON TABLE checkout_items
  IS 'Detalle de productos comerciales de una transacción checkout';

-- ============================================================
-- 3. TRIGGER: generate_transaction_number → TXN-00001
--    Mismo patrón que generate_member_number, generate_movement_number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Lock tabla para evitar race conditions en inserts concurrentes
  PERFORM pg_advisory_xact_lock(hashtext('checkout_transactions_seq'));

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(transaction_number FROM 5) AS INTEGER)),
    0
  ) + 1
  INTO next_num
  FROM checkout_transactions;

  NEW.transaction_number := 'TXN-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_transaction_number
BEFORE INSERT ON checkout_transactions
FOR EACH ROW
WHEN (NEW.transaction_number IS NULL OR NEW.transaction_number = '')
EXECUTE FUNCTION generate_transaction_number();

-- ============================================================
-- 4. TRIGGER: updated_at automático en checkout_transactions
--    Reutiliza update_updated_at() del schema base
-- ============================================================
CREATE TRIGGER set_updated_at_checkout
BEFORE UPDATE ON checkout_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. AUDIT TRIGGERS (reutiliza log_audit del schema base)
-- ============================================================
CREATE TRIGGER audit_checkout_transactions
AFTER INSERT OR UPDATE ON checkout_transactions
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- checkout_items es inmutable en práctica (ON DELETE CASCADE),
-- pero auditamos los inserts para trazabilidad
CREATE TRIGGER audit_checkout_items
AFTER INSERT ON checkout_items
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================
-- 6. ROW LEVEL SECURITY
--    Reutiliza get_my_role() ya definida en el schema base
-- ============================================================
ALTER TABLE checkout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_items        ENABLE ROW LEVEL SECURITY;

-- checkout_transactions: gerente tiene acceso total
CREATE POLICY "ct_gerente_all" ON checkout_transactions
  FOR ALL
  USING (get_my_role() = 'gerente');

-- checkout_transactions: secretaria puede ver e insertar (no eliminar)
CREATE POLICY "ct_secretaria_select" ON checkout_transactions
  FOR SELECT
  USING (is_deleted = false AND get_my_role() = 'secretaria');

CREATE POLICY "ct_secretaria_insert" ON checkout_transactions
  FOR INSERT
  WITH CHECK (get_my_role() = 'secretaria');

-- checkout_items: gerente tiene acceso total
CREATE POLICY "ci_gerente_all" ON checkout_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM checkout_transactions ct
      WHERE ct.id = checkout_items.transaction_id
    )
    AND get_my_role() = 'gerente'
  );

-- checkout_items: secretaria puede ver e insertar
CREATE POLICY "ci_secretaria_select" ON checkout_items
  FOR SELECT
  USING (get_my_role() = 'secretaria');

CREATE POLICY "ci_secretaria_insert" ON checkout_items
  FOR INSERT
  WITH CHECK (get_my_role() = 'secretaria');

-- cultivador NO tiene acceso a checkout (omitido intencionalmente)

-- ============================================================
-- 7. CONFIGURACIÓN en app_config
--    INSERT ON CONFLICT DO NOTHING → idempotente
-- ============================================================
INSERT INTO app_config (key, value, description)
VALUES
  (
    'dispensation_price_per_gram',
    '{"enabled": false, "price": 0}',
    'Precio por gramo de dispensa medicinal. enabled=false = sin costo para el socio.'
  ),
  (
    'checkout_allow_credit',
    '{"enabled": true}',
    'Si enabled=true, el operador puede cargar el checkout a cuenta corriente del socio (fiar).'
  ),
  (
    'checkout_show_cc_balance',
    '{"enabled": true}',
    'Si enabled=true, mostrar el saldo de la cuenta corriente del socio durante el checkout.'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FIN DE MIGRACIÓN
-- Verificar con:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('checkout_transactions', 'checkout_items');
-- ============================================================
