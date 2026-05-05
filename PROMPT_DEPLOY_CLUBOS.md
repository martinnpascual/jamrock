# Prompt para Claude Code — Deploy completo de Clubos

Pegá esto en Claude Code (o en el chat con Chrome abierto):

---

## PROMPT:

Tenés que completar el deploy del proyecto **Clubos** (clon genérico de Jamrock). El código ya está listo en `C:\Users\Martin\clubcanabicogenerico`. Necesito que hagas todo en orden:

---

### PASO 1 — Verificar qué tablas ya existen en Supabase

El proyecto Supabase de Clubos es `hkrqnsqjhdgowamzdlhp`.  
URL: `https://hkrqnsqjhdgowamzdlhp.supabase.co`  
Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcnFuc3FqaGRnb3dhbXpkbGhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcyMDM4NiwiZXhwIjoyMDkyMjk2Mzg2fQ.6XdNaIkdNVweCnHM6-eYN6sx5YR2x-zJFvMHLxxQKoM`

Usá el Chrome abierto para navegar a:  
`https://supabase.com/dashboard/project/hkrqnsqjhdgowamzdlhp/editor`

Verificá qué tablas existen. Las que YA deberían existir son las de la migración base (001):
`profiles, members, dispensations, medical_stock_lots, commercial_products, sales, cash_registers, payments, suppliers, supply_records, events, event_attendees, enrollment_requests, audit_logs, app_config`

Las que FALTAN (si no existen) son:
- `current_accounts`
- `checkout_transactions`  
- `cash_register_expenses`
- `work_sessions`
- `activity_log`
- Columnas extra en `medical_stock_lots`: `is_outsourced`, `outsourced_provider_name`, `cost_total`, `sale_price_total`
- Función `search_members` con soporte unaccent

---

### PASO 2 — Aplicar las migraciones pendientes en Supabase

Navegá con Chrome a:  
`https://supabase.com/dashboard/project/hkrqnsqjhdgowamzdlhp/sql/new`

Abrí el archivo de migraciones combinadas que está en:  
`C:\Users\Martin\clubcanabicogenerico\supabase\migrations_pending_clubos.sql`

Copiá TODO el contenido del archivo y pegalo en el SQL Editor de Supabase. Ejecutalo.

Si hay errores en alguna migración (por ejemplo `pg_cron` no disponible), saltea esa parte y continuá con el resto. Las migraciones usan `IF NOT EXISTS` así que son seguras de re-ejecutar.

**Importante**: Si `pg_cron` da error, primero habilitá la extensión en:  
`https://supabase.com/dashboard/project/hkrqnsqjhdgowamzdlhp/database/extensions`  
Buscá "pg_cron" y activala, luego volvé al SQL Editor.

---

### PASO 3 — Deploy a Vercel

Abrí una terminal y ejecutá:

```bash
cd C:\Users\Martin\clubcanabicogenerico
npx vercel deploy --prod
```

Si pide login, hacé `npx vercel login` primero (usa la misma cuenta de Vercel de Jamrock).

El proyecto se va a crear como **"clubos"** (el `.vercel/project.json` ya está configurado con `"projectName": "clubos"`).

---

### PASO 4 — Configurar variables de entorno en Vercel

Una vez deployado, navegá con Chrome a:  
`https://vercel.com/team_GZnf9qH39a12Hu0dS9IG9GSL` → proyecto "clubos" → Settings → Environment Variables

Agregá estas variables (para Production, Preview y Development):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hkrqnsqjhdgowamzdlhp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcnFuc3FqaGRnb3dhbXpkbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjAzODYsImV4cCI6MjA5MjI5NjM4Nn0.NWcr_kgtQfs9f5aop9YqTtotKOnDSFNtSvbuKDBurp0` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcnFuc3FqaGRnb3dhbXpkbGhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcyMDM4NiwiZXhwIjoyMDkyMjk2Mzg2fQ.6XdNaIkdNVweCnHM6-eYN6sx5YR2x-zJFvMHLxxQKoM` |
| `NEXT_PUBLIC_APP_NAME` | `Clubos` |
| `NEXT_PUBLIC_APP_URL` | `https://clubos.vercel.app` (o la URL que asigne Vercel) |

Después de agregar las variables, hacé un redeploy:  
`npx vercel deploy --prod`

---

### PASO 5 — Verificar que el deploy funciona

Navegá con Chrome a la URL que generó Vercel (algo como `https://clubos-xyz.vercel.app`).

Verificá que:
1. La página de login carga correctamente y muestra "Clubos"
2. Podés iniciar sesión con un usuario de Supabase
3. El dashboard muestra los datos correctamente

Si el login falla con error de "Invalid Supabase URL" o similar, revisá que las env vars en Vercel estén correctas y hacé redeploy.

---

### Contexto adicional

- **Proyecto en disco**: `C:\Users\Martin\clubcanabicogenerico`
- **Supabase project ref**: `hkrqnsqjhdgowamzdlhp`
- **Vercel team ID**: `team_GZnf9qH39a12Hu0dS9IG9GSL`
- **El código es idéntico a Jamrock** pero con marca "Clubos" — toda la lógica, rutas y componentes son iguales
- **Migraciones combinadas**: `C:\Users\Martin\clubcanabicogenerico\supabase\migrations_pending_clubos.sql`
- Las tablas base (migration 001) YA fueron aplicadas — solo faltan las migraciones 002 en adelante
