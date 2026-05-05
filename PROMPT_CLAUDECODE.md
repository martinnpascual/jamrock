# PROMPT MAESTRO — Jamrock Club System
## Para usar directamente en Claude Code

> Copia y pega este archivo completo como contexto inicial en Claude Code antes de empezar cualquier tarea de desarrollo.

---

## 1. QUÉ ESTAMOS CONSTRUYENDO

**Jamrock Club** es un sistema de gestión digital para una asociación civil cannábica regulada en Argentina. Reemplaza planillas Excel que hoy manejan socios, dispensas medicinales, stock, ventas, cuentas corrientes, eventos y facturación.

**Sede única:** San Lorenzo 426 (y Villa Allende como domicilio de cultivo secundario).

---

## 2. STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript estricto |
| Backend | Supabase (PostgreSQL 15 + Auth + Storage) |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Validación | Zod 3 |
| Data fetching | TanStack Query 5 |
| QR | qrcode (npm) |
| PDF | @react-pdf/renderer |
| Automatización | n8n (Railway) |
| Notificaciones | Telegram Bot API |
| Deploy | Vercel (app) + Railway (n8n) |

**Repositorio:** https://github.com/martinnpascual/jamrock

---

## 3. REGLAS FUNDAMENTALES — NUNCA ROMPER

1. `SUPABASE_SERVICE_ROLE_KEY` NUNCA en frontend. Solo en `/app/api/`.
2. **RLS obligatorio** en TODAS las tablas, configurado ANTES de usar la tabla.
3. **Soft deletes** en todas las tablas no-inmutables: `is_deleted`, `deleted_at`, `deleted_by`. Nunca `DELETE FROM`.
4. **`dispensations` es INMUTABLE** — solo INSERT. Trigger que bloquea UPDATE y DELETE. Para anular una dispensa se crea una fila nueva con `type = 'anulacion'`.
5. **`audit_logs` es INMUTABLE** — solo INSERT.
6. **Tablet-first** — layout optimizado para 1024px.
7. **Flujo de dispensa < 60 segundos**: QR → verificación → cantidad → confirmar → registrado.
8. **Colores de estado**: Verde `#22c55e` (activo/OK), Amarillo `#eab308` (pendiente/atención), Rojo `#ef4444` (vencido/bloqueado).
9. No loggear datos sensibles de socios en consola. No en URLs. No en mensajes de error.
10. Campos de auditoría en todas las tablas: `created_at`, `updated_at`, `created_by`. Las inmutables solo `created_at` y `created_by`.
11. **IDs legibles**: Socios `SOC-0001`, Dispensas `DISP-0001` — generados por trigger PostgreSQL.
12. **Loading, empty y error states** en TODAS las vistas, sin excepción.
13. **TypeScript estricto + Zod** para formularios y API routes.

---

## 4. LÓGICA DE NEGOCIO CENTRAL

### 4.1 Estados REPROCANN (campo en `members`)

| Valor | Significado |
|-------|------------|
| `vigente` | REPROCANN activo y al día |
| `en_tramite` | Trámite iniciado, pendiente de aprobación |
| `iniciar` | Aún no inició el trámite |
| `no_tramita` | Decidió no tramitar REPROCANN |
| `baja` | Dado de baja del club |
| `no_aplica` | No puede tramitar REPROCANN (ej: médico del club) |

### 4.2 Cultivador (campo en `members`)

| Valor | Significado |
|-------|------------|
| `jamrock` | El club cultiva por el socio (delega cultivo) |
| `autocultivo` | El socio cultiva en su propio domicilio |
| `otro` | Otro cultivador autorizado |

### 4.3 Domicilio de Cultivo (campo en `members`)

| Valor | Significado |
|-------|------------|
| `san_lorenzo_426` | Sede principal del club |
| `villa_allende` | Domicilio de cultivo secundario |
| `personal` | Domicilio particular del socio |

### 4.4 Condición (CAMPO CALCULADO — nunca se ingresa manualmente)

La `condicion` se computa automáticamente en PostgreSQL mediante una función generada column o trigger BEFORE INSERT/UPDATE.

