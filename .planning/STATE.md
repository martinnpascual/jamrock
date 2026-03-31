# STATE.md — Jamrock Club

## Estado actual

- **Fase:** 2 (Operaciones completas)
- **Wave:** 2.4 ✅ (Proveedores + Reportes CSV)
- **Última actualización:** 2026-03-31
- **Próximo milestone:** Wave 3 — Calendario/Eventos + Notificaciones (opcional)

## Waves completadas

| Wave | Descripción | Estado | Deploy |
|------|-------------|--------|--------|
| 1.1 | Setup + Auth (login, middleware, roles) | ✅ Deployado | jamrock.vercel.app |
| 1.2 | Socios (CRUD, perfil, carnet QR) | ✅ Deployado | |
| 1.3 | Dispensas (nueva dispensa, historial, QR verify) | ✅ Deployado | |
| 1.4 | Dashboard KPIs + Inscripción pública | ✅ Deployado | |
| 2.1 | Stock medicinal (lotes, movimientos, alertas) | ✅ Deployado | |
| 2.2 | Ventas comerciales (productos, caja) | ✅ Deployado | |
| 2.3 | Pagos/cobros (socios, métodos, historial) | ✅ Deployado | |
| 2.4 | Proveedores + Reportes CSV | ✅ Deployado | commit b37905c |

## Estado por módulo

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auth / Login | /login | ✅ |
| Dashboard | /dashboard | ✅ KPIs reales |
| Inscripción pública | /inscripcion | ✅ sin auth |
| Solicitudes | /solicitudes | ✅ aprobar/rechazar |
| Socios | /socios, /socios/[id] | ✅ |
| Carnet QR | /socios/[id]/carnet | ✅ |
| Dispensas | /dispensas, /dispensas/nueva | ✅ inmutable |
| Stock medicinal | /stock | ✅ lotes + alertas |
| Ventas | /ventas | ✅ tabs: ventas/productos/caja |
| Pagos | /pagos | ✅ |
| Proveedores | /proveedores | ✅ historial suministros |
| Reportes | /reportes | ✅ 4 tipos + export CSV |
| Configuración | /configuracion | 🔲 pendiente |
| Eventos | /eventos | 🔲 pendiente |

## Usuarios de prueba (producción)

| Rol | Email | Password |
|-----|-------|----------|
| gerente | gerente@jamrock.com | Jamrock2025! |
| secretaria | secretaria@jamrock.com | Jamrock2025! |
| cultivador | cultivador@jamrock.com | Jamrock2025! |

## APIs deployadas

| Endpoint | Métodos | Auth |
|----------|---------|------|
| /api/auth/signout | POST | user |
| /api/enrollment | POST (público), PATCH | gerente/secretaria |
| /api/members/verify | GET | user |
| /api/dispensations | POST, DELETE | gerente/secretaria |
| /api/stock | POST, DELETE | gerente/secretaria |
| /api/products | POST, PATCH, DELETE | gerente |
| /api/sales | POST, DELETE | gerente/secretaria |
| /api/cash-register | GET, POST, PATCH | gerente/secretaria |
| /api/payments | POST, DELETE | gerente/secretaria |
| /api/suppliers | POST, PATCH, DELETE | gerente |

## Wave siguiente sugerida: Wave 3 (opcional)

| Tarea | Prioridad | Notas |
|-------|-----------|-------|
| /eventos — calendario y balance | Media | MOD-14 |
| /configuracion — ajustes club | Media | branding, cuota default |
| Notificaciones Telegram (n8n) | Baja | alertas stock bajo, vencimientos |
| Módulo de anulación de dispensas | Alta | cumplimiento REPROCANN |

## Decisiones recientes

| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-03-28 | Profile C (Next.js + Supabase + n8n) | No requiere FastAPI |
| 2026-03-28 | Dispensas INSERT-only | REPROCANN exige inmutabilidad |
| 2026-03-29 | CSV export con Blob + BOM | Sin backend Python; compatibilidad Excel |
| 2026-03-29 | soft delete en todas las tablas mutables | is_deleted + deleted_at + deleted_by |
| 2026-03-30 | Caja diaria con diferencia real vs esperado | Detección de errores/faltante |
| 2026-03-31 | Reportes client-side sin @react-pdf | Simplicidad; CSV suficiente para el equipo |

## Mejoras detectadas

| Mejora | Estado |
|--------|--------|
| M009 — enrollment-form | ✅ Implementado |
| M010 — stock-dual | ✅ Implementado |
| M011 — cash-register | ✅ Implementado |
| M012 — supplier-manager | ✅ Implementado |
| M015 — reports-export (CSV) | ✅ Implementado |
| M013 — calendar-view | 🔲 Wave 3 |
| M014 — events-manager | 🔲 Wave 3 |
| M016 — tablas inmutables | ✅ Patrón aplicado |

## Notas para Claude

- **Rubro regulado:** Las dispensas medicinales son INMUTABLES. No se pueden modificar ni eliminar.
- **Tablet-first:** Dispositivo principal es tablet en mostrador (1024px).
- **UX para no-técnicos:** Colores verde/amarillo/rojo, mínima navegación.
- **Flujo dispensa < 60 seg:** QR → verificación → cantidad → confirmar.
- **Dos stocks separados:** Medicinal (lotes, inmutable) ≠ Comercial (CRUD normal).
- **Datos de salud:** RLS estricto en todas las tablas.
- **Supabase project ID:** vypzammjfxsybrtaqfkz (sa-east-1)
