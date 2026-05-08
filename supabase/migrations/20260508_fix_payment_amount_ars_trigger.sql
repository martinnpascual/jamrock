-- ============================================================
-- MIGRATION: Fix payment_to_cc_movement after amount→amount_ars rename
-- El campo amount en la tabla payments fue renombrado a amount_ars
-- en la migración 20260430_prompt_maestro_alignment.sql.
-- Este fix actualiza el trigger para usar amount_ars con COALESCE
-- para compatibilidad.
-- ============================================================

CREATE OR REPLACE FUNCTION payment_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id           UUID;
  v_original_movement_id UUID;
  v_amount               NUMERIC(12,2);
  v_old_amount           NUMERIC(12,2);
BEGIN
  -- Nueva inserción de pago (no soft-deleted)
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    -- Compatibilidad: amount_ars (nuevo nombre) con fallback a amount (viejo)
    v_amount := COALESCE(NEW.amount_ars, NEW.amount);

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN NEW;  -- Sin monto válido: no generar movimiento CC
    END IF;

    v_account_id := get_or_create_account('socio', NEW.member_id, NULL);

    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id,
      'credito',
      v_amount,
      0,  -- balance_after calculado por trigger calc_balance_before_movement
      COALESCE(NEW.concept, 'pago'),
      'Pago: ' || COALESCE(NEW.concept, '') || CASE WHEN NEW.notes IS NOT NULL THEN ' — ' || NEW.notes ELSE '' END,
      'payment',
      NEW.id,
      NEW.created_by
    );

  -- Soft-delete de pago → reversión DÉBITO
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    v_old_amount := COALESCE(OLD.amount_ars, OLD.amount);

    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = NEW.member_id AND is_deleted = false;

    IF v_account_id IS NOT NULL AND v_old_amount IS NOT NULL AND v_old_amount > 0 THEN
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
        v_old_amount,
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

-- El trigger ya existe, solo se reemplaza la función
-- CREATE TRIGGER trg_payment_to_cc ya está definido en 20260403_create_current_accounts.sql