| Condición resultante | Regla |
|---------------------|-------|
| `delegacion_sistema_vigente` | reprocann=`vigente` + cultivador=`jamrock` |
| `delegacion_sistema_en_tramite` | reprocann=`en_tramite` + cultivador=`jamrock` |
| `delegacion_sistema_pendiente` | reprocann=`iniciar` + cultivador=`jamrock` |
| `delegacion_contrato_vigente` | reprocann=`vigente` + cultivador=`autocultivo`/`otro` + domicilio=`san_lorenzo_426`/`villa_allende` |
| `reiniciar` | reprocann=`en_tramite`/`iniciar` + cultivador=`autocultivo`/`otro` + domicilio=`san_lorenzo_426`/`villa_allende` |
| `no_delega` | reprocann=`vigente`/`en_tramite`/`iniciar` + cultivador=`autocultivo`/`otro` + domicilio=`personal` |
| `no_tramita_reprocann` | reprocann=`no_tramita` (independiente de cultivador/domicilio) |
| `asociado_baja` | reprocann=`baja` |
| `no_aplica` | reprocann=`no_aplica` |

**Función SQL de cómputo:**
```sql
CREATE OR REPLACE FUNCTION compute_condicion(
  p_reprocann TEXT,
  p_cultivador TEXT,
  p_domicilio_cultivo TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_reprocann = 'baja' THEN
    RETURN 'asociado_baja';
  END IF;
  IF p_reprocann = 'no_tramita' THEN
    RETURN 'no_tramita_reprocann';
  END IF;
  IF p_reprocann = 'no_aplica' THEN
    RETURN 'no_aplica';
  END IF;
  IF p_cultivador = 'jamrock' THEN
    IF p_reprocann = 'vigente' THEN RETURN 'delegacion_sistema_vigente'; END IF;
    IF p_reprocann = 'en_tramite' THEN RETURN 'delegacion_sistema_en_tramite'; END IF;
    IF p_reprocann = 'iniciar' THEN RETURN 'delegacion_sistema_pendiente'; END IF;
  END IF;
  IF p_cultivador IN ('autocultivo', 'otro') THEN
    IF p_domicilio_cultivo IN ('san_lorenzo_426', 'villa_allende') THEN
      IF p_reprocann = 'vigente' THEN RETURN 'delegacion_contrato_vigente'; END IF;
      IF p_reprocann IN ('en_tramite', 'iniciar') THEN RETURN 'reiniciar'; END IF;
    END IF;
    IF p_domicilio_cultivo = 'personal' THEN
      IF p_reprocann IN ('vigente', 'en_tramite', 'iniciar') THEN RETURN 'no_delega'; END IF;
    END IF;
  END IF;
  RETURN 'no_aplica';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 4.5 Flag Dispensa (calculado)

```
can_dispense = (reprocann_status = 'vigente')
```

Solo socios con REPROCANN **Vigente** pueden recibir dispensas. Cualquier otro estado bloquea el flujo.

### 4.6 Flag Transferencia (calculado)

```
can_transfer = (condicion IN ('delegacion_sistema_vigente', 'delegacion_contrato_vigente'))
```

Solo los socios con estas dos condiciones pueden facturar transferencias.

### 4.7 Tipos de Socio (campo `member_type`)

| Valor | Descripción |
|-------|-------------|
| `basico` | Socio estándar |
| `administrativo` | Staff / administrativo del club |
| `autoridad` | Autoridad del club |
| `ninguno` | Sin tipo (baja) |

### 4.8 Afiliación y Cuota

- **Cuota de afiliación:** $20,000 ARS (fee único al ingresar)
- **Cuota mensual:** configurable en `app_config`
- **Monedas:** ARS (pesos) y USD — tipo de cambio ingresado manualmente cada día en `exchange_rates`

---

## 5. REGLAS DE FACTURACIÓN (Etiquetado de descripciones)

El sistema genera automáticamente la descripción de factura que el operador copia y pega en el sistema externo de facturación (no hay integración AFIP — es copy-paste).

### 5.1 Transferencias bancarias / billetera virtual

Regla base por condición del socio:
- Condición = `delegacion_sistema_vigente` → **"Servicios de Asociaciones N.C.P. - Aporte para atender gastos sociales"**
- Condición ≠ `delegacion_sistema_vigente` → **"Servicios de Asociaciones N.C.P. - Contribución para atender gastos sociales"**

Regla especial — pago de cuota social (mensual, anual, afiliación), ya sea transferencia o efectivo:
- **"Servicios de Asociaciones N.C.P. - Pago Cuota Social - Mensualidad / Anualidad / Afiliación y Mensualidad / Afiliación y Anualidad (Según Corresponda)"**

### 5.2 Efectivo

Solo se factura la parte que corresponde a Cuota Social. Ventas de productos en efectivo NO generan factura.

### 5.3 Combinación de etiquetas (un pago, varias operaciones)

Cuando una transferencia incluye múltiples conceptos (ej: afiliación + compra de producto), se combinan las etiquetas. Ejemplo:
- Socio "No Delega" paga $50,000: $30,000 afiliación + mensualidad, $20,000 producto
- Descripción combinada: **"Servicios de Asociaciones N.C.P. - Pago Cuota Social - Afiliación y Mensualidad - Contribución para atender gastos sociales"**

Para efectivo con múltiples conceptos: solo se factura la parte de cuota social (se descarta la parte de productos).

### 5.4 Período Desde / Hasta

| Tipo de pago | Desde | Hasta |
|-------------|-------|-------|
| Anualidad | 01/01/YYYY | 31/12/YYYY |
| Mensualidad | fecha del pago | fecha del pago |
| Afiliación | fecha del pago | fecha del pago |
| Afiliación + mensualidad | fecha del pago | fecha del pago |
| Transferencia por producto | fecha del pago | fecha del pago |

### 5.5 Datos requeridos para facturar

- Nombre completo
- Apellido completo
- CUIT
- Método de pago (transferencia / efectivo)
- Moneda (ARS / USD)
- Monto
- Período Desde
- Período Hasta
- Descripción generada automáticamente

---

## 6. BASE DE DATOS — SCHEMA COMPLETO

### Campos estándar (tablas mutables)
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id),
is_deleted BOOLEAN DEFAULT false,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES auth.users(id)
```

