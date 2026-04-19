# CLAUDE.md — Jamrock Club

> Este archivo es el contexto completo para Claude Code. Léelo antes de escribir cualquier línea de código.

---

## Resumen del Proyecto

**Jamrock Club** es un sistema de gestión digital para un club cannábico (asociación civil regulada en Argentina). Gestiona socios con estados REPROCANN, dispensas medicinales inmutables, stock dual (medicinal/comercial), cuentas corrientes, eventos, proveedores y reportes.

| Campo | Valor |
|-------|-------|
| Cliente | Jamrock Club — Asociación Civil |
| Stack | Profile C: Next.js 14 (App Router) + Supabase + n8n + Telegram |
| Repo | https://github.com/martinnpascual/jamrock |
| Deploy | Vercel (app) + Railway (n8n) |
| Responsable | Edu (dev) / Martin (supervisión) |

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
4. **Dispensas INMUTABLES** — La tabla `dispensations` NO permite UPDATE ni DELETE (ni por RLS ni por trigger). Para "corregir" una dispensa errónea se crea un registro de anulación (nueva fila con tipo `anulacion`).
5. **Audit logs INMUTABLES** — La tabla `audit_logs` es INSERT-only. Misma regla que dispensas.
6. **Tablet-first** — Layout optimizado para 1024px. Desktop secundario, mobile terciario.
7. **Flujo dispensa < 60 segundos** — QR → verificación automática → cantidad → confirmar → registrado.
8. **Colores por estado** — Verde (#22c55e, activo/OK), Amarillo (#eab308, pendiente/atención), Rojo (#ef4444, vencido/bloqueado).
9. **Datos sensibles de salud** — No loggear datos de socios en consola. No en URLs. No en error messages. RLS estricto.
10. **Campos de auditoría** en todas las tablas: `created_at`, `updated_at`, `created_by`. Las inmutables solo `created_at` y `created_by`.
11. **IDs legibles** — Socios: `SOC-0001`, Dispensas: `DISP-0001`. Generados por trigger o función PostgreSQL.
12. **TypeScript estricto** + Zod para validación de formularios y API.
13. **Loading, empty y error states** en TODAS las vistas. No hay vista sin skeleton/spinner, empty state con CTA, y error boundary.

---

## Estructura del Proyecto

```
jamrock/
├── .planning/                    # GSD artifacts (no tocar estructura)
│   ├── PROJECT.md                # Contexto técnico permanente
│   ├── REQUIREMENTS.md           # 126 requerimientos funcionales
│   ├── ROADMAP.md                # 3 fases, 10 waves
│   └── STATE.md                  # Estado actual (actualizar al completar waves)
├── CLAUDE.md                     # Este archivo
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Rutas protegidas (layout con sidebar)
│   │   │   ├── dashboard/        # Dashboard principal
│   │   │   ├── socios/           # Gestión de socios
│   │   │   ├── dispensas/        # Registro de dispensas
│   │   │   ├── stock/            # Stock medicinal y comercial
│   │   │   ├── ventas/           # Ventas y caja
│   │   │   ├── pagos/            # Cuentas corrientes
│   │   │   ├── proveedores/      # Gestión de proveedores
│   │   │   ├── eventos/          # Eventos del club
│   │   │   ├── calendario/       # Vista calendario
│   │   │   ├── reportes/         # Reportes y exportaciones
│   │   │   ├── solicitudes/      # Gestión de solicitudes internas
│   │   │   └── configuracion/    # Config del sistema (solo gerente)
│   │   ├── (public)/             # Rutas públicas
│   │   │   └── inscripcion/      # Formulario público de inscripción
│   │   ├── api/                  # API routes (service_role_key AQUÍ)
│   │   │   ├── members/
│   │   │   ├── dispensations/
│   │   │   ├── enrollment/
│   │   │   └── reports/
│   │   ├── login/                # Página de login
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Redirect a /login o /dashboard
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Sidebar, Header, Footer
│   │   ├── forms/                # Formularios reutilizables
│   │   ├── tables/               # DataTable con filtros
│   │   └── shared/               # StatusBadge, QRScanner, etc.
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # createBrowserClient (anon_key)
│   │   │   ├── server.ts         # createServerClient (para SSR)
│   │   │   └── admin.ts          # createServiceClient (service_role — SOLO API routes)
│   │   ├── utils.ts              # Helpers generales
│   │   ├── constants.ts          # Constantes del app
│   │   └── validations/          # Schemas Zod por entidad
│   ├── hooks/                    # Custom hooks (useMembers, useDispensations, etc.)
│   ├── types/                    # TypeScript types/interfaces
│   └── middleware.ts             # Auth middleware + redirect por rol
├── supabase/
│   └── migrations/               # SQL migrations (numeradas)
├── public/
├── .env.local                    # Variables de entorno (NUNCA commitear)
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Base de Datos — Schema Completo

### Campos estándar (todas las tablas excepto inmutables)
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id),
is_deleted BOOLEAN DEFAULT false,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES auth.users(id)
```

### Campos para tablas inmutables (dispensations, audit_logs)
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
created_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id)
-- Sin updated_at, sin is_deleted, sin deleted_at
-- RLS: DENY UPDATE, DENY DELETE
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

