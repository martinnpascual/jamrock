-- ============================================================
-- Egresos de caja: sueldos, limpieza, luz, gas, alquiler, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_register_expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES cash_registers(id),   -- puede ser NULL si no hay caja abierta
  category    TEXT NOT NULL CHECK (category IN (
    'sueldo',
    'limpieza',
    'servicios',   -- luz, gas, internet, etc.
    'alquiler',
    'mantenimiento',
    'compras',
    'retiro',
    'otro'
  )),
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes       TEXT,
  -- audit
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id),
  is_deleted  BOOLEAN DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID REFERENCES auth.users(id)
);

-- Índice por fecha para queries rápidas
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON cash_register_expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_register_id ON cash_register_expenses(register_id);

-- RLS
ALTER TABLE cash_register_expenses ENABLE ROW LEVEL SECURITY;

-- Solo gerente puede gestionar egresos; secretaria puede ver
CREATE POLICY "gerente_can_manage_expenses" ON cash_register_expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gerente'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gerente'
    )
  );

CREATE POLICY "secretaria_can_view_expenses" ON cash_register_expenses
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('gerente', 'secretaria')
    )
  );