### Campos tablas inmutables (dispensations, audit_logs)
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
created_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id)
-- SIN updated_at, SIN is_deleted, SIN deleted_at
```

---

### Tabla: profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('gerente', 'secretaria', 'cultivador')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: cada usuario ve su perfil. Gerente ve/edita todos.
```

### Tabla: members
```sql
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number TEXT UNIQUE NOT NULL,          -- SOC-0001 (trigger)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  cuit TEXT,                                   -- para facturación
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  member_type TEXT DEFAULT 'basico'
    CHECK (member_type IN ('basico', 'administrativo', 'autoridad', 'ninguno')),
  -- REPROCANN
  reprocann_status TEXT DEFAULT 'iniciar'
    CHECK (reprocann_status IN ('vigente', 'en_tramite', 'iniciar', 'no_tramita', 'baja', 'no_aplica')),
  reprocann_expiry DATE,
  reprocann_number TEXT,
  -- Cultivo
  cultivador TEXT DEFAULT 'jamrock'
    CHECK (cultivador IN ('jamrock', 'autocultivo', 'otro')),
  domicilio_cultivo TEXT DEFAULT 'san_lorenzo_426'
    CHECK (domicilio_cultivo IN ('san_lorenzo_426', 'villa_allende', 'personal')),
  -- Condición calculada (GENERATED o actualizada por trigger)
  condicion TEXT GENERATED ALWAYS AS (
    compute_condicion(reprocann_status, cultivador, domicilio_cultivo)
  ) STORED,
  -- Flags calculados (vistas o funciones, no columnas para evitar redundancia)
  -- can_dispense: reprocann_status = 'vigente'
  -- can_transfer: condicion IN ('delegacion_sistema_vigente', 'delegacion_contrato_vigente')
  -- QR y foto
  qr_code TEXT UNIQUE,
  photo_url TEXT,
  notes TEXT,
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
-- Trigger: generar member_number SOC-XXXX
-- Trigger: generar qr_code en INSERT
-- RLS: gerente y secretaria CRUD. cultivador solo SELECT.
```

