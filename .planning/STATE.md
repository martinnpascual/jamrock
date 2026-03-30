# STATE.md — Jamrock Club

## Estado actual

- **Fase:** 1 (MVP)
- **Wave:** 0 (Setup — pre-desarrollo)
- **Última actualización:** 2026-03-28
- **Próximo milestone:** Wave 1.1 — Setup + Auth (MOD-01)

## Wave actual: Setup

### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1 | Crear repo GitHub (martinnpascual/jamrock) | 🔲 pendiente | Profile C (Next.js + Supabase) |
| 2 | Crear instancia Supabase | 🔲 pendiente | Región South America |
| 3 | Setup Next.js 14 con estructura estándar | 🔲 pendiente | App Router + TypeScript |
| 4 | Configurar Tailwind + shadcn/ui | 🔲 pendiente | |
| 5 | Configurar .planning/ con GSD artifacts | 🔲 pendiente | Copiar PROJECT.md, REQUIREMENTS.md, ROADMAP.md |
| 6 | Configurar CLAUDE.md del proyecto | 🔲 pendiente | |
| 7 | Deploy inicial a Vercel | 🔲 pendiente | |
| 8 | Registrar en carpeta maestra | 🔲 pendiente | MAPA_PROYECTOS + MODULOS_POR_PROYECTO |

### Bloqueadores
- Ninguno

## Historial de waves

(Vacío — proyecto en setup)

## Decisiones recientes

| Fecha | Decisión | Contexto |
|-------|----------|----------|
| 2026-03-28 | Profile C (Next.js + Supabase + n8n) | No requiere FastAPI; lógica con Supabase functions + n8n |
| 2026-03-28 | Dispensas INSERT-only | Regulación REPROCANN exige inmutabilidad |
| 2026-03-28 | Repo en martinnpascual | Decisión del equipo |
| 2026-03-28 | PDF con @react-pdf | Sin backend Python disponible |

## Mejoras detectadas

| Mejora | Registrada en MEJORAS_PENDIENTES.md | Aplicada |
|--------|-------------------------------------|----------|
| Módulo enrollment-form (formulario público + gestión interna) | 🔲 Pendiente → M009 | 🔲 |
| Módulo stock-dual (medicinal vs comercial separados) | 🔲 Pendiente → M010 | 🔲 |
| Módulo cash-register (cierre de caja diario) | 🔲 Pendiente → M011 | 🔲 |
| Módulo supplier-manager (proveedores con estado de cuenta) | 🔲 Pendiente → M012 | 🔲 |
| Módulo calendar-view (calendario filtrable) | 🔲 Pendiente → M013 | 🔲 |
| Módulo events-manager (eventos con asistencia y balance) | 🔲 Pendiente → M014 | 🔲 |
| Módulo reports-export (reportes a PDF/Excel) | 🔲 Pendiente → M015 | 🔲 |
| Patrón de tablas inmutables (INSERT-only con RLS) | 🔲 Pendiente → M016 | 🔲 |

## Notas para Claude

- **Rubro regulado:** Las dispensas medicinales son INMUTABLES. No se pueden modificar ni eliminar. Para corregir errores, crear registro de anulación (nueva entrada).
- **Tablet-first:** El dispositivo principal es una tablet en el mostrador. Layout debe funcionar perfecto en 1024px.
- **UX para no-técnicos:** El equipo no tiene perfil técnico. Cada flujo debe ser obvio, con colores (verde/amarillo/rojo) y mínima navegación.
- **Flujo dispensa < 60 seg:** QR → verificación automática → cantidad → confirmar → listo.
- **Dos stocks separados:** Medicinal (cannabis por genética/lote, inmutable) ≠ Comercial (parafernalia/café, CRUD normal).
- **Datos de salud:** Información sensible. RLS estricto, no loggear datos personales.
