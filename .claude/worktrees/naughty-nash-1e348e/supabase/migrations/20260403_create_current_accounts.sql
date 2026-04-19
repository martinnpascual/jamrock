-- ============================================================
-- Migration: 20260403_create_current_accounts.sql
-- Módulo: Cuentas Corrientes (socios y proveedores)
-- Incluye: tablas, triggers, RLS, vista y migración de datos
-- ============================================================

-- ============================================================
-- 1. TABLA: current_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS current_accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number  TEXT UNIQUE NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('socio', 'proveedor')),
  member_id       UUID REFERENCES members(id),
  supplier_id     UUID REFERENCES suppliers(id),
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  -- Audit estándar del proyecto
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id),
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES auth.users(id),
  -- Coherencia entity_type ↔ FKs
  CONSTRAINT chk_ca_entity_coherence CHECK (
    (entity_type = 'socio'     AND member_id   IS NOT NULL AND supplier_id IS NULL) OR
    (entity_type = 'proveedor' AND supplier_id IS NOT NULL AND member_id   IS NULL)
  )
);

-- Una sola CC activa por socio/proveedor
CREATE UNIQUE INDEX IF NOT EXISTS idx_ca_member_unique
  ON current_accounts(member_id)
  WHERE is_deleted = false AND member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ca_supplier_unique
  ON current_accounts(supplier_id)
  WHERE is_deleted = false AND supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ca_member_id   ON current_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_ca_supplier_id ON current_accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ca_entity_type ON current_accounts(entity_type);
CREATE INDEX IF NOT EXISTS idx_ca_active      ON current_accounts(id) WHERE is_deleted = false;

COMMENT ON TABLE current_accounts IS 'Cuentas corrientes de socios y proveedores';

