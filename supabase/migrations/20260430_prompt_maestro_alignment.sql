-- ============================================================
-- MIGRATION: Alineación con PROMPT MAESTRO
-- Agrega cultivador, domicilio_cultivo, condicion, cuit a members
-- Actualiza enums reprocann_status y member_type
-- Crea tabla exchange_rates
-- Agrega campos billing a payments
-- Agrega precios por tipo a commercial_products
-- ============================================================

-- ============================================================
-- 1. FUNCIÓN compute_condicion (debe existir antes del GENERATED column)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_condicion(
  p_reprocann TEXT,
  p_cultivador TEXT,
  p_domicilio_cultivo TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_reprocann = 'baja'       THEN RETURN 'asociado_baja'; END IF;
  IF p_reprocann = 'no_tramita' THEN RETURN 'no_tramita_reprocann'; END IF;
  IF p_reprocann = 'no_aplica'  THEN RETURN 'no_aplica'; END IF;
  IF p_cultivador = 'jamrock' THEN
    IF p_reprocann = 'vigente'    THEN RETURN 'delegacion_sistema_vigente'; END IF;
    IF p_reprocann = 'en_tramite' THEN RETURN 'delegacion_sistema_en_tramite'; END IF;
    IF p_reprocann = 'iniciar'    THEN RETURN 'delegacion_sistema_pendiente'; END IF;
  END IF;
  IF p_cultivador IN ('autocultivo', 'otro') THEN
    IF p_domicilio_cultivo IN ('san_lorenzo_426', 'villa_allende') THEN
      IF p_reprocann = 'vigente'                  THEN RETURN 'delegacion_contrato_vigente'; END IF;
      IF p_reprocann IN ('en_tramite', 'iniciar') THEN RETURN 'reiniciar'; END IF;
    END IF;
    IF p_domicilio_cultivo = 'personal' THEN
      IF p_reprocann IN ('vigente', 'en_tramite', 'iniciar') THEN RETURN 'no_delega'; END IF;
    END IF;
  END IF;
  RETURN 'no_aplica';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 2. TABLA members — actualizar enum reprocann_status
-- Mapeamos: activo→vigente, vencido→baja, cancelado→no_tramita
-- ============================================================

-- Primero migramos los datos existentes antes de cambiar el CHECK
UPDATE members SET reprocann_status = 'vigente'    WHERE reprocann_status = 'activo';
UPDATE members SET reprocann_status = 'baja'       WHERE reprocann_status = 'vencido';
UPDATE members SET reprocann_status = 'no_tramita' WHERE reprocann_status = 'cancelado';
-- en_tramite se mantiene igual

-- Droppear el CHECK viejo y agregar el nuevo
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_reprocann_status_check;
ALTER TABLE members ADD CONSTRAINT members_reprocann_status_check
  CHECK (reprocann_status IN ('vigente', 'en_tramite', 'iniciar', 'no_tramita', 'baja', 'no_aplica'));

-- Cambiar el DEFAULT
ALTER TABLE members ALTER COLUMN reprocann_status SET DEFAULT 'iniciar';

-- ============================================================
-- 3. TABLA members — actualizar enum member_type
-- Mapeamos: standard→basico, therapeutic→basico, honorary→autoridad
-- ============================================================
UPDATE members SET member_type = 'basico'    WHERE member_type IN ('standard', 'therapeutic');
UPDATE members SET member_type = 'autoridad' WHERE member_type = 'honorary';

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_member_type_check;
ALTER TABLE members ADD CONSTRAINT members_member_type_check
  CHECK (member_type IN ('basico', 'administrativo', 'autoridad', 'ninguno'));

ALTER TABLE members ALTER COLUMN member_type SET DEFAULT 'basico';

-- ============================================================
-- 4. TABLA members — agregar columnas nuevas
-- ============================================================
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS cultivador TEXT DEFAULT 'jamrock'
    CHECK (cultivador IN ('jamrock', 'autocultivo', 'otro')),
  ADD COLUMN IF NOT EXISTS domicilio_cultivo TEXT DEFAULT 'san_lorenzo_426'
    CHECK (domicilio_cultivo IN ('san_lorenzo_426', 'villa_allende', 'personal'));

-- Rellenar cultivador y domicilio_cultivo para filas existentes con defaults
UPDATE members SET cultivador = 'jamrock' WHERE cultivador IS NULL;
UPDATE members SET domicilio_cultivo = 'san_lorenzo_426' WHERE domicilio_cultivo IS NULL;

-- Hacer las columnas NOT NULL después de rellenarlas
ALTER TABLE members ALTER COLUMN cultivador SET NOT NULL;
ALTER TABLE members ALTER COLUMN domicilio_cultivo SET NOT NULL;

-- ============================================================
-- 5. TABLA members — agregar columna GENERATED condicion
-- ============================================================
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS condicion TEXT GENERATED ALWAYS AS (
    compute_condicion(reprocann_status, cultivador, domicilio_cultivo)
  ) STORED;

-- ============================================================
-- 6. TABLA exchange_rates (nueva)
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  usd_to_ars NUMERIC(10,2) NOT NULL CHECK (usd_to_ars > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_authenticated_select" ON exchange_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "exchange_rates_gerente_secretaria_insert" ON exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

CREATE POLICY "exchange_rates_gerente_all" ON exchange_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- ============================================================
-- 7. TABLA payments — agregar campos de facturación y multi-moneda
-- ============================================================

-- Renombrar amount → amount_ars (para mantener datos existentes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount_ars'
  ) THEN
    ALTER TABLE payments RENAME COLUMN amount TO amount_ars;
  END IF;
END $$;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ars' CHECK (currency IN ('ars', 'usd')),
  ADD COLUMN IF NOT EXISTS exchange_rate_id UUID REFERENCES exchange_rates(id),
  ADD COLUMN IF NOT EXISTS billing_description TEXT,
  ADD COLUMN IF NOT EXISTS billing_from DATE,
  ADD COLUMN IF NOT EXISTS billing_to DATE,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false;

-- Actualizar el CHECK del concept para que sea consistente con el PROMPT MAESTRO
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_concept_check;
ALTER TABLE payments ADD CONSTRAINT payments_concept_check
  CHECK (concept IN ('afiliacion', 'cuota_mensual', 'cuota_anual', 'venta', 'dispensa', 'otro'));

-- ============================================================
-- 8. TABLA commercial_products — agregar precios por tipo de socio
-- ============================================================

-- Si ya existe la columna price, la renombramos a price_basico
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_products' AND column_name = 'price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_products' AND column_name = 'price_basico'
  ) THEN
    ALTER TABLE commercial_products RENAME COLUMN price TO price_basico;
  END IF;
END $$;

ALTER TABLE commercial_products
  ADD COLUMN IF NOT EXISTS price_no_delega NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_administrativo NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_autoridad NUMERIC(10,2);

-- ============================================================
-- 9. TABLA enrollment_requests — agregar campos nuevos
-- ============================================================
ALTER TABLE enrollment_requests
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS cultivador TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_cultivo TEXT;