### Tabla: dispensations (INMUTABLE)
```sql
CREATE TABLE dispensations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispensation_number TEXT UNIQUE NOT NULL,   -- DISP-0001 (trigger)
  member_id UUID NOT NULL REFERENCES members(id),
  quantity_grams NUMERIC(8,2) NOT NULL CHECK (quantity_grams > 0),
  genetics TEXT NOT NULL,
  lot_id UUID REFERENCES medical_stock_lots(id),
  type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'anulacion')),
  nullifies_id UUID REFERENCES dispensations(id),  -- si type='anulacion'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
-- RLS: INSERT solo gerente y secretaria. SELECT todos autenticados. NO UPDATE. NO DELETE.
-- Trigger: DENY UPDATE, DENY DELETE
-- Trigger: generar DISP-XXXX
-- Trigger: descontar stock de medical_stock_lots
-- VALIDACIÓN antes de INSERT: member.reprocann_status = 'vigente' (bloquear si no)
```

### Tabla: medical_stock_lots
```sql
CREATE TABLE medical_stock_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genetics TEXT NOT NULL,
  initial_grams NUMERIC(10,2) NOT NULL CHECK (initial_grams > 0),
  current_grams NUMERIC(10,2) NOT NULL CHECK (current_grams >= 0),
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
-- RLS: cultivador y gerente CRUD. Secretaria SELECT.
```

### Tabla: commercial_products
```sql
CREATE TABLE commercial_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  -- Precios por tipo de socio
  price_basico NUMERIC(10,2) NOT NULL,
  price_no_delega NUMERIC(10,2),
  price_administrativo NUMERIC(10,2),
  price_autoridad NUMERIC(10,2),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
-- Nota: el precio aplicado a una venta depende del member_type/condicion del socio
```

### Tabla: sales
```sql
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES commercial_products(id),
  member_id UUID REFERENCES members(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_ars NUMERIC(10,2) NOT NULL,
  total_usd NUMERIC(10,2),                    -- si se pagó en USD
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  currency TEXT DEFAULT 'ars' CHECK (currency IN ('ars', 'usd')),
  exchange_rate_id UUID REFERENCES exchange_rates(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
-- Trigger: descontar stock_quantity de commercial_products
```

### Tabla: exchange_rates
```sql
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  usd_to_ars NUMERIC(10,2) NOT NULL CHECK (usd_to_ars > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
-- Ingreso manual diario. La app busca el rate más reciente si no hay uno hoy.
```

### Tabla: payments
```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  amount_ars NUMERIC(10,2) NOT NULL,
  amount_usd NUMERIC(10,2),
  currency TEXT DEFAULT 'ars' CHECK (currency IN ('ars', 'usd')),
  exchange_rate_id UUID REFERENCES exchange_rates(id),
  concept TEXT NOT NULL
    CHECK (concept IN ('afiliacion', 'cuota_mensual', 'cuota_anual', 'venta', 'dispensa', 'otro')),
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  -- Para facturación (generado automáticamente)
  billing_description TEXT,                   -- texto generado por la función de etiquetado
  billing_from DATE,                          -- Desde
  billing_to DATE,                            -- Hasta
  is_billable BOOLEAN DEFAULT false,          -- si corresponde generar factura
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
```

### Tabla: suppliers
```sql
CREATE TABLE suppliers (
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
```

### Tabla: supply_records
```sql
CREATE TABLE supply_records (
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
```

### Tabla: cash_registers
```sql
CREATE TABLE cash_registers (
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
```

### Tabla: events
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT 'San Lorenzo 426',
  total_cost NUMERIC(12,2) DEFAULT 0,
  total_income NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planificado'
    CHECK (status IN ('planificado', 'activo', 'cerrado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
```

### Tabla: event_attendees
```sql
CREATE TABLE event_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id),
  member_id UUID NOT NULL REFERENCES members(id),
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, member_id)
);
```

### Tabla: enrollment_requests
```sql
CREATE TABLE enrollment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL,
  cuit TEXT,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  reprocann_status TEXT,
  reprocann_number TEXT,
  cultivador TEXT,
  domicilio_cultivo TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
  -- Pública: sin created_by (formulario sin login)
);
```

### Tabla: audit_logs (INMUTABLE)
```sql
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
-- Trigger automático en: members, dispensations, payments, sales, cash_registers
```

### Tabla: app_config
```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
-- Valores iniciales:
-- membership_fee: { "amount": 20000, "currency": "ars" }
-- monthly_fee: { "amount": XXXX, "currency": "ars" }
-- club_name: { "value": "Jamrock Club" }
-- club_address: { "value": "San Lorenzo 426" }
-- low_stock_threshold_grams: { "value": 100 }
```

---

## 7. TRIGGERS CRÍTICOS

### IDs legibles — members
```sql
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM members;
  NEW.member_number := 'SOC-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_member_number
