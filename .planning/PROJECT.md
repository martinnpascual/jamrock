# PROJECT.md — Jamrock Club

> Documento permanente. Solo se actualiza en decisiones arquitectónicas mayores.

## Resumen

| Campo | Valor |
|-------|-------|
| Cliente | Jamrock Club — Asociación Civil |
| Proyecto | Sistema de gestión digital Jamrock |
| Stack | Profile C (Next.js 14 + Supabase + n8n + Telegram) |
| Repo | https://github.com/martinnpascual/jamrock |
| Deploy URL | [Pendiente — Vercel] |
| Supabase | [Pendiente — Project ID] |
| Estado | setup |

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js 14 (App Router) | 14.2.x |
| Backend | Supabase directo + API routes | - |
| DB | Supabase PostgreSQL | 15 |
| Auth | Supabase Auth | - |
| Estilos | Tailwind CSS + shadcn/ui | 3.x |
| Validación | Zod | 3.x |
| Data fetching | TanStack Query | 5.x |
| QR | qrcode (npm) | - |
| PDF | @react-pdf/renderer | - |
| Automatización | n8n | - |
| Notificaciones | Telegram Bot API | - |
| Deploy | Vercel (app) + Railway (n8n) | - |

## Arquitectura de base de datos

### Tablas principales
| Tabla | Propósito | RLS | Soft delete | Inmutable |
|-------|-----------|-----|-------------|-----------|
| profiles | Usuarios del sistema (extends auth.users) | ✅ | ✅ | ❌ |
| members | Socios del club | ✅ | ✅ | ❌ |
| dispensations | Registro de dispensas medicinales | ✅ | ❌ | ✅ (INSERT-only) |
| medical_stock_lots | Lotes de material medicinal por genética | ✅ | ✅ | ❌ |
| commercial_products | Productos comerciales (parafernalia, café) | ✅ | ✅ | ❌ |
| sales | Ventas de productos comerciales | ✅ | ✅ | ❌ |
| cash_registers | Cierre de caja diario | ✅ | ❌ | ❌ |
| payments | Pagos de cuotas y cuentas corrientes | ✅ | ✅ | ❌ |
| suppliers | Proveedores (medicinales y comerciales) | ✅ | ✅ | ❌ |
| supply_records | Historial de suministros de proveedores | ✅ | ✅ | ❌ |
| events | Eventos del club | ✅ | ✅ | ❌ |
| event_attendees | Asistencia de socios a eventos | ✅ | ✅ | ❌ |
| enrollment_requests | Solicitudes de inscripción pública | ✅ | ❌ | ❌ |
| audit_logs | Trail de auditoría inmutable | ✅ | ❌ | ✅ (INSERT-only) |
| app_config | Configuración del sistema (key-value) | ✅ | ❌ | ❌ |

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

### Tabla members — campos específicos
```sql
member_number TEXT UNIQUE,            -- SOC-0001 (readable ID)
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
dni TEXT UNIQUE NOT NULL,
email TEXT,
phone TEXT,
birth_date DATE,
address TEXT,
member_type TEXT DEFAULT 'standard',  -- standard, therapeutic, etc.
membership_fee NUMERIC(10,2),
reprocann_status TEXT DEFAULT 'en_tramite',  -- activo, en_tramite, vencido, cancelado
reprocann_expiry DATE,
reprocann_number TEXT,
qr_code TEXT,                         -- Unique QR data
photo_url TEXT,
notes TEXT,
-- + audit fields estándar
```

## Roles y permisos

| Rol | Dashboard | Socios | Dispensas | Stock Med | Ventas/Caja | Pagos | Proveedores | Eventos | Config | Reportes |
|-----|-----------|--------|-----------|-----------|-------------|-------|-------------|---------|--------|----------|
| gerente | Completo | CRUD | Ver/Crear | CRUD | CRUD | CRUD | CRUD | CRUD | ✅ | ✅ |
| secretaria | Operativo | CRUD | Crear | Ver | Crear/Ver | Crear/Ver | Ver | Ver | ❌ | ❌ |
| cultivador | Limitado | Ver | ❌ | CRUD | ❌ | ❌ | Ver | ❌ | ❌ | ❌ |

## Integraciones externas

| Servicio | Propósito | Estado |
|----------|-----------|--------|
| n8n | Automatización estados REPROCANN, alertas | Pendiente |
| Telegram Bot | Alertas a gerencia | Pendiente |
| QR (qrcode lib) | QR único por socio | Pendiente |
| @react-pdf/renderer | Carnet digital PDF | Pendiente |

## Módulos aplicados (del catálogo)

| Módulo | Adaptaciones |
|--------|-------------|
| auth-rbac | 3 roles: gerente, secretaria, cultivador |
| crud-base | 15 entidades (ver tablas arriba) |
| audit-historial | INSERT-only, obligatorio por regulación |
| dashboard-kpis | KPIs: dispensas/día, socios activos, stock bajo, cuotas vencidas |
| bot-telegram-n8n | Alertas: REPROCANN, cuotas, stock, caja |
| payments-tracking | Cuentas corrientes, pagos parciales, múltiples métodos |
| design-tokens | Verde/amarillo/rojo para estados de socio |
| readable-ids | SOC-0001, DISP-0001 |
| soft-deletes | Estándar (excepto dispensations y audit_logs) |

## Módulos nuevos (específicos de Jamrock)

| Módulo | Descripción | Candidato a catálogo |
|--------|-------------|---------------------|
| stock-dual | Stock medicinal (por genética/lote) separado de comercial | ✅ Sí |
| calendar-view | Vista calendario filtrable por tipo | ✅ Sí |
| events-manager | Eventos con asistencia, costos, balance | ✅ Sí |
| enrollment-form | Formulario público + gestión interna | ✅ Sí |
| cash-register | Cierre de caja diario, reconciliación | ✅ Sí |
| supplier-manager | Proveedores con historial, estado de cuenta | ✅ Sí |
| reports-export | Reportes a PDF/Excel | ✅ Sí |

## Decisiones arquitectónicas

| Fecha | Decisión | Justificación |
|-------|----------|---------------|
| 2026-03-28 | Profile C en vez de D | No necesita FastAPI; lógica se resuelve con Supabase + n8n |
| 2026-03-28 | Dispensations INSERT-only | Regulación REPROCANN exige registros inmutables |
| 2026-03-28 | PDF con @react-pdf | No hay backend Python; usar lib JS para carnet |
| 2026-03-28 | Stocks separados | Medicinal (por genética/lote) ≠ comercial (por producto) |
| 2026-03-28 | QR en alta de socio | Identificación instantánea en mostrador sin búsqueda manual |

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # SOLO API routes, NUNCA en cliente

# Telegram Bot (n8n)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Jamrock Club
```

## Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Deploy (via Vercel CLI o auto-deploy de GitHub)
vercel --prod
```

## Reglas específicas de Jamrock

1. **Dispensas INMUTABLES** — La tabla `dispensations` no permite UPDATE ni DELETE (ni por RLS ni por trigger). Para "corregir" una dispensa errónea se crea un registro de anulación.
2. **Tablet-first** — Layout optimizado para tablet (1024px). Desktop es secundario, mobile es terciario.
3. **Flujo < 60 seg** — Dispensa: escanear QR → verificación automática → cantidad → confirmar → registrado.
4. **Colores por estado** — Verde (activo, en regla), Amarillo (pendiente, atención requerida), Rojo (vencido, bloqueado).
5. **Datos sensibles** — Información de salud. RLS estricto, no loggear datos de socios en consola, no en URLs.
