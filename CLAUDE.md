# CLAUDE.md — Jamrock Club

> Este archivo es el contexto completo para Claude Code. Léelo antes de escribir cualquier línea de código.

---

## Resumen del Proyecto

**Jamrock Club** es un sistema de gestión digital para una asociación civil cannábica regulada en Argentina. Reemplaza planillas Excel que manejan socios con estados REPROCANN, dispensas medicinales inmutables, stock medicinal/comercial, cuentas corrientes, facturación con etiquetado automático, eventos, proveedores y reportes.

| Campo | Valor |
|-------|-------|
| Cliente | Jamrock Club — Asociación Civil |
| Stack | Next.js 14 (App Router) + Supabase + n8n + Telegram |
| Repo | https://github.com/martinnpascual/jamrock |
| Deploy | Vercel (app) + Railway (n8n) |
| Responsable | Edu (dev) / Martin (supervisión) |
| Sede | San Lorenzo 426 (única) |

---

## Stack Técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js 14 (App Router) | 14.2.x |
| Backend | Supabase directo + API routes | — |
| DB | Supabase PostgreSQL | 15 |
| Auth | Supabase Auth | — |
| Estilos | Tailwind CSS + shadcn/ui | 3.x |
| Validación | Zod | 3.x |
| Data fetching | TanStack Query | 5.x |
| QR | qrcode (npm) | — |
| PDF | @react-pdf/renderer | — |
| Automatización | n8n (Railway) | — |
| Notificaciones | Telegram Bot API | — |

---

## Reglas Fundamentales — NUNCA ROMPER

