# Prompt para Claude Code — Jamrock Club

> Pegá este contenido completo al inicio de una sesión de Claude Code para que tenga todo el contexto del proyecto.

---

## ¿Qué es este proyecto?

**Jamrock Club** es un sistema de gestión digital para un club cannábico regulado (asociación civil, Argentina). Gestiona socios con estados REPROCANN, dispensas medicinales inmutables, stock dual (medicinal/comercial), cuentas corrientes, caja, proveedores y reportes.

El sistema está **casi completo**. La Fase 1 y Fase 2 están deployadas y funcionando. Quedan pendientes módulos de la Fase 3 (eventos, calendario, notificaciones Telegram) y algunos detalles de configuración.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Supabase (PostgreSQL 15 + Auth + RLS) + API Routes |
| Estilos | Tailwind CSS + shadcn/ui |
| Validación | Zod 4 |
| Data fetching | TanStack Query v5 |
| QR | qrcode (npm) + html5-qrcode |
| PDF | @react-pdf/renderer |
| Automatización | n8n (Railway) — pendiente de configurar |
| Notificaciones | Telegram Bot API — pendiente |
| Deploy | Vercel (app) |

---

## Estructura de carpetas

```
jamrock/
├── .planning/
│   ├── PROJECT.md        # Contexto técnico permanente
│   ├── REQUIREMENTS.md   # Requerimientos funcionales
│   ├── ROADMAP.md        # 3 fases, 10 waves
│   └── STATE.md          # Estado actual — actualizar al terminar trabajo
├── CLAUDE.md             # Reglas del proyecto (leer siempre primero)
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Rutas protegidas (con sidebar)
│   │   │   ├── dashboard/           # ✅ KPIs reales
│   │   │   ├── socios/              # ✅ CRUD + ficha + carnet QR
│   │   │   ├── dispensas/           # ✅ nueva dispensa + historial
│   │   │   ├── stock/               # ✅ lotes medicinales + alertas
│   │   │   ├── ventas/              # ✅ productos + caja + tabs
│   │   │   ├── pagos/               # ✅ cobros + historial
│   │   │   ├── cuentas-corrientes/  # ✅ CC socios y proveedores
│   │   │   ├── proveedores/         # ✅ CRUD + suministros
│   │   │   ├── reportes/            # ✅ 4 tipos + export CSV
│   │   │   ├── solicitudes/         # ✅ aprobar/rechazar inscripciones
│   │   │   ├── actividad/           # ✅ log de actividad
│   │   │   ├── eventos/             # 🔲 pendiente (Wave 3)
│   │   │   ├── calendario/          # 🔲 pendiente (Wave 3)
│   │   │   └── configuracion/       # 🔲 pendiente
│   │   ├── (public)/
│   │   │   └── inscripcion/         # ✅ formulario público sin auth
│   │   ├── api/                     # API routes (service_role_key AQUÍ)
│   │   │   ├── activity/
│   │   │   ├── alerts/
│   │   │   ├── auth/
│   │   │   ├── cash-register/
│   │   │   ├── checkout/
│   │   │   ├── config/
│   │   │   ├── current-accounts/
│   │   │   ├── dispensations/
│   │   │   ├── enrollment/
│   │   │   ├── events/
│   │   │   ├── members/
│   │   │   ├── operators/
│   │   │   ├── payments/
│   │   │   ├── products/
│   │   │   ├── sales/
│   │   │   ├── stock/
│   │   │   ├── suppliers/
│   │   │   └── work-sessions/
│   │   ├── login/                   # ✅
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── layout/                  # Sidebar, Header
│   │   ├── forms/                   # Formularios reutilizables
│   │   ├── tables/                  # DataTable con filtros
│   │   ├── shared/                  # StatusBadge, QRScanner, etc.
│   │   ├── cash/                    # Componentes de caja
│   │   └── current-accounts/        # Componentes de CC
│   ├── hooks/                       # Custom hooks (useMembers, useDispensations, etc.)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # createBrowserClient (anon_key)
│   │   │   ├── server.ts            # createServerClient (SSR)
│   │   │   └── admin.ts             # createServiceClient (service_role — SOLO API routes)
│   │   ├── validations/             # Schemas Zod por entidad
│   │   ├── audit.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── types/
│   └── middleware.ts                # Auth + redirect por rol
├── supabase/
│   └── migrations/                  # 13 migrations (consolidadas en MIGRATIONS_CLIENTE.sql)
└── .env.local                       # Variables de entorno
```

