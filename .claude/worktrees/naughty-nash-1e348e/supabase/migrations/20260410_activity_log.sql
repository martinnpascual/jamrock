-- Activity log para acciones de negocio legibles
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Solo lectura para usuarios autenticados (inserts via service_role)
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated USING (true);