1. **`SUPABASE_SERVICE_ROLE_KEY` NUNCA en frontend.** Solo en API routes (`/app/api/`). Nunca importar en componentes cliente.
2. **RLS obligatorio** en TODAS las tablas. Sin excepción. Cada tabla debe tener políticas configuradas ANTES de ser usada.
3. **Soft deletes** en todas las tablas excepto las inmutables. Campos: `is_deleted BOOLEAN DEFAULT false`, `deleted_at TIMESTAMPTZ`, `deleted_by UUID`. Nunca `DELETE FROM`.
4. **Dispensas INMUTABLES** — La tabla `dispensations` NO permite UPDATE ni DELETE (ni por RLS ni por trigger). Para "corregir" una dispensa errónea se crea un registro de anulación (nueva fila con `type = 'anulacion'`).
5. **Audit logs INMUTABLES** — La tabla `audit_logs` es INSERT-only. Misma regla que dispensas.
6. **Tablet-first** — Layout optimizado para 1024px. Desktop secundario, mobile terciario.
7. **Flujo dispensa < 60 segundos** — QR → verificación automática → cantidad → confirmar → registrado.
8. **Colores por estado** — Verde (#22c55e, activo/OK), Amarillo (#eab308, pendiente/atención), Rojo (#ef4444, vencido/bloqueado).
9. **Datos sensibles de salud** — No loggear datos de socios en consola. No en URLs. No en error messages. RLS estricto.
10. **Campos de auditoría** en todas las tablas: `created_at`, `updated_at`, `created_by`. Las inmutables solo `created_at` y `created_by`.
11. **IDs legibles** — Socios: `SOC-0001`, Dispensas: `DISP-0001`. Generados por trigger PostgreSQL.
12. **TypeScript estricto** + Zod para validación de formularios y API.
13. **Loading, empty y error states** en TODAS las vistas. No hay vista sin skeleton/spinner, empty state con CTA, y error boundary.
14. **La `condicion` NUNCA se ingresa manualmente** — es siempre un campo calculado por la base de datos a partir de `reprocann_status`, `cultivador` y `domicilio_cultivo`.
15. **Solo REPROCANN Vigente puede dispensar** — validado por trigger en PostgreSQL antes de INSERT en `dispensations`.

---

## Lógica de Negocio Central

### Estados REPROCANN (`reprocann_status`)

| Valor | Significado |
|-------|------------|
| `vigente` | REPROCANN activo y al día |
| `en_tramite` | Trámite iniciado, pendiente de aprobación |
| `iniciar` | Aún no inició el trámite |
| `no_tramita` | Decidió no tramitar REPROCANN |
| `baja` | Dado de baja del club |
| `no_aplica` | No puede tramitar REPROCANN (ej: médico del club) — no se dispensa |

### Cultivador (`cultivador`)

| Valor | Significado |
|-------|------------|
| `jamrock` | El club cultiva por el socio |
| `autocultivo` | El socio cultiva en su domicilio |
| `otro` | Otro cultivador autorizado |

### Domicilio de Cultivo (`domicilio_cultivo`)

| Valor | Significado |
|-------|------------|
| `san_lorenzo_426` | Sede principal del club |
| `villa_allende` | Domicilio de cultivo secundario |
| `personal` | Domicilio particular del socio |

### Condición — Campo Calculado (NUNCA editar manualmente)

| Condición | Regla |
|-----------|-------|
| `delegacion_sistema_vigente` | reprocann=`vigente` + cultivador=`jamrock` |
| `delegacion_sistema_en_tramite` | reprocann=`en_tramite` + cultivador=`jamrock` |
| `delegacion_sistema_pendiente` | reprocann=`iniciar` + cultivador=`jamrock` |
| `delegacion_contrato_vigente` | reprocann=`vigente` + cultivador=`autocultivo`/`otro` + domicilio=`san_lorenzo_426`/`villa_allende` |
| `reiniciar` | reprocann=`en_tramite`/`iniciar` + cultivador=`autocultivo`/`otro` + domicilio=`san_lorenzo_426`/`villa_allende` |
| `no_delega` | reprocann=`vigente`/`en_tramite`/`iniciar` + cultivador=`autocultivo`/`otro` + domicilio=`personal` |
| `no_tramita_reprocann` | reprocann=`no_tramita` |
| `asociado_baja` | reprocann=`baja` |
| `no_aplica` | reprocann=`no_aplica` |

### Flag Dispensa (calculado)
```
can_dispense = (reprocann_status = 'vigente')
```
Solo socios con REPROCANN Vigente pueden recibir dispensas. Validado por trigger PostgreSQL.

### Flag Transferencia (calculado)
```
can_transfer = (condicion IN ('delegacion_sistema_vigente', 'delegacion_contrato_vigente'))
```

### Tipos de Socio (`member_type`)

| Valor | Descripción |
|-------|-------------|
| `basico` | Socio estándar |
| `administrativo` | Staff del club |
| `autoridad` | Autoridad del club |
| `ninguno` | Sin tipo (baja) |

### Cuotas y Monedas
- **Afiliación:** $20,000 ARS (fee único al ingresar)
- **Cuota mensual:** configurable en `app_config`
- **Monedas:** ARS y USD — tipo de cambio ingresado manualmente cada día en `exchange_rates`

---

## Reglas de Facturación (Etiquetado Automático)

El sistema genera la descripción que el operador copia y pega en el sistema externo de facturación. No hay integración AFIP directa.

### Transferencias bancarias / billetera virtual

- Condición = `delegacion_sistema_vigente` → **"Servicios de Asociaciones N.C.P. - Aporte para atender gastos sociales"**
- Condición ≠ `delegacion_sistema_vigente` → **"Servicios de Asociaciones N.C.P. - Contribución para atender gastos sociales"**
- Pago de cuota social (mensual/anual/afiliación) → **"Servicios de Asociaciones N.C.P. - Pago Cuota Social - Mensualidad/Anualidad/Afiliación (Según Corresponda)"**

### Efectivo

Solo se factura la parte de Cuota Social. Las ventas de productos en efectivo NO generan factura.

### Múltiples conceptos en un pago (transferencia)

Las etiquetas se combinan. Ejemplo — "No Delega" paga afiliación + producto:
→ **"Servicios de Asociaciones N.C.P. - Pago Cuota Social - Afiliación y Mensualidad - Contribución para atender gastos sociales"**

### Período Desde / Hasta

| Tipo de pago | Desde | Hasta |
|-------------|-------|-------|
| Anualidad | 01/01/YYYY | 31/12/YYYY |
| Cualquier otro caso | fecha del pago | fecha del pago |

---

## Estructura del Proyecto

```
jamrock/
├── .planning/
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   └── STATE.md
├── CLAUDE.md                         # Este archivo
├── PROMPT_CLAUDECODE.md              # Prompt maestro con toda la lógica detallada
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
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/                   # Sidebar, Header
│   │   ├── forms/
│   │   ├── tables/                   # DataTable con filtros
│   │   └── shared/
│   │       ├── StatusBadge.tsx
│   │       ├── CondicionBadge.tsx    # Badge con los 9 estados de condición
│   │       ├── QRScanner.tsx
│   │       └── BillingDescriptionCopy.tsx  # Copy-paste de descripción de factura
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # createBrowserClient (anon_key)
│   │   │   ├── server.ts             # createServerClient (SSR)
│   │   │   └── admin.ts              # createServiceClient (service_role — SOLO API routes)
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── billing.ts                # Lógica de etiquetado de facturas
│   │   └── validations/              # Schemas Zod por entidad
│   ├── hooks/
│   │   ├── useMembers.ts
│   │   ├── useDispensations.ts
│   │   ├── useRole.ts
│   │   └── useExchangeRate.ts
│   ├── types/
│   └── middleware.ts
├── supabase/
│   └── migrations/
├── .env.local
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Base de Datos — Schema Completo

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
-- SIN updated_at, SIN is_deleted, SIN deleted_at — RLS: DENY UPDATE, DENY DELETE
```

### Función compute_condicion (crear ANTES de la tabla members)
```sql
CREATE OR REPLACE FUNCTION compute_condicion(
  p_reprocann TEXT, p_cultivador TEXT, p_domicilio_cultivo TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_reprocann = 'baja'       THEN RETURN 'asociado_baja'; END IF;
  IF p_reprocann = 'no_tramita' THEN RETURN 'no_tramita_reprocann'; END IF;
  IF p_reprocann = 'no_aplica'  THEN RETURN 'no_aplica'; END IF;
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
```

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
  member_number TEXT UNIQUE NOT NULL,        -- SOC-0001 (trigger)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  cuit TEXT,                                 -- para facturación
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
  -- Condición calculada (GENERATED ALWAYS — nunca editar)
  condicion TEXT GENERATED ALWAYS AS (
    compute_condicion(reprocann_status, cultivador, domicilio_cultivo)
  ) STORED,
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
-- Flags derivados (no son columnas): can_dispense = reprocann_status='vigente'
--   can_transfer = condicion IN ('delegacion_sistema_vigente','delegacion_contrato_vigente')
```

### Tabla: dispensations (INMUTABLE)
```sql
CREATE TABLE dispensations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispensation_number TEXT UNIQUE NOT NULL,  -- DISP-0001 (trigger)
  member_id UUID NOT NULL REFERENCES members(id),
  quantity_grams NUMERIC(8,2) NOT NULL CHECK (quantity_grams > 0),
  genetics TEXT NOT NULL,
  lot_id UUID REFERENCES medical_stock_lots(id),
  type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'anulacion')),
  nullifies_id UUID REFERENCES dispensations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
  -- SIN updated_at, SIN is_deleted, SIN deleted_at
);
-- RLS: INSERT solo gerente/secretaria. SELECT todos autenticados. NO UPDATE. NO DELETE.
-- Trigger: DENY UPDATE, DENY DELETE
-- Trigger: generar DISP-XXXX
-- Trigger: validar reprocann_status='vigente' antes de INSERT (error si no)
-- Trigger: descontar stock de medical_stock_lots
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
  -- Precios por tipo de socio/condición
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
-- Ingreso manual diario. La app usa el rate más reciente si no hay uno hoy.
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
  total_usd NUMERIC(10,2),
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
    CHECK (concept IN ('afiliacion', 'cuota_mensual', 'cuota_anual', 'venta', 'otro')),
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  -- Facturación (generado automáticamente por lib/billing.ts)
  billing_description TEXT,
  billing_from DATE,
  billing_to DATE,
  is_billable BOOLEAN DEFAULT false,
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
  -- Tabla pública: sin created_by (formulario sin login)
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
  -- INMUTABLE: NO UPDATE, NO DELETE
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

