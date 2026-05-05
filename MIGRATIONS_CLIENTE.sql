-- ============================================================
-- JAMROCK CLUB — SQL CONSOLIDADO PARA SUPABASE DEL CLIENTE
-- Generado: 2026-04-24
-- ============================================================
--
-- INSTRUCCIONES ANTES DE CORRER ESTE ARCHIVO:
--
-- PASO 1 (obligatorio): Habilitar extensiones en el Dashboard de Supabase:
--   → Database → Extensions → buscar "pg_cron" → Enable
--   → Database → Extensions → buscar "unaccent" → Enable
--   (unaccent suele estar habilitada por defecto)
--
-- PASO 2: Copiar TODO este archivo y pegarlo en:
--   → SQL Editor → New query → pegar → Run
--
-- PASO 3: Si aparece algún error, verificar que las extensiones
--   estén habilitadas y volver a correr.
--
-- NOTA: Todas las sentencias usan IF NOT EXISTS / ON CONFLICT
--   para ser idempotentes (se pueden correr más de una vez sin problema).
-- ============================================================


-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;
-- pg_cron se habilita desde el Dashboard, no por SQL


-- ============================================================
-- MIGRATION 001 — Schema inicial completo
-- ============================================================

-- ── TABLA: profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('gerente', 'secretaria', 'cultivador')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_gerente" ON profiles;
CREATE POLICY "profiles_select_gerente" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_gerente" ON profiles;
CREATE POLICY "profiles_update_gerente" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- ── FUNCIÓN: get_my_role() ────────────────────────────────────
-- Usada por RLS en tablas de cuentas corrientes y checkout
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── TABLA: suppliers ─────────────────────────────────────────
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

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_gerente_all" ON suppliers;
CREATE POLICY "suppliers_gerente_all" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "suppliers_others_select" ON suppliers;
CREATE POLICY "suppliers_others_select" ON suppliers
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ── TABLA: medical_stock_lots ────────────────────────────────
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

DROP TRIGGER IF EXISTS medical_stock_lots_updated_at ON medical_stock_lots;
CREATE TRIGGER medical_stock_lots_updated_at
BEFORE UPDATE ON medical_stock_lots
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE medical_stock_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_stock_gerente_cultivador_all" ON medical_stock_lots;
CREATE POLICY "medical_stock_gerente_cultivador_all" ON medical_stock_lots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'cultivador'))
  );

DROP POLICY IF EXISTS "medical_stock_secretaria_select" ON medical_stock_lots;
CREATE POLICY "medical_stock_secretaria_select" ON medical_stock_lots
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ── TABLA: members ───────────────────────────────────────────
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

DROP TRIGGER IF EXISTS set_member_number ON members;
CREATE TRIGGER set_member_number
BEFORE INSERT ON members
FOR EACH ROW
WHEN (NEW.member_number IS NULL)
EXECUTE FUNCTION generate_member_number();

DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at
BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_gerente_secretaria_all" ON members;
CREATE POLICY "members_gerente_secretaria_all" ON members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

DROP POLICY IF EXISTS "members_cultivador_select" ON members;
CREATE POLICY "members_cultivador_select" ON members
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cultivador')
  );

-- ── TABLA: dispensations (INMUTABLE) ────────────────────────
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

DROP TRIGGER IF EXISTS set_dispensation_number ON dispensations;
CREATE TRIGGER set_dispensation_number
BEFORE INSERT ON dispensations
FOR EACH ROW
WHEN (NEW.dispensation_number IS NULL)
EXECUTE FUNCTION generate_dispensation_number();

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

DROP TRIGGER IF EXISTS dispensation_deduct_stock ON dispensations;
CREATE TRIGGER dispensation_deduct_stock
AFTER INSERT ON dispensations
FOR EACH ROW EXECUTE FUNCTION deduct_medical_stock();

CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Esta tabla es inmutable. No se permiten modificaciones ni eliminaciones.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_dispensation_update ON dispensations;
CREATE TRIGGER prevent_dispensation_update
BEFORE UPDATE ON dispensations
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

DROP TRIGGER IF EXISTS prevent_dispensation_delete ON dispensations;
CREATE TRIGGER prevent_dispensation_delete
BEFORE DELETE ON dispensations
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

