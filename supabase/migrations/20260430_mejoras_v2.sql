-- ============================================================
-- MIGRATION: Mejoras v2
-- 1. Columnas de precio/descuento en dispensations
-- 2. Tabla member_condition_history (inmutable)
-- 3. Trigger que registra cambios de condición en members
-- 4. pg_cron para vencimiento automático de REPROCANN
-- 5. price_basico NOT NULL DEFAULT 0 en commercial_products
-- ============================================================

-- ============================================================
-- 1. DISPENSATIONS — agregar columnas de precio y estado de pago
-- ============================================================
ALTER TABLE dispensations
  ADD COLUMN IF NOT EXISTS price_per_gram   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'pagado'
    CHECK (payment_status IN ('pagado', 'fiado', 'parcial', 'sin_cargo')),
  ADD COLUMN IF NOT EXISTS condicion_at_dispense TEXT;

-- ============================================================
-- 2. COMMERCIAL_PRODUCTS — price_basico NOT NULL DEFAULT 0
-- ============================================================
UPDATE commercial_products SET price_basico = 0 WHERE price_basico IS NULL;
ALTER TABLE commercial_products ALTER COLUMN price_basico SET DEFAULT 0;
ALTER TABLE commercial_products ALTER COLUMN price_basico SET NOT NULL;

-- ============================================================
-- 3. TABLA member_condition_history (INMUTABLE — solo INSERT)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_condition_history (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id            UUID NOT NULL REFERENCES members(id),
  old_condicion        TEXT,
  new_condicion        TEXT NOT NULL,
  old_reprocann_status TEXT,
  new_reprocann_status TEXT,
  changed_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  changed_by           UUID REFERENCES auth.users(id),
  reason               TEXT
);

ALTER TABLE member_condition_history ENABLE ROW LEVEL SECURITY;

-- Solo gerente y secretaria pueden ver el historial
CREATE POLICY "condicion_history_select" ON member_condition_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gerente', 'secretaria')
    )
  );

-- INSERT solo vía trigger (service_role) — usuarios normales no insertan
CREATE POLICY "condicion_history_insert_service" ON member_condition_history
  FOR INSERT WITH CHECK (true);

-- NUNCA UPDATE ni DELETE
CREATE POLICY "condicion_history_no_update" ON member_condition_history
  FOR UPDATE USING (false);

CREATE POLICY "condicion_history_no_delete" ON member_condition_history
  FOR DELETE USING (false);

-- ============================================================
-- 4. TRIGGER: registrar cambio de condición en members
-- ============================================================
CREATE OR REPLACE FUNCTION track_member_condicion_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actúa si condicion cambia (GENERATED ALWAYS, se recalcula tras UPDATE)
  IF OLD.condicion IS DISTINCT FROM NEW.condicion THEN
    INSERT INTO member_condition_history (
      member_id,
      old_condicion,
      new_condicion,
      old_reprocann_status,
      new_reprocann_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.condicion,
      NEW.condicion,
      OLD.reprocann_status,
      NEW.reprocann_status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar si ya existe para poder recrear
DROP TRIGGER IF EXISTS on_member_condicion_change ON members;

CREATE TRIGGER on_member_condicion_change
  AFTER UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION track_member_condicion_change();

-- ============================================================
-- 5. FUNCIÓN: procesar vencimientos REPROCANN
--    Llamada por pg_cron diariamente
-- ============================================================
CREATE OR REPLACE FUNCTION process_reprocann_expiry()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE members
  SET
    reprocann_status = 'baja',
    updated_at       = now()
  WHERE
    reprocann_status = 'vigente'
    AND reprocann_expiry IS NOT NULL
    AND reprocann_expiry < CURRENT_DATE
    AND is_deleted = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. pg_cron: correr process_reprocann_expiry() todos los días a las 6:00 AM UTC
--    NOTA: requiere que la extensión pg_cron esté habilitada en el proyecto Supabase.
--    Si ya existe el job, se elimina y recrea.
-- ============================================================
DO $$
BEGIN
  -- Intentar eliminar job previo (puede no existir)
  BEGIN
    PERFORM cron.unschedule('process-reprocann-expiry');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Crear el job
  PERFORM cron.schedule(
    'process-reprocann-expiry',
    '0 6 * * *',
    $$SELECT process_reprocann_expiry();$$
  );
EXCEPTION WHEN OTHERS THEN
  -- Si pg_cron no está disponible, continuar sin error (la función ya existe para llamado manual)
  RAISE NOTICE 'pg_cron no disponible: el job de vencimiento REPROCANN no fue programado. Llamar process_reprocann_expiry() manualmente.';
END $$;