BEFORE INSERT ON members
FOR EACH ROW WHEN (NEW.member_number IS NULL)
EXECUTE FUNCTION generate_member_number();
```

### IDs legibles — dispensations
```sql
CREATE OR REPLACE FUNCTION generate_dispensation_number()
RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(dispensation_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num FROM dispensations;
  NEW.dispensation_number := 'DISP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dispensation_number
BEFORE INSERT ON dispensations
FOR EACH ROW WHEN (NEW.dispensation_number IS NULL)
EXECUTE FUNCTION generate_dispensation_number();
```

### Inmutabilidad — dispensations
```sql
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Esta tabla es inmutable. No se permiten modificaciones ni eliminaciones.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_dispensation_update
BEFORE UPDATE ON dispensations FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_dispensation_delete
BEFORE DELETE ON dispensations FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

### Validación antes de dispensar
```sql
CREATE OR REPLACE FUNCTION validate_dispensation()
RETURNS TRIGGER AS $$
DECLARE member_record RECORD;
BEGIN
  SELECT reprocann_status, is_deleted INTO member_record
  FROM members WHERE id = NEW.member_id;

  IF member_record.is_deleted THEN
    RAISE EXCEPTION 'El socio está dado de baja.';
  END IF;
  IF member_record.reprocann_status != 'vigente' THEN
    RAISE EXCEPTION 'El socio no tiene REPROCANN Vigente. No puede recibir dispensas.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_before_dispensation
BEFORE INSERT ON dispensations FOR EACH ROW EXECUTE FUNCTION validate_dispensation();
```

### Descuento de stock al dispensar
```sql
CREATE OR REPLACE FUNCTION deduct_medical_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'normal' AND NEW.lot_id IS NOT NULL THEN
    UPDATE medical_stock_lots
    SET current_grams = current_grams - NEW.quantity_grams,
        updated_at = now()
    WHERE id = NEW.lot_id;

    IF (SELECT current_grams FROM medical_stock_lots WHERE id = NEW.lot_id) < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente para esta dispensa.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_dispensation_insert
AFTER INSERT ON dispensations FOR EACH ROW EXECUTE FUNCTION deduct_medical_stock();
```

---

## 8. FUNCIÓN DE ETIQUETADO DE FACTURAS

```sql
CREATE OR REPLACE FUNCTION generate_billing_description(
  p_condicion TEXT,
  p_concept TEXT,         -- 'afiliacion', 'cuota_mensual', 'cuota_anual', etc.
  p_payment_method TEXT,  -- 'efectivo', 'transferencia', 'mixto'
  p_include_product BOOLEAN DEFAULT false
) RETURNS TEXT AS $$
DECLARE
  cuota_label TEXT := 'Servicios de Asociaciones N.C.P. - Pago Cuota Social';
  transfer_label TEXT;
  result TEXT;
BEGIN
  -- Efectivo: solo facturar cuota social
  IF p_payment_method = 'efectivo' THEN
    IF p_concept IN ('afiliacion', 'cuota_mensual', 'cuota_anual') THEN
      RETURN cuota_label || ' - ' ||
        CASE p_concept
          WHEN 'afiliacion' THEN 'Afiliación'
          WHEN 'cuota_mensual' THEN 'Mensualidad'
          WHEN 'cuota_anual' THEN 'Anualidad'
        END;
    ELSE
      RETURN NULL; -- Efectivo por producto no genera factura
    END IF;
  END IF;

  -- Transferencia: etiqueta según condición
  IF p_condicion = 'delegacion_sistema_vigente' THEN
    transfer_label := 'Servicios de Asociaciones N.C.P. - Aporte para atender gastos sociales';
  ELSE
    transfer_label := 'Servicios de Asociaciones N.C.P. - Contribución para atender gastos sociales';
  END IF;

  -- Transferencia por cuota social
  IF p_concept IN ('afiliacion', 'cuota_mensual', 'cuota_anual') THEN
    result := cuota_label || ' - ' ||
      CASE p_concept
        WHEN 'afiliacion' THEN 'Afiliación'
        WHEN 'cuota_mensual' THEN 'Mensualidad'
        WHEN 'cuota_anual' THEN 'Anualidad'
      END;
    -- Si además incluye producto, combinar
    IF p_include_product THEN
      result := result || ' - ' ||
        CASE WHEN p_condicion = 'delegacion_sistema_vigente'
          THEN 'Aporte para atender gastos sociales'
          ELSE 'Contribución para atender gastos sociales'
        END;
    END IF;
    RETURN result;
  END IF;

  -- Transferencia solo por producto
  RETURN transfer_label;
END;
$$ LANGUAGE plpgsql;
```

---

## 9. ROLES Y PERMISOS

| Módulo | gerente | secretaria | cultivador |
|--------|---------|------------|------------|
| Dashboard | Completo | Operativo | Limitado |
| Socios | CRUD | CRUD | Solo ver |
| Dispensas | Ver + Crear | Crear | ❌ |
| Stock medicinal | CRUD | Solo ver | CRUD |
| Ventas / Caja | CRUD | Crear + Ver | ❌ |
| Pagos | CRUD | Crear + Ver | ❌ |
| Proveedores | CRUD | Solo ver | Solo ver |
| Eventos | CRUD | Solo ver | ❌ |
| Configuración | ✅ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ❌ |
| Facturación | ✅ | ✅ (copy-paste) | ❌ |

---

## 10. ESTRUCTURA DE CARPETAS

```
jamrock/
├── .planning/
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   └── STATE.md
├── CLAUDE.md
├── PROMPT_CLAUDECODE.md        ← este archivo
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   ├── socios/
│   │   │   ├── dispensas/
│   │   │   ├── stock/
│   │   │   ├── ventas/
│   │   │   ├── pagos/
│   │   │   ├── proveedores/
│   │   │   ├── eventos/
│   │   │   ├── calendario/
│   │   │   ├── reportes/
│   │   │   ├── solicitudes/
│   │   │   └── configuracion/
│   │   ├── (public)/
│   │   │   └── inscripcion/
│   │   ├── api/
│   │   │   ├── members/
│   │   │   ├── dispensations/
│   │   │   ├── enrollment/
│   │   │   ├── billing/
│   │   │   └── reports/
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── layout/             # Sidebar, Header
│   │   ├── forms/
│   │   ├── tables/             # DataTable con filtros
│   │   └── shared/
│   │       ├── StatusBadge.tsx
│   │       ├── CondicionBadge.tsx
│   │       ├── QRScanner.tsx
│   │       └── BillingDescriptionCopy.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # browser (anon_key)
│   │   │   ├── server.ts       # SSR (anon_key + cookies)
│   │   │   └── admin.ts        # API routes (service_role_key)
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── billing.ts          # lógica de etiquetado de facturas
│   │   └── validations/        # Zod schemas
│   ├── hooks/
│   │   ├── useMembers.ts
│   │   ├── useDispensations.ts
│   │   ├── useRole.ts
│   │   └── useExchangeRate.ts
│   └── types/
│       ├── members.ts
│       ├── dispensations.ts
│       └── billing.ts
├── supabase/
│   └── migrations/
├── .env.local
└── package.json
```

---

## 11. VARIABLES DE ENTORNO

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # ⚠️ SOLO /app/api/ — NUNCA en componentes cliente

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Jamrock Club
```

---

## 12. PATRONES DE CÓDIGO OBLIGATORIOS

### Supabase clients
```typescript
// lib/supabase/client.ts — BROWSER
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/admin.ts — API ROUTES ONLY
import { createClient } from '@supabase/supabase-js'
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
```

### Soft delete (NUNCA usar .delete())
```typescript
const softDelete = async (table: string, id: string, userId: string) => {
  return supabase.from(table).update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
  }).eq('id', id)
}