ALTER TABLE dispensations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispensations_select_authenticated" ON dispensations;
CREATE POLICY "dispensations_select_authenticated" ON dispensations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dispensations_insert_gerente_secretaria" ON dispensations;
CREATE POLICY "dispensations_insert_gerente_secretaria" ON dispensations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

-- ── TABLA: commercial_products ───────────────────────────────
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

DROP TRIGGER IF EXISTS commercial_products_updated_at ON commercial_products;
CREATE TRIGGER commercial_products_updated_at
BEFORE UPDATE ON commercial_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE commercial_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_products_gerente_all" ON commercial_products;
CREATE POLICY "commercial_products_gerente_all" ON commercial_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "commercial_products_others_select" ON commercial_products;
CREATE POLICY "commercial_products_others_select" ON commercial_products
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

DROP POLICY IF EXISTS "commercial_products_secretaria_insert" ON commercial_products;
CREATE POLICY "commercial_products_secretaria_insert" ON commercial_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ── TABLA: sales ─────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS sale_deduct_stock ON sales;
CREATE TRIGGER sale_deduct_stock
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION deduct_commercial_stock();

DROP TRIGGER IF EXISTS sales_updated_at ON sales;
CREATE TRIGGER sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_gerente_all" ON sales;
CREATE POLICY "sales_gerente_all" ON sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "sales_secretaria_insert_select" ON sales;
CREATE POLICY "sales_secretaria_insert_select" ON sales
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

DROP POLICY IF EXISTS "sales_secretaria_insert" ON sales;
CREATE POLICY "sales_secretaria_insert" ON sales
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ── TABLA: cash_registers ────────────────────────────────────
-- NOTA: Se crea sin UNIQUE en register_date (se agrega en migration 009 con shift)
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_total NUMERIC(12,2) DEFAULT 0,
  actual_total NUMERIC(12,2),
  difference NUMERIC(12,2),
  status TEXT DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_registers_gerente_all" ON cash_registers;
CREATE POLICY "cash_registers_gerente_all" ON cash_registers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "cash_registers_secretaria_select" ON cash_registers;
CREATE POLICY "cash_registers_secretaria_select" ON cash_registers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ── TABLA: payments ──────────────────────────────────────────
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

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_gerente_all" ON payments;
CREATE POLICY "payments_gerente_all" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "payments_secretaria_insert_select" ON payments;
CREATE POLICY "payments_secretaria_insert_select" ON payments
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

DROP POLICY IF EXISTS "payments_secretaria_insert" ON payments;
CREATE POLICY "payments_secretaria_insert" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'secretaria')
  );

-- ── TABLA: supply_records ────────────────────────────────────
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

DROP TRIGGER IF EXISTS supply_records_updated_at ON supply_records;
CREATE TRIGGER supply_records_updated_at
BEFORE UPDATE ON supply_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE supply_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supply_records_gerente_all" ON supply_records;
CREATE POLICY "supply_records_gerente_all" ON supply_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

-- ── TABLA: events ────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_gerente_all" ON events;
CREATE POLICY "events_gerente_all" ON events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "events_others_select" ON events;
CREATE POLICY "events_others_select" ON events
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ── TABLA: event_attendees ───────────────────────────────────
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

DROP POLICY IF EXISTS "event_attendees_gerente_all" ON event_attendees;
CREATE POLICY "event_attendees_gerente_all" ON event_attendees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "event_attendees_others_select" ON event_attendees;
CREATE POLICY "event_attendees_others_select" ON event_attendees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('secretaria', 'cultivador'))
  );

-- ── TABLA: enrollment_requests ───────────────────────────────
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

DROP POLICY IF EXISTS "enrollment_requests_public_insert" ON enrollment_requests;
CREATE POLICY "enrollment_requests_public_insert" ON enrollment_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "enrollment_requests_staff_select" ON enrollment_requests;
CREATE POLICY "enrollment_requests_staff_select" ON enrollment_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

DROP POLICY IF EXISTS "enrollment_requests_staff_update" ON enrollment_requests;
CREATE POLICY "enrollment_requests_staff_update" ON enrollment_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gerente', 'secretaria'))
  );

-- ── TABLA: audit_logs (INMUTABLE) ───────────────────────────
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