---

## Variables de entorno (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=           # URL del proyecto Supabase del cliente
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # anon key pública
SUPABASE_SERVICE_ROLE_KEY=          # ⚠️ SOLO en /app/api/ — NUNCA en componentes cliente

TELEGRAM_BOT_TOKEN=                 # Pendiente configurar con n8n
TELEGRAM_CHAT_ID=                   # Pendiente configurar con n8n

NEXT_PUBLIC_APP_URL=                # URL de la app en Vercel
NEXT_PUBLIC_APP_NAME=Jamrock Club
```

---

## Base de datos — Tablas existentes

El schema completo está en `MIGRATIONS_CLIENTE.sql`. Resumen de tablas activas:

| Tabla | Propósito | Inmutable | Soft delete |
|-------|-----------|-----------|-------------|
| `profiles` | Usuarios del sistema (extiende auth.users) | ❌ | ❌ |
| `members` | Socios del club — IDs: SOC-0001 | ❌ | ✅ |
| `dispensations` | Dispensas medicinales — IDs: DISP-0001 | ✅ | ❌ |
| `medical_stock_lots` | Lotes de material medicinal por genética | ❌ | ✅ |
| `commercial_products` | Productos comerciales (parafernalia, café, etc.) | ❌ | ✅ |
| `sales` | Ventas de productos comerciales | ❌ | ✅ |
| `cash_registers` | Caja diaria por turno (mañana/tarde) | ❌ | ❌ |
| `cash_register_expenses` | Egresos de caja (sueldos, servicios, etc.) | ❌ | ✅ |
| `payments` | Pagos de cuotas y otros conceptos | ❌ | ✅ |
| `suppliers` | Proveedores medicinales y comerciales | ❌ | ✅ |
| `supply_records` | Historial de suministros de proveedores | ❌ | ✅ |
| `current_accounts` | Cuentas corrientes de socios y proveedores | ❌ | ✅ |
| `current_account_movements` | Movimientos de CC — IDs: MOV-00001 | ✅ | ❌ |
| `checkout_transactions` | Checkout unificado (dispensa + productos + pago) — IDs: TXN-00001 | ❌ | ✅ |
| `checkout_items` | Detalle de productos en cada checkout | ❌ | ❌ |
| `events` | Eventos del club | ❌ | ✅ |
| `event_attendees` | Asistencia de socios a eventos | ❌ | ✅ |
| `enrollment_requests` | Solicitudes de inscripción pública | ❌ | ❌ |
| `audit_logs` | Trail de auditoría inmutable (INSERT-only) | ✅ | ❌ |
| `activity_log` | Log de acciones legibles para la UI | ❌ | ❌ |
| `app_config` | Configuración del sistema (key-value JSON) | ❌ | ❌ |
| `work_sessions` | Sesiones de trabajo por operador | ❌ | ✅ |

### Funciones y triggers clave

- `generate_member_number()` → SOC-0001 (BEFORE INSERT en members)
- `generate_dispensation_number()` → DISP-0001 (BEFORE INSERT en dispensations)
- `generate_account_number()` → CC-0001 (BEFORE INSERT en current_accounts)
- `generate_movement_number()` → MOV-00001 (BEFORE INSERT en current_account_movements)
- `generate_transaction_number()` → TXN-00001 (BEFORE INSERT en checkout_transactions)
- `prevent_modification()` → bloquea UPDATE/DELETE en tablas inmutables
- `deduct_medical_stock()` → descuenta gramos de medical_stock_lots al dispensar
- `deduct_commercial_stock()` → descuenta stock de commercial_products al vender
- `calculate_and_update_balance()` → actualiza saldo de CC en cada movimiento
- `payment_to_cc_movement()` → genera movimiento CC al registrar un pago
- `sale_to_cc_movement()` → genera movimiento CC al registrar una venta a socio
- `supply_to_cc_movement()` → genera movimiento CC al registrar un suministro
- `handle_new_user()` → crea profile automáticamente al registrar usuario en auth.users
- `search_members(query)` → búsqueda accent-insensitive de socios
- `get_my_role()` → función helper para RLS que retorna el rol del usuario activo
- `log_audit()` → audit trigger en tablas críticas
- `auto-expire-reprocann` → job pg_cron que vence REPROCANN expirados cada día a medianoche

---

## Roles y permisos

| Rol | Dashboard | Socios | Dispensas | Stock Med | Ventas/Caja | Pagos | CC | Proveedores | Eventos | Config | Reportes |
|-----|-----------|--------|-----------|-----------|-------------|-------|----|-------------|---------|--------|----------|
| `gerente` | ✅ completo | CRUD | Ver/Crear | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | ✅ | ✅ |
| `secretaria` | ✅ operativo | CRUD | Crear | Ver | Crear/Ver | Crear/Ver | Ver | Ver | Ver | ❌ | ❌ |
| `cultivador` | ✅ limitado | Ver | ❌ | CRUD | ❌ | ❌ | ❌ | Ver | ❌ | ❌ | ❌ |

El rol se asigna en `profiles.role` y también se sincroniza en `app_metadata` del JWT para que el middleware pueda leerlo sin queries a la DB.

---

## Reglas del proyecto — NUNCA ROMPER

1. **`SUPABASE_SERVICE_ROLE_KEY` NUNCA en frontend.** Solo en `/app/api/`. Usar `createAdminClient()` de `lib/supabase/admin.ts`.

2. **RLS obligatorio** en TODAS las tablas sin excepción.

3. **Soft deletes siempre** — nunca `DELETE FROM`. Patrón: `is_deleted = true`, `deleted_at = now()`, `deleted_by = userId`. Todas las queries deben filtrar `.eq('is_deleted', false)`.

4. **Dispensas INMUTABLES** — La tabla `dispensations` tiene triggers que bloquean UPDATE y DELETE. Para corregir un error se crea un registro nuevo con `type = 'anulacion'` y `nullifies_id = <id_original>`.

5. **audit_logs INMUTABLES** — Solo INSERT. Mismo patrón.

6. **current_account_movements INMUTABLES** — Solo INSERT. Las reversiones se crean como nuevos movimientos con `reverses_id`.

7. **Tablet-first** — Layout optimizado para 1024px. Desktop secundario, mobile terciario.

8. **Colores de estado** — Verde `#22c55e` (activo/OK), Amarillo `#eab308` (pendiente/atención), Rojo `#ef4444` (vencido/bloqueado).

