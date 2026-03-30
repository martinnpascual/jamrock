-- ============================================================
-- JAMROCK CLUB — Migration 001: Schema inicial completo
-- ============================================================

-- ============================================================
-- TABLA: profiles (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('gerente', 'secretaria', 'cultivador')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_gerente" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_update_gerente" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- ============================================================
-- TABLA: suppliers (necesaria antes de medical_stock_lots)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('medicinal', 'comercial', 'ambos')),
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Gerente: CRUD completo
CREATE POLICY "suppliers_gerente_all" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- Secretaria y cultivador: solo ver no eliminados
CREATE POLICY "suppliers_others_select" ON suppliers
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ============================================================
-- TABLA: medical_stock_lots
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_stock_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genetics TEXT NOT NULL,
  initial_grams NUMERIC(10,2) NOT NULL,
  current_grams NUMERIC(10,2) NOT NULL,
  cost_per_gram NUMERIC(10,2),
  lot_date DATE DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER medical_stock_lots_updated_at
BEFORE UPDATE ON medical_stock_lots
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE medical_stock_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_stock_gerente_cultivador_all" ON medical_stock_lots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'cultivador'))
  );

CREATE POLICY "medical_stock_secretaria_select" ON medical_stock_lots
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ============================================================
-- TABLA: members
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  member_type TEXT DEFAULT 'standard',
  membership_fee NUMERIC(10,2),
  reprocann_status TEXT DEFAULT 'en_tramite'
    CHECK (reprocann_status IN ('activo', 'en_tramite', 'vencido', 'cancelado')),
  reprocann_expiry DATE,
  reprocann_number TEXT,
  qr_code TEXT UNIQUE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Trigger: generar member_number (SOC-XXXX)
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM members;
  NEW.member_number := 'SOC-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_member_number
BEFORE INSERT ON members
FOR EACH ROW
WHEN (NEW.member_number IS NULL)
EXECUTE FUNCTION generate_member_number();

CREATE TRIGGER members_updated_at
BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_gerente_secretaria_all" ON members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

CREATE POLICY "members_cultivador_select" ON members
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cultivador')
  );

-- ============================================================
-- TABLA: dispensations (INMUTABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS dispensations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispensation_number TEXT UNIQUE,
  member_id UUID NOT NULL REFERENCES members(id),
  quantity_grams NUMERIC(8,2) NOT NULL,
  genetics TEXT NOT NULL,
  lot_id UUID REFERENCES medical_stock_lots(id),
  type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'anulacion')),
  nullifies_id UUID REFERENCES dispensations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Trigger: generar dispensation_number (DISP-XXXX)
