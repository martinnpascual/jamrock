-- ============================================================
-- MIGRATION: Separar REPROCANN vencido de baja del club
-- 1. Agregar 'vencido' al enum de reprocann_status
-- 2. Actualizar compute_condicion para manejar vencido
-- 3. Corregir process_reprocann_expiry para usar 'vencido' en vez de 'baja'
-- ============================================================

-- ============================================================
-- 1. REPROCANN_STATUS — agregar valor 'vencido'
--    baja = dado de baja del CLUB (no del REPROCANN)
--    vencido = REPROCANN expiró por fecha (automático via pg_cron)
-- ============================================================
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_reprocann_status_check;
ALTER TABLE members ADD CONSTRAINT members_reprocann_status_check
  CHECK (reprocann_status IN (
    'vigente',     -- REPROCANN activo y vigente
    'en_tramite',  -- en proceso de tramitación
    'iniciar',     -- pendiente de iniciar trámite
    'no_tramita',  -- el socio no tramita REPROCANN
    'no_aplica',   -- no aplica (ej: solo CBD)
    'vencido',     -- REPROCANN expiró por fecha (pg_cron lo setea automáticamente)
    'baja'         -- dado de baja del CLUB (no del REPROCANN)
  ));

-- Hacer lo mismo en enrollment_requests (si tiene el campo)
-- (enrollment_requests.reprocann_status no tiene CHECK constraint, es TEXT libre)

-- ============================================================
-- 2. ACTUALIZAR compute_condicion para manejar 'vencido'
--    vencido → 'reprocann_vencido' (nueva condicion)
--    baja    → 'asociado_baja'     (sin cambio, significa baja del club)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_condicion(
  p_reprocann TEXT,
  p_cultivador TEXT,
  p_domicilio_cultivo TEXT
) RETURNS TEXT AS $$
BEGIN
  -- Casos que cortan independientemente del cultivador
  IF p_reprocann = 'baja'       THEN RETURN 'asociado_baja'; END IF;
  IF p_reprocann = 'vencido'    THEN RETURN 'reprocann_vencido'; END IF;
  IF p_reprocann = 'no_tramita' THEN RETURN 'no_tramita_reprocann'; END IF;
  IF p_reprocann = 'no_aplica'  THEN RETURN 'no_aplica'; END IF;

  -- Lógica por cultivador
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
-- 3. CORREGIR process_reprocann_expiry
--    Antes ponía 'baja', ahora pone 'vencido'
--    (baja = dado de baja del CLUB, que es una acción manual)
-- ============================================================
CREATE OR REPLACE FUNCTION process_reprocann_expiry()
RETURNS INTEGER AS $func$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE members
  SET
    reprocann_status = 'vencido',   -- REPROCANN vencido por fecha, NO baja del club
    updated_at       = now()
  WHERE
    reprocann_status = 'vigente'
    AND reprocann_expiry IS NOT NULL
    AND reprocann_expiry < CURRENT_DATE
    AND is_deleted = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. ACTUALIZAR función can_member_dispense si existe
--    Agrega bloqueo por deuda en cuenta corriente
-- ============================================================
CREATE OR REPLACE FUNCTION can_member_dispense(p_member_id UUID)
RETURNS JSONB AS $func$
DECLARE
  v_member RECORD;
  v_balance NUMERIC;
BEGIN
  -- Verificar que el socio existe y no está eliminado
  SELECT reprocann_status, is_deleted
  INTO v_member
  FROM members
  WHERE id = p_member_id;

  IF NOT FOUND OR v_member.is_deleted THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Socio no encontrado');
  END IF;

  -- Verificar REPROCANN vigente
  IF v_member.reprocann_status != 'vigente' THEN
    CASE v_member.reprocann_status
      WHEN 'vencido'    THEN RETURN jsonb_build_object('allowed', false, 'reason', 'REPROCANN vencido — el socio debe renovar su autorización');
      WHEN 'baja'       THEN RETURN jsonb_build_object('allowed', false, 'reason', 'El socio está dado de baja del club');
      WHEN 'en_tramite' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'REPROCANN en trámite — aún no habilitado para dispensar');
      WHEN 'iniciar'    THEN RETURN jsonb_build_object('allowed', false, 'reason', 'REPROCANN pendiente de iniciar — no habilitado para dispensar');
      WHEN 'no_tramita' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'El socio no tramita REPROCANN — no puede dispensar');
      WHEN 'no_aplica'  THEN RETURN jsonb_build_object('allowed', false, 'reason', 'REPROCANN no aplica — no habilitado para dispensar');
      ELSE                   RETURN jsonb_build_object('allowed', false, 'reason', 'REPROCANN no vigente');
    END CASE;
  END IF;

  -- Verificar deuda en cuenta corriente
  SELECT COALESCE(ca.balance, 0)
  INTO v_balance
  FROM current_accounts ca
  WHERE ca.member_id = p_member_id
    AND ca.is_deleted = false
  LIMIT 1;

  IF v_balance < 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('El socio tiene una deuda de $%s en cuenta corriente — debe regularizarla antes de dispensar', ABS(ROUND(v_balance, 0))::TEXT)
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', NULL);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