9. **No loggear datos sensibles** — Datos de salud de socios no van a consola, no en URLs, no en error messages.

10. **IDs legibles** — Generados por trigger PostgreSQL. No generar desde el frontend.

11. **TypeScript estricto + Zod** en formularios y API routes.

12. **Loading, empty y error states** en TODAS las vistas — skeleton/spinner, empty state con CTA, y error boundary.

13. **Flujo dispensa < 60 segundos** — QR → verificación automática → cantidad → confirmar → registrado.

---

## Estado actual del proyecto

### ✅ Completado y deployado (Fase 1 + Fase 2 completa)

| Módulo | Ruta | Notas |
|--------|------|-------|
| Auth / Login | `/login` | 3 roles, middleware, JWT |
| Dashboard | `/dashboard` | KPIs reales: dispensas, ventas, alertas |
| Inscripción pública | `/inscripcion` | Sin auth, formulario público |
| Solicitudes | `/solicitudes` | Aprobar → crea socio automáticamente |
| Socios | `/socios`, `/socios/[id]` | CRUD completo, ficha, historial |
| Carnet QR | `/socios/[id]/carnet` | PDF descargable |
| Dispensas | `/dispensas`, `/dispensas/nueva` | Checkout unificado, inmutable |
| Stock medicinal | `/stock` | Lotes, alertas, lotes tercerizados |
| Ventas | `/ventas` | Tabs: ventas / productos / caja |
| Pagos | `/pagos` | Cobros, métodos, historial |
| Cuentas corrientes | `/cuentas-corrientes` | CC socios y proveedores, movimientos |
| Proveedores | `/proveedores` | CRUD, historial suministros |
| Reportes | `/reportes` | 4 tipos + export CSV |
| Actividad | `/actividad` | Log de acciones del sistema |