## Roles y Permisos

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

**Implementación:**
- `profiles.role` determina el rol del usuario
- Middleware en `middleware.ts` redirige según rol
- RLS policies en Supabase filtran por rol
- Componentes usan hook `useRole()` para condicionar UI

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # ⚠️ SOLO en /app/api/ — NUNCA en componentes cliente

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Jamrock Club
```

---

## Estado Actual y Roadmap

### Estado: Fase 1, Wave 0 (Setup) — EMPEZAR POR WAVE 1.1

### Wave 1.1 — Setup + Auth ← EMPEZAR AQUÍ
1. Crear estructura Next.js 14 + TypeScript estricto
2. Instalar dependencias: `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss`, `shadcn/ui`, `zod`, `@tanstack/react-query`, `qrcode`, `@react-pdf/renderer`
3. Configurar Tailwind con tokens (verde/amarillo/rojo)
4. Configurar Supabase clients (browser, server, admin)
5. Crear tabla `profiles` con roles
6. Login/logout con Supabase Auth
7. Middleware de protección por rol
8. Layout base: sidebar + contenido (tablet-first 1024px)
9. Deploy inicial a Vercel

### Wave 1.2 — Base de datos completa
- Migrations para TODAS las tablas (ver schemas arriba)
- Función `compute_condicion` + columna GENERATED en `members`
- Todos los triggers: IDs legibles, inmutabilidad, validación dispensa, descuento stock
- RLS policies en cada tabla
- `exchange_rates` con UI de carga diaria
- Datos iniciales en `app_config`

### Wave 1.3 — Gestión de Socios
- CRUD completo con condición calculada visible en tiempo real
- Badges de condición y REPROCANN con colores
- IDs SOC-0001, QR único, carnet PDF
- Búsqueda global, ficha con historial, filtros
- Importación desde Excel (migración del sistema actual)

### Wave 1.4 — Dispensas
- Flujo QR → verificación → cantidad → confirmar (< 60 seg)
- Bloqueo si REPROCANN no es Vigente
- Registro inmutable DISP-0001 + descuento de stock

### Wave 1.5 — Stock Medicinal
- CRUD de lotes por genética, vista en gramos, alertas de stock bajo

### Wave 1.6 — Ventas y Caja
- Catálogo con precios por tipo de socio
- Multi-moneda ARS/USD, apertura/cierre de caja

### Wave 1.7 — Pagos y Facturación
- Registro de pagos, generación de descripción de factura (copy-paste)
- Cuenta corriente por socio, período Desde/Hasta automático

### Wave 1.8 — Dashboard + Inscripción Pública
### Wave 1.9 — Reportes
### Wave 2.0 — n8n + Telegram

---

## Patrones de Código

### Supabase Client
```typescript
// lib/supabase/client.ts — BROWSER (anon_key)
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/admin.ts — API ROUTES ONLY (service_role_key)
import { createClient } from '@supabase/supabase-js'
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
```

### Soft Delete (NUNCA usar .delete())
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

### CondicionBadge Component
```typescript
// components/shared/CondicionBadge.tsx
const condicionConfig = {
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

---

## Diseño Visual

- **Fondo:** slate-50 (#f8fafc)
- **Sidebar:** slate-900 (#0f172a)
- **Primario:** green-600 (#16a34a)
- **Estados:** Verde (#22c55e), Amarillo (#eab308), Rojo (#ef4444)
- **Fuente:** Inter (sans-serif)
- **Border radius:** 8px (rounded-lg)
- **Sombras:** shadow-sm para cards
- **Componentes:** shadcn/ui como base

---

## Comandos

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run lint         # Linter
vercel --prod        # Deploy manual
```

---

## Al Completar Cada Wave

1. Actualizar `.planning/STATE.md` con tareas completadas
2. Marcar requerimientos como ✅ en `.planning/REQUIREMENTS.md`
3. Verificar que RLS esté activo en todas las tablas nuevas
4. Verificar que soft delete funcione en tablas no-inmutables
5. Verificar que audit_logs capture cambios en tablas críticas
6. Testear en viewport 1024px (tablet)
7. Verificar loading, empty y error states en todas las vistas nuevas