CREATE OR REPLACE FUNCTION generate_dispensation_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(dispensation_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM dispensations;
  NEW.dispensation_number := 'DISP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dispensation_number
BEFORE INSERT ON dispensations
FOR EACH ROW
WHEN (NEW.dispensation_number IS NULL)
EXECUTE FUNCTION generate_dispensation_number();

-- Trigger: descontar stock de medical_stock_lots al dispensar
CREATE OR REPLACE FUNCTION deduct_medical_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lot_id IS NOT NULL AND NEW.type = 'normal' THEN
    UPDATE medical_stock_lots
    SET current_grams = current_grams - NEW.quantity_grams
    WHERE id = NEW.lot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dispensation_deduct_stock
AFTER INSERT ON dispensations
FOR EACH ROW EXECUTE FUNCTION deduct_medical_stock();

-- Trigger: BLOQUEAR UPDATE y DELETE (tabla inmutable)
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Esta tabla es inmutable. No se permiten modificaciones ni eliminaciones.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_dispensation_update
BEFORE UPDATE ON dispensations
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_dispensation_delete
BEFORE DELETE ON dispensations
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

-- RLS: dispensations
ALTER TABLE dispensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispensations_select_authenticated" ON dispensations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "dispensations_insert_gerente_secretaria" ON dispensations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

-- ============================================================
-- TABLA: commercial_products
-- ============================================================
CREATE TABLE IF NOT EXISTS commercial_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER commercial_products_updated_at
BEFORE UPDATE ON commercial_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE commercial_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commercial_products_gerente_all" ON commercial_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "commercial_products_others_select" ON commercial_products
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

CREATE POLICY "commercial_products_secretaria_insert" ON commercial_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ============================================================
-- TABLA: sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES commercial_products(id),
  member_id UUID REFERENCES members(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Trigger: descontar stock_quantity de commercial_products
CREATE OR REPLACE FUNCTION deduct_commercial_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE commercial_products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_deduct_stock
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION deduct_commercial_stock();

CREATE TRIGGER sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_gerente_all" ON sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "sales_secretaria_insert_select" ON sales
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

CREATE POLICY "sales_secretaria_insert" ON sales
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ============================================================
-- TABLA: cash_registers
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  expected_total NUMERIC(12,2) DEFAULT 0,
  actual_total NUMERIC(12,2),
  difference NUMERIC(12,2),
  status TEXT DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_registers_gerente_all" ON cash_registers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "cash_registers_secretaria_select" ON cash_registers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ============================================================
-- TABLA: payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  amount NUMERIC(10,2) NOT NULL,
  concept TEXT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_gerente_all" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "payments_secretaria_insert_select" ON payments
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

CREATE POLICY "payments_secretaria_insert" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ============================================================
-- TABLA: supply_records
-- ============================================================
CREATE TABLE IF NOT EXISTS supply_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2),
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  impacts_stock TEXT CHECK (impacts_stock IN ('medicinal', 'comercial', 'ninguno')),
  lot_id UUID REFERENCES medical_stock_lots(id),
  product_id UUID REFERENCES commercial_products(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER supply_records_updated_at
BEFORE UPDATE ON supply_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE supply_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_records_gerente_all" ON supply_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- ============================================================
-- TABLA: events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  total_cost NUMERIC(12,2) DEFAULT 0,
  total_income NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planificado' CHECK (status IN ('planificado', 'activo', 'cerrado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_gerente_all" ON events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "events_others_select" ON events
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ============================================================
-- TABLA: event_attendees
-- ============================================================
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id),
  member_id UUID NOT NULL REFERENCES members(id),
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, member_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_attendees_gerente_all" ON event_attendees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "event_attendees_others_select" ON event_attendees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ============================================================
-- TABLA: enrollment_requests (pública — sin auth requerida)
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  reprocann_status TEXT,
  reprocann_number TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  rejection_reason TEXT,
  missing_info TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar (formulario público)
CREATE POLICY "enrollment_requests_public_insert" ON enrollment_requests
  FOR INSERT WITH CHECK (true);

-- Solo gerente y secretaria pueden ver y actualizar
CREATE POLICY "enrollment_requests_staff_select" ON enrollment_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

CREATE POLICY "enrollment_requests_staff_update" ON enrollment_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

-- ============================================================
-- TABLA: audit_logs (INMUTABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_gerente_select" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "audit_logs_authenticated_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLA: app_config
-- ============================================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_gerente_all" ON app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

CREATE POLICY "app_config_others_select" ON app_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid())
  );

-- ============================================================
-- AUDIT TRIGGER para tablas críticas
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  record_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (TG_TABLE_NAME, record_id, TG_OP, row_to_json(OLD)::jsonb, NULL, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    record_id := NEW.id;
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (TG_TABLE_NAME, record_id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    record_id := NEW.id;
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (TG_TABLE_NAME, record_id, TG_OP, NULL, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar audit a tablas críticas
CREATE TRIGGER audit_members
AFTER INSERT OR UPDATE OR DELETE ON members
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_sales
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_dispensations
AFTER INSERT ON dispensations
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================
-- FUNCIÓN: crear profile automático al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'secretaria')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- DATOS INICIALES: app_config
-- ============================================================
INSERT INTO app_config (key, value, description) VALUES
  ('club_name', '"Jamrock Club"', 'Nombre del club'),
  ('membership_fee_default', '5000', 'Cuota mensual por defecto (ARS)'),
  ('low_stock_threshold_grams', '100', 'Umbral de stock medicinal bajo (gramos)'),
  ('max_dispensation_grams', '30', 'Máximo de gramos por dispensa mensual')
ON CONFLICT (key) DO NOTHING;