DROP TRIGGER IF EXISTS prevent_audit_log_update ON audit_logs;
CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_delete ON audit_logs;
CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_gerente_select" ON audit_logs;
CREATE POLICY "audit_logs_gerente_select" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON audit_logs;
CREATE POLICY "audit_logs_authenticated_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── TABLA: app_config ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_gerente_all" ON app_config;
CREATE POLICY "app_config_gerente_all" ON app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente')
  );

DROP POLICY IF EXISTS "app_config_others_select" ON app_config;
CREATE POLICY "app_config_others_select" ON app_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid())
  );

-- ── AUDIT TRIGGER ────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS audit_members ON members;
CREATE TRIGGER audit_members
AFTER INSERT OR UPDATE OR DELETE ON members
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_sales ON sales;
CREATE TRIGGER audit_sales
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_dispensations ON dispensations;
CREATE TRIGGER audit_dispensations
AFTER INSERT ON dispensations
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── TRIGGER: crear profile automático al registrar usuario ───
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Datos iniciales: app_config ──────────────────────────────
INSERT INTO app_config (key, value, description) VALUES
  ('club_name', '"Jamrock Club"', 'Nombre del club'),
  ('membership_fee_default', '5000', 'Cuota mensual por defecto (ARS)'),
  ('low_stock_threshold_grams', '100', 'Umbral de stock medicinal bajo (gramos)'),
  ('max_dispensation_grams', '30', 'Máximo de gramos por dispensa mensual')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- MIGRATION 002 — Auto-expire REPROCANN vencidos (pg_cron)
-- REQUISITO: Extensión pg_cron habilitada en el Dashboard
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('auto-expire-reprocann')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-expire-reprocann'
);

SELECT cron.schedule(
  'auto-expire-reprocann',
  '0 0 * * *',
  $$
  UPDATE public.members
  SET
    reprocann_status = 'vencido',
    updated_at = NOW()
  WHERE
    reprocann_expiry < CURRENT_DATE
    AND reprocann_status NOT IN ('vencido', 'cancelado')
    AND is_deleted = false;
  $$
);