### 🔲 Pendiente (Fase 3)

| Módulo | Ruta | Prioridad | Notas |
|--------|------|-----------|-------|
| Eventos | `/eventos` | Media | CRUD eventos, asistencia, balance |
| Calendario | `/calendario` | Media | Vista mensual/semanal, filtros por tipo |
| Configuración | `/configuracion` | Media | Ajustes del club (nombre, cuota, umbrales) |
| Notificaciones Telegram | n8n + Railway | Baja | Alertas: stock bajo, REPROCANN, caja |
| Anulación de dispensas | dentro de `/dispensas` | **Alta** | Módulo para registrar anulaciones con motivo |

---

## Patrones de código a seguir

### Supabase clients

```typescript
// Cliente browser (componentes) — lib/supabase/client.ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Cliente server (Server Components, API routes con cookies) — lib/supabase/server.ts
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()

// Cliente admin (API routes que necesitan service_role) — lib/supabase/admin.ts
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()  // ⚠️ SOLO en /app/api/
```

### Soft delete

```typescript
// NUNCA usar .delete() — siempre soft delete
const { error } = await supabase
  .from('tabla')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId
  })
  .eq('id', id)

// SIEMPRE filtrar en queries
const { data } = await supabase
  .from('tabla')
  .select('*')
  .eq('is_deleted', false)  // ← siempre
```

### Hook pattern

```typescript
// hooks/useEntidad.ts — patrón estándar del proyecto
export function useEntidad() {
  return useQuery({
    queryKey: ['entidad'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('entidad')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}
```

### API route pattern

```typescript
// app/api/entidad/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // 1. Verificar sesión
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Verificar rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['gerente', 'secretaria'].includes(profile?.role ?? '')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Operar con admin client si se necesita service_role
  const admin = createAdminClient()
  // ... lógica
}
```

### StatusBadge

```typescript
// components/shared/StatusBadge.tsx — ya existe, importar de ahí
const statusColors = {
  activo: 'bg-green-100 text-green-800 border-green-200',
  en_tramite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  vencido: 'bg-red-100 text-red-800 border-red-200',
  cancelado: 'bg-gray-100 text-gray-800 border-gray-200',
}
```

---

## Diseño visual

- **Fondo general:** slate-50 (`#f8fafc`)
- **Sidebar:** slate-900 (`#0f172a`)
- **Color primario:** green-600 (`#16a34a`)
- **Estado activo/OK:** green-500 (`#22c55e`)
- **Estado pendiente/atención:** yellow-500 (`#eab308`)
- **Estado vencido/bloqueado:** red-500 (`#ef4444`)
- **Fuente:** Inter (sans-serif)
- **Border radius:** `rounded-lg` (8px)
- **Sombras:** `shadow-sm` para cards
- **Componentes base:** shadcn/ui

---

## APIs deployadas