-- ============================================================
-- 2. TABLA: current_account_movements (INMUTABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS current_account_movements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_number TEXT UNIQUE NOT NULL,
  account_id      UUID NOT NULL REFERENCES current_accounts(id),
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('credito', 'debito')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_after   NUMERIC(12,2) NOT NULL DEFAULT 0,
  concept         TEXT NOT NULL,
  description     TEXT,
  source_type     TEXT CHECK (source_type IN ('payment','supply_record','sale','manual','adjustment','reversal')),
  source_id       UUID,
  reverses_id     UUID REFERENCES current_account_movements(id),
  -- Inmutable: solo created_at y created_by (sin updated_at, sin is_deleted)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cam_account_id  ON current_account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_cam_created_at  ON current_account_movements(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cam_source      ON current_account_movements(source_type, source_id) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cam_concept     ON current_account_movements(concept);

COMMENT ON TABLE current_account_movements IS 'Movimientos de cuentas corrientes — INMUTABLE (solo INSERT)';

-- ============================================================
-- 3. TRIGGER: generate_account_number → CC-0001
-- ============================================================
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM current_accounts;
  NEW.account_number := 'CC-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_account_number
BEFORE INSERT ON current_accounts
FOR EACH ROW
WHEN (NEW.account_number IS NULL OR NEW.account_number = '')
EXECUTE FUNCTION generate_account_number();

-- ============================================================
-- 4. TRIGGER: generate_movement_number → MOV-00001
-- ============================================================
CREATE OR REPLACE FUNCTION generate_movement_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(movement_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM current_account_movements;
  NEW.movement_number := 'MOV-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_movement_number
BEFORE INSERT ON current_account_movements
FOR EACH ROW
WHEN (NEW.movement_number IS NULL OR NEW.movement_number = '')
EXECUTE FUNCTION generate_movement_number();

-- ============================================================
-- 5. Inmutabilidad de movimientos (reutiliza prevent_modification)
-- ============================================================
CREATE TRIGGER prevent_movement_update
BEFORE UPDATE ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_movement_delete
BEFORE DELETE ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

-- ============================================================
-- 6. TRIGGER: calculate_and_update_balance (BEFORE INSERT en movements)
-- Calcula saldo nuevo, valida credit_limit y actualiza la cuenta
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_and_update_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance      NUMERIC(12,2);
  v_credit_limit NUMERIC(12,2);
  v_new_balance  NUMERIC(12,2);
BEGIN
  -- Lock de fila para evitar race conditions en concurrencia
  SELECT balance, credit_limit
  INTO   v_balance, v_credit_limit
  FROM   current_accounts
  WHERE  id = NEW.account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta corriente no encontrada: %', NEW.account_id;
  END IF;

  -- Calcular nuevo saldo
  IF NEW.movement_type = 'credito' THEN
    v_new_balance := v_balance + NEW.amount;
  ELSE
    v_new_balance := v_balance - NEW.amount;
  END IF;

  -- Validar límite de crédito (si está configurado)
  IF v_credit_limit > 0 AND v_new_balance < -v_credit_limit THEN
    RAISE EXCEPTION
      'Movimiento excede el límite de crédito. Saldo: %, Límite: %, Monto: %',
      v_balance, v_credit_limit, NEW.amount;
  END IF;

  -- Setear balance_after en el movimiento
  NEW.balance_after := v_new_balance;

  -- Actualizar saldo en la cuenta
  UPDATE current_accounts
  SET    balance = v_new_balance
  WHERE  id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Este trigger corre ANTES de set_movement_number (ambos BEFORE INSERT)
-- El orden se controla con posición en CREATE TRIGGER, pero ambos son independientes
CREATE TRIGGER calc_balance_before_movement
BEFORE INSERT ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION calculate_and_update_balance();

-- ============================================================
-- 7. FUNCIÓN AUXILIAR: get_or_create_account
-- Busca o crea la CC de un socio o proveedor
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_create_account(
  p_entity_type TEXT,
  p_member_id   UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  IF p_entity_type = 'socio' THEN
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = p_member_id AND is_deleted = false;
  ELSE
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  supplier_id = p_supplier_id AND is_deleted = false;
  END IF;

  -- Crear si no existe
  IF v_account_id IS NULL THEN
    INSERT INTO current_accounts (entity_type, member_id, supplier_id)
    VALUES (p_entity_type, p_member_id, p_supplier_id)
    RETURNING id INTO v_account_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. TRIGGER: payment_to_cc_movement
-- INSERT en payments → CRÉDITO en CC del socio
-- Soft-delete en payments → DÉBITO de reversión
-- ============================================================
CREATE OR REPLACE FUNCTION payment_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id          UUID;
  v_original_movement_id UUID;
BEGIN
  -- Nueva inserción de pago (no soft-deleted)
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    v_account_id := get_or_create_account('socio', NEW.member_id, NULL);

    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id,
      'credito',
      NEW.amount,
      0,  -- balance_after calculado por trigger calc_balance_before_movement
      COALESCE(NEW.concept, 'pago'),
      'Pago: ' || COALESCE(NEW.concept, '') || CASE WHEN NEW.notes IS NOT NULL THEN ' — ' || NEW.notes ELSE '' END,
      'payment',
      NEW.id,
      NEW.created_by
    );

  -- Soft-delete de pago → reversión DÉBITO
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = NEW.member_id AND is_deleted = false;

    IF v_account_id IS NOT NULL THEN
      -- Buscar movimiento original para enlazar con reverses_id
      SELECT id INTO v_original_movement_id
      FROM   current_account_movements
      WHERE  source_type = 'payment' AND source_id = OLD.id AND movement_type = 'credito'
      ORDER BY created_at DESC
      LIMIT 1;

      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id,
        'debito',
        OLD.amount,
        0,
        'reversal',
        'Anulación de pago — concepto: ' || COALESCE(OLD.concept, ''),
        'reversal',
        OLD.id,
        v_original_movement_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_to_cc
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION payment_to_cc_movement();

-- ============================================================
-- 9. TRIGGER: supply_to_cc_movement
-- INSERT en supply_records → DÉBITO en CC del proveedor (le debemos)
-- Soft-delete → CRÉDITO de reversión
-- ============================================================
CREATE OR REPLACE FUNCTION supply_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id           UUID;
  v_original_movement_id UUID;
BEGIN
  -- Nueva compra con costo
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false
     AND NEW.total_cost IS NOT NULL AND NEW.total_cost > 0
  THEN
    v_account_id := get_or_create_account('proveedor', NULL, NEW.supplier_id);

    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id,
      'debito',
      NEW.total_cost,
      0,
      'supply_record',
      COALESCE(NEW.description, 'Registro de compra a proveedor'),
      'supply_record',
      NEW.id,
      NEW.created_by
    );

  -- Soft-delete → CRÉDITO de reversión
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true
        AND OLD.total_cost IS NOT NULL AND OLD.total_cost > 0
  THEN
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  supplier_id = NEW.supplier_id AND is_deleted = false;

    IF v_account_id IS NOT NULL THEN
      SELECT id INTO v_original_movement_id
      FROM   current_account_movements
      WHERE  source_type = 'supply_record' AND source_id = OLD.id AND movement_type = 'debito'
      ORDER BY created_at DESC
      LIMIT 1;

      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id,
        'credito',
        OLD.total_cost,
        0,
        'reversal',
        'Anulación de compra — ' || COALESCE(OLD.description, ''),
        'reversal',
        OLD.id,
        v_original_movement_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_supply_to_cc
AFTER INSERT OR UPDATE ON supply_records
FOR EACH ROW EXECUTE FUNCTION supply_to_cc_movement();

-- ============================================================
-- 10. TRIGGER: sale_to_cc_movement
-- INSERT en sales con member_id → DÉBITO en CC del socio
-- Soft-delete → CRÉDITO de reversión
-- ============================================================
CREATE OR REPLACE FUNCTION sale_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id           UUID;
  v_original_movement_id UUID;
BEGIN
  -- Nueva venta a socio
  IF TG_OP = 'INSERT' AND NEW.member_id IS NOT NULL AND NEW.is_deleted = false THEN
    v_account_id := get_or_create_account('socio', NEW.member_id, NULL);

    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id,
      'debito',
      NEW.total,
      0,
      'sale',
      'Venta comercial — $' || NEW.total::TEXT,
      'sale',
      NEW.id,
      NEW.created_by
    );

  -- Soft-delete → CRÉDITO de reversión
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true
        AND NEW.member_id IS NOT NULL
  THEN
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = NEW.member_id AND is_deleted = false;

    IF v_account_id IS NOT NULL THEN
      SELECT id INTO v_original_movement_id
      FROM   current_account_movements
      WHERE  source_type = 'sale' AND source_id = OLD.id AND movement_type = 'debito'
      ORDER BY created_at DESC
      LIMIT 1;

      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id,
        'credito',
        OLD.total,
        0,
        'reversal',
        'Anulación de venta — $' || OLD.total::TEXT,
        'reversal',
        OLD.id,
        v_original_movement_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sale_to_cc
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION sale_to_cc_movement();

-- ============================================================
-- 11. updated_at en current_accounts (reutiliza update_updated_at)
-- ============================================================
CREATE TRIGGER set_updated_at_current_accounts
BEFORE UPDATE ON current_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. AUDIT TRIGGERS (reutiliza log_audit)
-- ============================================================
CREATE TRIGGER audit_current_accounts
AFTER INSERT OR UPDATE ON current_accounts
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_current_account_movements
AFTER INSERT ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE current_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_account_movements ENABLE ROW LEVEL SECURITY;

-- current_accounts: gerente ALL
CREATE POLICY ca_gerente_all ON current_accounts
  FOR ALL
  USING (get_my_role() = 'gerente');

-- current_accounts: secretaria SELECT (activas) + INSERT
CREATE POLICY ca_secretaria_select ON current_accounts
  FOR SELECT
  USING (is_deleted = false AND get_my_role() = 'secretaria');

CREATE POLICY ca_secretaria_insert ON current_accounts
  FOR INSERT
  WITH CHECK (get_my_role() = 'secretaria');

-- current_account_movements: gerente ALL
CREATE POLICY cam_gerente_all ON current_account_movements
  FOR ALL
  USING (get_my_role() = 'gerente');

-- current_account_movements: secretaria SELECT + INSERT
CREATE POLICY cam_secretaria_select ON current_account_movements
  FOR SELECT
  USING (get_my_role() = 'secretaria');

CREATE POLICY cam_secretaria_insert ON current_account_movements
  FOR INSERT
  WITH CHECK (get_my_role() = 'secretaria');

-- ============================================================
-- 14. VISTA: v_account_statement
-- ============================================================
CREATE OR REPLACE VIEW v_account_statement AS
SELECT
  cam.id,
  cam.movement_number,
  cam.account_id,
  cam.movement_type,
  cam.amount,
  cam.balance_after,
  cam.concept,
  cam.description,
  cam.source_type,
  cam.source_id,
  cam.reverses_id,
  cam.created_at,
  cam.created_by,
  -- Info de la cuenta
  ca.account_number,
  ca.entity_type,
  ca.balance            AS current_balance,
  ca.member_id,
  ca.supplier_id,
  -- Nombre legible de la entidad
  CASE ca.entity_type
    WHEN 'socio'     THEN m.first_name || ' ' || m.last_name
    WHEN 'proveedor' THEN s.name
  END AS entity_name,
  CASE ca.entity_type
    WHEN 'socio' THEN m.member_number
    ELSE NULL
  END AS entity_number,
  -- Debe/Haber separados
  CASE WHEN cam.movement_type = 'debito'  THEN cam.amount ELSE 0 END AS debe,
  CASE WHEN cam.movement_type = 'credito' THEN cam.amount ELSE 0 END AS haber,
  -- Operador
  p.full_name AS created_by_name
FROM current_account_movements cam
JOIN current_accounts ca ON ca.id = cam.account_id
LEFT JOIN members  m ON m.id = ca.member_id
LEFT JOIN suppliers s ON s.id = ca.supplier_id
LEFT JOIN profiles  p ON p.id = cam.created_by
ORDER BY cam.created_at DESC;

-- ============================================================
-- 15. MIGRACIÓN DE DATOS EXISTENTES
-- Crear CCs y movimientos por pagos históricos
-- (supply_records y sales están vacíos — solo payments tiene datos)
-- ============================================================
DO $$
DECLARE
  r            RECORD;
  v_account_id UUID;
BEGIN
  -- Paso 1: Crear CCs para socios con pagos existentes
  FOR r IN
    SELECT DISTINCT member_id
    FROM   payments
    WHERE  is_deleted = false
  LOOP
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = r.member_id AND is_deleted = false;

    IF v_account_id IS NULL THEN
      INSERT INTO current_accounts (entity_type, member_id)
      VALUES ('socio', r.member_id);
    END IF;
  END LOOP;

  -- Paso 2: Crear movimientos CRÉDITO por cada pago (orden cronológico
  -- para que el balance se calcule correctamente vía trigger)
  FOR r IN
    SELECT id, member_id, amount, concept, notes, created_at, created_by
    FROM   payments
    WHERE  is_deleted = false
    ORDER BY created_at ASC
  LOOP
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = r.member_id AND is_deleted = false;

    IF v_account_id IS NOT NULL THEN
      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, created_by
      ) VALUES (
        v_account_id,
        'credito',
        r.amount,
        0,  -- calculado por trigger
        COALESCE(r.concept, 'pago'),
        'Migración histórica: ' || COALESCE(r.concept, '') ||
          CASE WHEN r.notes IS NOT NULL THEN ' — ' || r.notes ELSE '' END,
        'payment',
        r.id,
        r.created_by
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Migración Cuentas Corrientes completada.';
END $$;