-- ============================================================
-- MIGRATION 003 — Cuentas Corrientes (socios y proveedores)
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id),
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES auth.users(id),
  CONSTRAINT chk_ca_entity_coherence CHECK (
    (entity_type = 'socio'     AND member_id   IS NOT NULL AND supplier_id IS NULL) OR
    (entity_type = 'proveedor' AND supplier_id IS NOT NULL AND member_id   IS NULL)
  )
);

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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cam_account_id  ON current_account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_cam_created_at  ON current_account_movements(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cam_source      ON current_account_movements(source_type, source_id) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cam_concept     ON current_account_movements(concept);

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

DROP TRIGGER IF EXISTS set_account_number ON current_accounts;
CREATE TRIGGER set_account_number
BEFORE INSERT ON current_accounts
FOR EACH ROW
WHEN (NEW.account_number IS NULL OR NEW.account_number = '')
EXECUTE FUNCTION generate_account_number();

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

DROP TRIGGER IF EXISTS set_movement_number ON current_account_movements;
CREATE TRIGGER set_movement_number
BEFORE INSERT ON current_account_movements
FOR EACH ROW
WHEN (NEW.movement_number IS NULL OR NEW.movement_number = '')
EXECUTE FUNCTION generate_movement_number();

DROP TRIGGER IF EXISTS prevent_movement_update ON current_account_movements;
CREATE TRIGGER prevent_movement_update
BEFORE UPDATE ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

DROP TRIGGER IF EXISTS prevent_movement_delete ON current_account_movements;
CREATE TRIGGER prevent_movement_delete
BEFORE DELETE ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE OR REPLACE FUNCTION calculate_and_update_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance      NUMERIC(12,2);
  v_credit_limit NUMERIC(12,2);
  v_new_balance  NUMERIC(12,2);
BEGIN
  SELECT balance, credit_limit
  INTO   v_balance, v_credit_limit
  FROM   current_accounts
  WHERE  id = NEW.account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta corriente no encontrada: %', NEW.account_id;
  END IF;

  IF NEW.movement_type = 'credito' THEN
    v_new_balance := v_balance + NEW.amount;
  ELSE
    v_new_balance := v_balance - NEW.amount;
  END IF;

  IF v_credit_limit > 0 AND v_new_balance < -v_credit_limit THEN
    RAISE EXCEPTION
      'Movimiento excede el límite de crédito. Saldo: %, Límite: %, Monto: %',
      v_balance, v_credit_limit, NEW.amount;
  END IF;

  NEW.balance_after := v_new_balance;

  UPDATE current_accounts
  SET    balance = v_new_balance
  WHERE  id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS calc_balance_before_movement ON current_account_movements;
CREATE TRIGGER calc_balance_before_movement
BEFORE INSERT ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION calculate_and_update_balance();

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

  IF v_account_id IS NULL THEN
    INSERT INTO current_accounts (entity_type, member_id, supplier_id)
    VALUES (p_entity_type, p_member_id, p_supplier_id)
    RETURNING id INTO v_account_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION payment_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id          UUID;
  v_original_movement_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    v_account_id := get_or_create_account('socio', NEW.member_id, NULL);
    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id, 'credito', NEW.amount, 0,
      COALESCE(NEW.concept, 'pago'),
      'Pago: ' || COALESCE(NEW.concept, '') || CASE WHEN NEW.notes IS NOT NULL THEN ' — ' || NEW.notes ELSE '' END,
      'payment', NEW.id, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    SELECT id INTO v_account_id
    FROM   current_accounts
    WHERE  member_id = NEW.member_id AND is_deleted = false;
    IF v_account_id IS NOT NULL THEN
      SELECT id INTO v_original_movement_id
      FROM   current_account_movements
      WHERE  source_type = 'payment' AND source_id = OLD.id AND movement_type = 'credito'
      ORDER BY created_at DESC LIMIT 1;
      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id, 'debito', OLD.amount, 0, 'reversal',
        'Anulación de pago — concepto: ' || COALESCE(OLD.concept, ''),
        'reversal', OLD.id, v_original_movement_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_to_cc ON payments;
CREATE TRIGGER trg_payment_to_cc
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION payment_to_cc_movement();

CREATE OR REPLACE FUNCTION supply_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id           UUID;
  v_original_movement_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false
     AND NEW.total_cost IS NOT NULL AND NEW.total_cost > 0
  THEN
    v_account_id := get_or_create_account('proveedor', NULL, NEW.supplier_id);
    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id, 'debito', NEW.total_cost, 0, 'supply_record',
      COALESCE(NEW.description, 'Registro de compra a proveedor'),
      'supply_record', NEW.id, NEW.created_by
    );
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
      ORDER BY created_at DESC LIMIT 1;
      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id, 'credito', OLD.total_cost, 0, 'reversal',
        'Anulación de compra — ' || COALESCE(OLD.description, ''),
        'reversal', OLD.id, v_original_movement_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_supply_to_cc ON supply_records;
CREATE TRIGGER trg_supply_to_cc
AFTER INSERT OR UPDATE ON supply_records
FOR EACH ROW EXECUTE FUNCTION supply_to_cc_movement();