// Todas las queries SIEMPRE filtran:
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('is_deleted', false)  // ← OBLIGATORIO
```

### Condición badge
```typescript
// components/shared/CondicionBadge.tsx
const condicionConfig: Record<string, { label: string; color: string }> = {
  delegacion_sistema_vigente:    { label: 'Del. Sistema Vigente',    color: 'bg-green-100 text-green-800' },
  delegacion_contrato_vigente:   { label: 'Del. Contrato Vigente',   color: 'bg-green-100 text-green-800' },
  delegacion_sistema_en_tramite: { label: 'Del. Sistema En Trámite', color: 'bg-yellow-100 text-yellow-800' },
  delegacion_sistema_pendiente:  { label: 'Del. Sistema Pendiente',  color: 'bg-yellow-100 text-yellow-800' },
  reiniciar:                     { label: 'Reiniciar',               color: 'bg-yellow-100 text-yellow-800' },
  no_delega:                     { label: 'No Delega',               color: 'bg-blue-100 text-blue-800' },
  no_tramita_reprocann:          { label: 'No Tramita REPROCANN',    color: 'bg-gray-100 text-gray-800' },
  asociado_baja:                 { label: 'Dado de Baja',            color: 'bg-red-100 text-red-800' },
  no_aplica:                     { label: 'No Aplica',               color: 'bg-gray-100 text-gray-500' },
}
```

### Lógica de facturación (TypeScript)
```typescript
// lib/billing.ts
export type BillingConcept = 'afiliacion' | 'cuota_mensual' | 'cuota_anual' | 'venta' | 'otro'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto'
export type Condicion = 'delegacion_sistema_vigente' | 'delegacion_contrato_vigente' | string