-- RLS: Todos pueden ver su propio perfil. Gerente puede ver/editar todos.
```

### Tabla: members
```sql
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number TEXT UNIQUE NOT NULL,       -- SOC-0001
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
  -- audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Trigger: generar member_number (SOC-XXXX) en INSERT
-- Trigger: generar qr_code en INSERT
-- RLS: gerente y secretaria CRUD. cultivador solo SELECT.
```

### Tabla: dispensations (INMUTABLE)
```sql
CREATE TABLE dispensations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispensation_number TEXT UNIQUE NOT NULL,  -- DISP-0001
  member_id UUID NOT NULL REFERENCES members(id),
  quantity_grams NUMERIC(8,2) NOT NULL,
  genetics TEXT NOT NULL,
  lot_id UUID REFERENCES medical_stock_lots(id),
  type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'anulacion')),
  nullifies_id UUID REFERENCES dispensations(id),  -- si type='anulacion'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
  -- SIN updated_at, SIN is_deleted, SIN deleted_at
);

-- RLS: INSERT only para gerente y secretaria. SELECT para todos autenticados. NO UPDATE. NO DELETE.
-- Trigger: DENY UPDATE, DENY DELETE
-- Trigger: generar dispensation_number (DISP-XXXX) en INSERT
-- Trigger: descontar stock de medical_stock_lots
```

### Tabla: medical_stock_lots
```sql
CREATE TABLE medical_stock_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genetics TEXT NOT NULL,
  initial_grams NUMERIC(10,2) NOT NULL,
  current_grams NUMERIC(10,2) NOT NULL,
  cost_per_gram NUMERIC(10,2),
  lot_date DATE DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  -- audit
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
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  -- audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
```

### Tabla: sales
```sql
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES commercial_products(id),
  member_id UUID REFERENCES members(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  -- audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Trigger: descontar stock_quantity de commercial_products
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

### Tabla: payments
```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  amount NUMERIC(10,2) NOT NULL,
  concept TEXT NOT NULL,                -- cuota_mensual, venta, dispensa, otro
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
  notes TEXT,
  -- audit
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
  -- audit
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
  -- audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
```

### Tabla: events
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  total_cost NUMERIC(12,2) DEFAULT 0,
  total_income NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planificado' CHECK (status IN ('planificado', 'activo', 'cerrado', 'cancelado')),
  -- audit
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
  -- Tabla pública: no tiene created_by (viene de formulario sin login)
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

-- Trigger automático en tablas críticas: members, dispensations, payments, sales, cash_registers
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

-- Configuraciones: low_stock_threshold, membership_fee_default, club_name, etc.
```

---

## Roles y Permisos

| Rol | Dashboard | Socios | Dispensas | Stock Med | Ventas/Caja | Pagos | Proveedores | Eventos | Config | Reportes |
|-----|-----------|--------|-----------|-----------|-------------|-------|-------------|---------|--------|----------|
| **gerente** | Completo | CRUD | Ver/Crear | CRUD | CRUD | CRUD | CRUD | CRUD | ✅ | ✅ |
| **secretaria** | Operativo | CRUD | Crear | Ver | Crear/Ver | Crear/Ver | Ver | Ver | ❌ | ❌ |
| **cultivador** | Limitado | Ver | ❌ | CRUD | ❌ | ❌ | Ver | ❌ | ❌ | ❌ |

**Implementación:**
- `profiles.role` determina el rol del usuario
- Middleware en `middleware.ts` redirige según rol
- RLS policies en Supabase filtran por rol
- Componentes usan hook `useRole()` para condicionar UI

---

## Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # ⚠️ SOLO en /app/api/ — NUNCA en componentes cliente

# Telegram Bot (para n8n)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Jamrock Club
```

---

## Estado Actual y Qué Construir

### Estado: Fase 1, Wave 0 (Setup)

El proyecto está en setup. **Empezar por Wave 1.1 (Setup + Auth).**

### Wave 1.1 — Setup + Auth (MOD-01) ← EMPEZAR AQUÍ
1. Crear estructura Next.js 14 con App Router + TypeScript
2. Instalar dependencias: `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss`, `shadcn/ui`, `zod`, `@tanstack/react-query`, `qrcode`
3. Configurar Tailwind con tokens de diseño (verde/amarillo/rojo)
4. Configurar Supabase client (browser, server, admin)
5. Crear tablas `profiles` y migrations base
6. Implementar login/logout con Supabase Auth
7. Configurar 3 roles (gerente, secretaria, cultivador) en tabla `profiles`
8. Middleware de protección por rol
9. Layout base: sidebar + main content (tablet-first 1024px)
10. Deploy inicial a Vercel

### Wave 1.2 — Gestión de socios + REPROCANN (MOD-02)
- CRUD de socios con todos los campos
- Estado REPROCANN con colores (verde/amarillo/rojo)
- IDs legibles SOC-0001 (trigger PostgreSQL)
- QR único por socio
- Carnet digital PDF
- Búsqueda global
- Ficha individual con historial
- Vista general con filtros

### Wave 1.3 — Registro de dispensas (MOD-03)
- Selección por QR o búsqueda
- Verificación automática (REPROCANN activo + cuota al día)
- Registro inmutable
- Descuento automático de stock
- IDs legibles DISP-0001
- Flujo < 60 segundos
- Bloqueo si socio no cumple requisitos

### Wave 1.4 — Dashboard + Inscripción pública (MOD-07, MOD-12)
- Dashboard con accesos rápidos
- KPIs del día
- Formulario público sin login
- Gestión interna de solicitudes

---

## Patrones de Código

### Supabase Client
```typescript
// lib/supabase/client.ts — BROWSER (anon_key, seguro)
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts — SERVER COMPONENTS (anon_key con cookies)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  )
}

// lib/supabase/admin.ts — API ROUTES ONLY (service_role_key)
import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // ⚠️ SOLO API routes
  )
```

### Soft Delete Pattern
```typescript
// Nunca usar .delete() — siempre soft delete
const softDelete = async (table: string, id: string, userId: string) => {
  const { error } = await supabase
    .from(table)
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', id)
  return { error }
}

// Todas las queries DEBEN filtrar
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('is_deleted', false)  // ← SIEMPRE
```

### Readable IDs (Trigger SQL)
```sql
-- Función para generar IDs legibles
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
```

### Inmutabilidad (Trigger SQL)
```sql
-- Bloquear UPDATE y DELETE en dispensations
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
```

### Status Badge Component
```typescript
// components/shared/StatusBadge.tsx
const statusColors = {
  activo: 'bg-green-100 text-green-800 border-green-200',
  en_tramite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  vencido: 'bg-red-100 text-red-800 border-red-200',
  cancelado: 'bg-gray-100 text-gray-800 border-gray-200',
}
```

---

## Diseño Visual

- **Fondo:** slate-50 (#f8fafc)
- **Sidebar:** slate-900 (#0f172a)
- **Primario:** green-600 (#16a34a) — Cannabis/naturaleza
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