CREATE OR REPLACE FUNCTION sale_to_cc_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id           UUID;
  v_original_movement_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.member_id IS NOT NULL AND NEW.is_deleted = false THEN
    v_account_id := get_or_create_account('socio', NEW.member_id, NULL);
    INSERT INTO current_account_movements (
      account_id, movement_type, amount, balance_after,
      concept, description, source_type, source_id, created_by
    ) VALUES (
      v_account_id, 'debito', NEW.total, 0, 'sale',
      'Venta comercial — $' || NEW.total::TEXT,
      'sale', NEW.id, NEW.created_by
    );
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
      ORDER BY created_at DESC LIMIT 1;
      INSERT INTO current_account_movements (
        account_id, movement_type, amount, balance_after,
        concept, description, source_type, source_id, reverses_id
      ) VALUES (
        v_account_id, 'credito', OLD.total, 0, 'reversal',
        'Anulación de venta — $' || OLD.total::TEXT,
        'reversal', OLD.id, v_original_movement_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sale_to_cc ON sales;
CREATE TRIGGER trg_sale_to_cc
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION sale_to_cc_movement();

DROP TRIGGER IF EXISTS set_updated_at_current_accounts ON current_accounts;
CREATE TRIGGER set_updated_at_current_accounts
BEFORE UPDATE ON current_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS audit_current_accounts ON current_accounts;
CREATE TRIGGER audit_current_accounts
AFTER INSERT OR UPDATE ON current_accounts
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_current_account_movements ON current_account_movements;
CREATE TRIGGER audit_current_account_movements
AFTER INSERT ON current_account_movements
FOR EACH ROW EXECUTE FUNCTION log_audit();

ALTER TABLE current_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_account_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ca_gerente_all ON current_accounts;
CREATE POLICY ca_gerente_all ON current_accounts FOR ALL USING (get_my_role() = 'gerente');

DROP POLICY IF EXISTS ca_secretaria_select ON current_accounts;
CREATE POLICY ca_secretaria_select ON current_accounts
  FOR SELECT USING (is_deleted = false AND get_my_role() = 'secretaria');

DROP POLICY IF EXISTS ca_secretaria_insert ON current_accounts;
CREATE POLICY ca_secretaria_insert ON current_accounts
  FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

DROP POLICY IF EXISTS cam_gerente_all ON current_account_movements;
CREATE POLICY cam_gerente_all ON current_account_movements FOR ALL USING (get_my_role() = 'gerente');

DROP POLICY IF EXISTS cam_secretaria_select ON current_account_movements;
CREATE POLICY cam_secretaria_select ON current_account_movements FOR SELECT USING (get_my_role() = 'secretaria');

DROP POLICY IF EXISTS cam_secretaria_insert ON current_account_movements;
CREATE POLICY cam_secretaria_insert ON current_account_movements FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

CREATE OR REPLACE VIEW v_account_statement AS
SELECT
  cam.id, cam.movement_number, cam.account_id, cam.movement_type,
  cam.amount, cam.balance_after, cam.concept, cam.description,
  cam.source_type, cam.source_id, cam.reverses_id, cam.created_at, cam.created_by,
  ca.account_number, ca.entity_type, ca.balance AS current_balance,
  ca.member_id, ca.supplier_id,
  CASE ca.entity_type
    WHEN 'socio'     THEN m.first_name || ' ' || m.last_name
    WHEN 'proveedor' THEN s.name
  END AS entity_name,
  CASE ca.entity_type WHEN 'socio' THEN m.member_number ELSE NULL END AS entity_number,
  CASE WHEN cam.movement_type = 'debito'  THEN cam.amount ELSE 0 END AS debe,
  CASE WHEN cam.movement_type = 'credito' THEN cam.amount ELSE 0 END AS haber,
  p.full_name AS created_by_name
FROM current_account_movements cam
JOIN current_accounts ca ON ca.id = cam.account_id
LEFT JOIN members  m ON m.id = ca.member_id
LEFT JOIN suppliers s ON s.id = ca.supplier_id
LEFT JOIN profiles  p ON p.id = cam.created_by
ORDER BY cam.created_at DESC;


-- ============================================================
-- MIGRATION 004 — Checkout unificado (dispensa + productos + pago)
-- ============================================================

CREATE TABLE IF NOT EXISTS checkout_transactions (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number     TEXT        UNIQUE NOT NULL,
  member_id              UUID        NOT NULL REFERENCES members(id),
  dispensation_id        UUID        REFERENCES dispensations(id),
  dispensation_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  products_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status         TEXT        NOT NULL DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente', 'pagado', 'fiado', 'parcial')),
  payment_method         TEXT
    CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3')),
  amount_paid            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_cash            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_transfer        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_charged_to_cc   NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_given           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_id             UUID        REFERENCES payments(id),
  cc_movement_id         UUID        REFERENCES current_account_movements(id),
  transfer_detail        TEXT,
  transfer_amount_received NUMERIC(12,2) DEFAULT 0,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID        REFERENCES auth.users(id),
  is_deleted             BOOLEAN     NOT NULL DEFAULT false,
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_member_id      ON checkout_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_checkout_created_at     ON checkout_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_payment_status ON checkout_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_checkout_not_deleted    ON checkout_transactions(id) WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS checkout_items (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   UUID        NOT NULL REFERENCES checkout_transactions(id) ON DELETE CASCADE,
  product_id       UUID        NOT NULL REFERENCES commercial_products(id),
  product_name     TEXT        NOT NULL,
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(10,2) NOT NULL,
  subtotal         NUMERIC(12,2) NOT NULL,
  sale_id          UUID        REFERENCES sales(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_items_transaction_id ON checkout_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_checkout_items_product_id     ON checkout_items(product_id);

CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('checkout_transactions_seq'));
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM checkout_transactions;
  NEW.transaction_number := 'TXN-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_transaction_number ON checkout_transactions;
CREATE TRIGGER set_transaction_number
BEFORE INSERT ON checkout_transactions
FOR EACH ROW
WHEN (NEW.transaction_number IS NULL OR NEW.transaction_number = '')
EXECUTE FUNCTION generate_transaction_number();

DROP TRIGGER IF EXISTS set_updated_at_checkout ON checkout_transactions;
CREATE TRIGGER set_updated_at_checkout
BEFORE UPDATE ON checkout_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS audit_checkout_transactions ON checkout_transactions;
CREATE TRIGGER audit_checkout_transactions
AFTER INSERT OR UPDATE ON checkout_transactions
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_checkout_items ON checkout_items;
CREATE TRIGGER audit_checkout_items
AFTER INSERT ON checkout_items
FOR EACH ROW EXECUTE FUNCTION log_audit();

ALTER TABLE checkout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_items        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_gerente_all" ON checkout_transactions;
CREATE POLICY "ct_gerente_all" ON checkout_transactions FOR ALL USING (get_my_role() = 'gerente');

DROP POLICY IF EXISTS "ct_secretaria_select" ON checkout_transactions;
CREATE POLICY "ct_secretaria_select" ON checkout_transactions
  FOR SELECT USING (is_deleted = false AND get_my_role() = 'secretaria');

DROP POLICY IF EXISTS "ct_secretaria_insert" ON checkout_transactions;
CREATE POLICY "ct_secretaria_insert" ON checkout_transactions
  FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

DROP POLICY IF EXISTS "ci_gerente_all" ON checkout_items;
CREATE POLICY "ci_gerente_all" ON checkout_items FOR ALL
  USING (EXISTS (SELECT 1 FROM checkout_transactions ct WHERE ct.id = checkout_items.transaction_id)
         AND get_my_role() = 'gerente');

DROP POLICY IF EXISTS "ci_secretaria_select" ON checkout_items;
CREATE POLICY "ci_secretaria_select" ON checkout_items FOR SELECT USING (get_my_role() = 'secretaria');

DROP POLICY IF EXISTS "ci_secretaria_insert" ON checkout_items;
CREATE POLICY "ci_secretaria_insert" ON checkout_items FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

INSERT INTO app_config (key, value, description) VALUES
  ('dispensation_price_per_gram', '{"enabled": false, "price": 0}',
   'Precio por gramo de dispensa medicinal. enabled=false = sin costo para el socio.'),
  ('checkout_allow_credit', '{"enabled": true}',
   'Si enabled=true, el operador puede cargar el checkout a cuenta corriente del socio.'),
  ('checkout_show_cc_balance', '{"enabled": true}',
   'Si enabled=true, mostrar el saldo de la cuenta corriente del socio durante el checkout.')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- MIGRATION 005 — Precios en dispensas
-- ============================================================
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS price_per_gram  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS subtotal         NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS discount_percent INTEGER       DEFAULT 0
  CHECK (discount_percent IN (0, 5, 10, 15, 20, 25));
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS payment_method   TEXT
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3', 'cuenta_corriente'));
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'sin_cargo'
  CHECK (payment_status IN ('sin_cargo', 'pagado', 'fiado'));


-- ============================================================
-- MIGRATION 006 — Precio de venta por gramo en lotes
-- ============================================================
ALTER TABLE medical_stock_lots
  ADD COLUMN IF NOT EXISTS price_per_gram NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN medical_stock_lots.price_per_gram
  IS 'Precio de venta al socio por gramo. 0 = gratis/sin cargo.';


-- ============================================================
-- MIGRATION 007 — Pago mixto 3 vías + Turnos de caja
-- ============================================================

-- Actualizar constraints de payment_method en tablas existentes
ALTER TABLE checkout_transactions DROP CONSTRAINT IF EXISTS checkout_transactions_payment_method_check;
ALTER TABLE checkout_transactions ADD CONSTRAINT checkout_transactions_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3'));

ALTER TABLE dispensations DROP CONSTRAINT IF EXISTS dispensations_payment_method_check;
ALTER TABLE dispensations ADD CONSTRAINT dispensations_payment_method_check
  CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto', 'mixto_3', 'cuenta_corriente'));

-- Turnos en caja
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'mañana'
  CHECK (shift IN ('mañana', 'tarde'));

ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_date_shift_unique
  UNIQUE (register_date, shift);


-- ============================================================
-- MIGRATION 008 — Activity log
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity      ON activity_log(entity);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id     ON activity_log(user_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated USING (true);


-- ============================================================
-- MIGRATION 009 — Fix FKs de cash_registers
-- (Las FKs ya apuntan a profiles en este schema consolidado)
-- ============================================================
UPDATE cash_registers
SET difference = actual_total - expected_total
WHERE status = 'cerrada' AND actual_total IS NOT NULL;


-- ============================================================
-- MIGRATION 010 — Búsqueda de socios sin acentos
-- ============================================================
CREATE OR REPLACE FUNCTION search_members(query TEXT)
RETURNS SETOF members
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM members
  WHERE is_deleted = false
    AND (
      unaccent(first_name) ILIKE '%' || unaccent(query) || '%'
      OR unaccent(last_name) ILIKE '%' || unaccent(query) || '%'
      OR dni = query
      OR member_number ILIKE '%' || query || '%'
      OR qr_code = query
    )
  ORDER BY first_name
  LIMIT 10;
$$;


-- ============================================================
-- MIGRATION 011 — Egresos de caja
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_register_expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES cash_registers(id),
  category    TEXT NOT NULL CHECK (category IN (
    'sueldo', 'limpieza', 'servicios', 'alquiler',
    'mantenimiento', 'compras', 'retiro', 'otro'
  )),
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id),
  is_deleted  BOOLEAN DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at  ON cash_register_expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_register_id ON cash_register_expenses(register_id);

ALTER TABLE cash_register_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gerente_can_manage_expenses" ON cash_register_expenses;
CREATE POLICY "gerente_can_manage_expenses" ON cash_register_expenses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerente'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerente'));

DROP POLICY IF EXISTS "secretaria_can_view_expenses" ON cash_register_expenses;
CREATE POLICY "secretaria_can_view_expenses" ON cash_register_expenses
  FOR SELECT TO authenticated
  USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'secretaria'))
  );