export function generateBillingDescription(params: {
  condicion: Condicion
  concepts: BillingConcept[]
  paymentMethod: PaymentMethod
}): string | null {
  const { condicion, concepts, paymentMethod } = params
  const hasCuota = concepts.some(c => ['afiliacion', 'cuota_mensual', 'cuota_anual'].includes(c))
  const hasProduct = concepts.includes('venta')

  const cuotaLabel = buildCuotaLabel(concepts)
  const transferLabel = condicion === 'delegacion_sistema_vigente'
    ? 'Servicios de Asociaciones N.C.P. - Aporte para atender gastos sociales'
    : 'Servicios de Asociaciones N.C.P. - Contribución para atender gastos sociales'

  if (paymentMethod === 'efectivo') {
    return hasCuota ? `Servicios de Asociaciones N.C.P. - Pago Cuota Social - ${cuotaLabel}` : null
  }

  // Transferencia
  if (hasCuota && hasProduct) {
    const productLabel = condicion === 'delegacion_sistema_vigente'
      ? 'Aporte para atender gastos sociales'
      : 'Contribución para atender gastos sociales'
    return `Servicios de Asociaciones N.C.P. - Pago Cuota Social - ${cuotaLabel} - ${productLabel}`
  }
  if (hasCuota) {
    return `Servicios de Asociaciones N.C.P. - Pago Cuota Social - ${cuotaLabel}`
  }
  return transferLabel
}

export function generateBillingPeriod(concept: BillingConcept, paymentDate: Date): { from: Date; to: Date } {
  if (concept === 'cuota_anual') {
    const year = paymentDate.getFullYear()
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) }
  }
  return { from: paymentDate, to: paymentDate }
}
```

---

## 13. DISEÑO VISUAL

- **Fondo:** slate-50 (`#f8fafc`)
- **Sidebar:** slate-900 (`#0f172a`)
- **Color primario:** green-600 (`#16a34a`)
- **Estados:** Verde `#22c55e`, Amarillo `#eab308`, Rojo `#ef4444`
- **Tipografía:** Inter (sans-serif)
- **Border radius:** `rounded-lg` (8px)
- **Cards:** `shadow-sm`
- **Componentes base:** shadcn/ui

---

## 14. ROADMAP — WAVES DE DESARROLLO