| Endpoint | Métodos | Roles permitidos |
|----------|---------|-----------------|
| `/api/auth/signout` | POST | authenticated |
| `/api/enrollment` | POST (público), PATCH | gerente, secretaria |
| `/api/members/verify` | GET | authenticated |
| `/api/dispensations` | POST | gerente, secretaria |
| `/api/checkout` | POST | gerente, secretaria |
| `/api/stock` | POST, DELETE | gerente, secretaria |
| `/api/products` | POST, PATCH, DELETE | gerente |
| `/api/sales` | POST, DELETE | gerente, secretaria |
| `/api/cash-register` | GET, POST, PATCH | gerente, secretaria |
| `/api/payments` | POST, DELETE | gerente, secretaria |
| `/api/suppliers` | POST, PATCH, DELETE | gerente |
| `/api/current-accounts` | GET, POST | gerente, secretaria |
| `/api/events` | GET, POST, PATCH, DELETE | gerente |
| `/api/config` | GET, PATCH | gerente |
| `/api/activity` | GET, POST | authenticated |
| `/api/alerts` | GET | authenticated |
| `/api/operators` | GET | gerente |
| `/api/work-sessions` | GET, POST, PATCH | authenticated |

---

## Usuarios del sistema (producción — cambiar luego)

| Rol | Email | Password |
|-----|-------|----------|
| gerente | gerente@jamrock.com | Jamrock2025! |
| secretaria | secretaria@jamrock.com | Jamrock2025! |
| cultivador | cultivador@jamrock.com | Jamrock2025! |

---

## Tarea inmediata al empezar

Antes de escribir cualquier código, leer `CLAUDE.md` en la raíz del proyecto. Ese archivo contiene las reglas definitivas del proyecto.

El próximo trabajo a realizar es **Wave 3**, en este orden de prioridad:

1. **Anulación de dispensas** (alta prioridad — cumplimiento REPROCANN): agregar flujo en `/dispensas` para registrar una dispensa de tipo `anulacion` que referencia a la original mediante `nullifies_id`. Debe quedar inmutable igual que el registro normal.

2. **Módulo `/configuracion`**: vista solo para gerente que permita editar los valores de `app_config` (nombre del club, cuota por defecto, umbral de stock bajo, precio por gramo de dispensa).

3. **Módulo `/eventos`**: CRUD completo de eventos con gestión de asistencia de socios y balance económico (ingresos/costos por evento).

4. **Módulo `/calendario`**: vista mensual/semanal que muestre eventos, dispensas y actividad del club. Filtros por tipo.

5. **Notificaciones Telegram vía n8n**: configurar en Railway, conectar con el bot de Telegram. Alertas para: REPROCANN próximo a vencer, stock bajo, diferencia en cierre de caja, nueva solicitud de inscripción.

---

## Al completar cualquier wave o tarea

1. Actualizar `.planning/STATE.md` con las tareas completadas.
2. Verificar que RLS esté activo en todas las tablas nuevas.
3. Verificar que soft delete funcione en tablas mutables.
4. Verificar que audit_logs capture cambios en tablas críticas.
5. Testear en viewport 1024px (tablet — dispositivo principal del club).

---

## Comandos útiles

```bash
npm run dev       # Desarrollo local (puerto 3000)
npm run build     # Build de producción
npm run lint      # ESLint
vercel --prod     # Deploy manual
```

---

## Notas importantes del dominio

- El club opera bajo regulación REPROCANN (Argentina). Los registros de dispensas son documentos legales y **no pueden modificarse**.
- El dispositivo principal de uso es una **tablet en el mostrador** (1024px). El diseño debe funcionar cómodamente con touch.
- Los operarios no son técnicos. La UI debe ser intuitiva: mínima navegación, colores claros de estado, acciones obvias.
- Hay dos stocks completamente separados: **medicinal** (por genética y lotes) y **comercial** (productos individuales). No mezclarlos.
- Las dispensas tienen un **flujo checkout unificado**: selección de socio por QR → verificación REPROCANN + cuota → selección de genética y gramos → productos adicionales opcionales → pago (efectivo/transferencia/CC/mixto). Todo en menos de 60 segundos.
