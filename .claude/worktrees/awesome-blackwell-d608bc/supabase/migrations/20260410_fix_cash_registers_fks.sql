-- Fix FK de closed_by para que apunte a profiles (no auth.users)
ALTER TABLE cash_registers DROP CONSTRAINT IF EXISTS cash_registers_closed_by_fkey;
ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES profiles(id);

-- Agregar FK de created_by a profiles si no existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cash_registers_created_by_fkey') THEN
    ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
  END IF;
END $$;

-- Fix diferencia incorrecta en registros cerrados
UPDATE cash_registers
SET difference = actual_total - expected_total
WHERE status = 'cerrada' AND actual_total IS NOT NULL;