### Wave 1.1 — Setup + Auth ← EMPEZAR AQUÍ
- [ ] Crear proyecto Next.js 14 con TypeScript estricto
- [ ] Instalar dependencias: `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss`, `shadcn/ui`, `zod`, `@tanstack/react-query`, `qrcode`, `@react-pdf/renderer`
- [ ] Configurar Tailwind con tokens (verde/amarillo/rojo)
- [ ] Configurar Supabase clients (browser, server, admin)
- [ ] Crear tabla `profiles` con roles
- [ ] Login/logout con Supabase Auth
- [ ] Middleware de protección por rol
- [ ] Layout base: sidebar + contenido (tablet-first 1024px)
- [ ] Deploy inicial a Vercel

### Wave 1.2 — Base de datos completa
- [ ] Migrations para TODAS las tablas listadas en sección 6
- [ ] Función `compute_condicion` (sección 4.4)
- [ ] Todos los triggers (sección 7)
- [ ] RLS policies para cada tabla
- [ ] Tabla `exchange_rates` con UI de carga diaria
- [ ] Datos iniciales en `app_config`

### Wave 1.3 — Gestión de Socios
- [ ] CRUD completo de socios con todos los campos
- [ ] Condición calculada visible en tiempo real (no editable)
- [ ] Badges de condición y REPROCANN con colores
- [ ] IDs SOC-0001 (trigger)
- [ ] QR único por socio
- [ ] Carnet digital PDF exportable
- [ ] Búsqueda global por nombre, DNI, socio_number
- [ ] Ficha individual con historial de dispensas y pagos
- [ ] Vista lista con filtros (condición, tipo, REPROCANN)
- [ ] Importación desde Excel (migración del Excel actual)

### Wave 1.4 — Dispensas
- [ ] Flujo QR → verificación → cantidad → confirmar (< 60 segundos)
- [ ] Bloqueo automático si REPROCANN no está Vigente
- [ ] Registro inmutable con DISP-0001
- [ ] Descuento automático de stock medicinal
- [ ] Historial de dispensas por socio
- [ ] Anulación (nueva fila tipo `anulacion`)

### Wave 1.5 — Stock Medicinal
- [ ] CRUD de lotes por genética
- [ ] Vista de stock actual en gramos por genética
- [ ] Alerta de stock bajo configurable
- [ ] Historial de dispensas por lote

### Wave 1.6 — Ventas y Caja
- [ ] Catálogo de productos con precios por tipo de socio
- [ ] Registro de ventas con descuento de stock
- [ ] Soporte multi-moneda (ARS / USD con tipo de cambio del día)
- [ ] Apertura y cierre de caja diaria
- [ ] Vista de movimientos del día

### Wave 1.7 — Pagos y Facturación
- [ ] Registro de pagos por socio (cuotas, ventas, otros)
- [ ] Generación automática de descripción de factura (sección 5)
- [ ] Componente copy-to-clipboard para la descripción de factura
- [ ] Cálculo automático de período Desde/Hasta
- [ ] Cuenta corriente por socio (saldo)
- [ ] Vista de pagos pendientes

### Wave 1.8 — Dashboard + Inscripción Pública
- [ ] Dashboard con KPIs del día
- [ ] Accesos rápidos por rol
- [ ] Formulario público de inscripción (sin login)
- [ ] Gestión interna de solicitudes de ingreso

### Wave 1.9 — Reportes + Exportaciones
- [ ] Reporte de socios activos
- [ ] Reporte de dispensas por período
- [ ] Reporte de caja
- [ ] Exportación a Excel/PDF

### Wave 2.0 — Automatizaciones n8n + Telegram
- [ ] Notificación Telegram al registrar una dispensa
- [ ] Alerta de stock bajo
- [ ] Recordatorio de cuotas vencidas
- [ ] Reporte diario automático

---

## 15. CHECKLIST AL COMPLETAR CADA WAVE

1. Actualizar `.planning/STATE.md`
2. Marcar requerimientos en `.planning/REQUIREMENTS.md`
3. Verificar RLS activo en tablas nuevas
4. Verificar soft delete funciona
5. Verificar audit_logs captura cambios en tablas críticas
6. Testear en viewport 1024px
7. Verificar loading, empty y error states en todas las vistas nuevas