-- ============================================================
-- MIGRATION 012 — Lotes tercerizados
-- ============================================================
ALTER TABLE medical_stock_lots
  ADD COLUMN IF NOT EXISTS is_outsourced           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS outsourced_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS cost_total              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sale_price_total        NUMERIC(12,2);


-- ============================================================
-- MIGRATION 013 — Sesiones de trabajo por operador
-- ============================================================
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

DROP TRIGGER IF EXISTS set_session_duration ON work_sessions;
CREATE TRIGGER set_session_duration
BEFORE UPDATE ON work_sessions
FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_sessions_select" ON work_sessions;
CREATE POLICY "work_sessions_select" ON work_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente')
  );

DROP POLICY IF EXISTS "work_sessions_insert" ON work_sessions;
CREATE POLICY "work_sessions_insert" ON work_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_sessions_update" ON work_sessions;
CREATE POLICY "work_sessions_update" ON work_sessions
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente')
  );

INSERT INTO app_config (key, value, description)
VALUES ('hourly_rate_secretaria', '{"amount": 0, "currency": "ARS"}', 'Tarifa por hora para secretarias (ARS)')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- VERIFICACIÓN FINAL
-- Correr esto al final para confirmar que todo quedó bien:
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
--
-- Deberías ver:
--   activity_log, app_config, audit_logs, cash_register_expenses,
--   cash_registers, checkout_items, checkout_transactions,
--   commercial_products, current_account_movements, current_accounts,
--   dispensations, enrollment_requests, event_attendees, events,
--   medical_stock_lots, members, payments, profiles,
--   sales, supply_records, suppliers, work_sessions
-- ============================================================
