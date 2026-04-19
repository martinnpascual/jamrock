-- Tabla de sesiones de trabajo por operador
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Trigger: calcular duration_minutes cuando se setea logout_at
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_at IS NOT NULL AND OLD.logout_at IS NULL THEN
    NEW.duration_minutes := GREATEST(0, ROUND(
      EXTRACT(EPOCH FROM (NEW.logout_at - NEW.login_at)) / 60
    )::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_duration
BEFORE UPDATE ON work_sessions
FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

-- RLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve sus propias sesiones; gerente ve todas
CREATE POLICY "work_sessions_select" ON work_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente')
  );

CREATE POLICY "work_sessions_insert" ON work_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "work_sessions_update" ON work_sessions
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente')
  );

-- Config: tarifa horaria para secretarias
INSERT INTO app_config (key, value, description)
VALUES ('hourly_rate_secretaria', '{"amount": 0, "currency": "ARS"}', 'Tarifa por hora para secretarias (ARS)')
ON CONFLICT (key) DO NOTHING;
