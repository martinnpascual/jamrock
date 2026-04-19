# ROADMAP.md — Jamrock Club

## Vista general

| Fase | Nombre | Módulos | Duración estimada | Estado |
|------|--------|---------|-------------------|--------|
| 1 | MVP: Core operativo, dispensas e inscripción | MOD-01, 02, 03, 07, 12 | 8-12 semanas | 🔲 |
| 2 | Stock, operaciones, finanzas, proveedores, reportes | MOD-04, 05, 06, 11, 13 | 11-16 semanas | 🔲 |
| 3 | Funcionalidades avanzadas y automatización | MOD-08, 09, 10 | 5-8 semanas | 🔲 |

## Roadmap futuro (fuera de alcance actual)
| Fase | Nombre | Descripción |
|------|--------|-------------|
| 4 (futura) | Portal del socio | URL con login para que cada socio consulte su info |
| 5 (futura) | App móvil con QR | Extensión nativa iOS/Android |
| 6 (futura) | Seed-to-sale | Trazabilidad de cultivo completa |

---

## Fase 1 — MVP: Core operativo, dispensas e inscripción pública

**Objetivo:** Sistema funcional en producción con gestión de socios, dispensas inmutables, dashboard operativo y formulario público. El club puede operar sin papel desde el primer día.

**Entregable:** Sistema en Vercel con auth, socios REPROCANN, dispensas, dashboard y formulario público activo.

### Wave 1.1 — Setup + Auth (MOD-01)
- [ ] Crear repo con estructura Next.js 14 estándar
- [ ] Configurar Supabase (tablas base, RLS, auth)
- [ ] Implementar login/logout
- [ ] Configurar 3 roles (gerente, secretaria, cultivador)
- [ ] Middleware de protección por rol
- [ ] Layout base: sidebar + main content (tablet-first)
- [ ] Deploy inicial a Vercel

### Wave 1.2 — Gestión de socios + REPROCANN (MOD-02)
- [ ] CRUD de socios (datos personales, DNI, contacto)
- [ ] Estado REPROCANN (activo/en trámite/vencido/cancelado)
- [ ] Fecha de vencimiento con actualización automática
- [ ] IDs legibles (SOC-0001)
- [ ] Generación de QR único al alta
- [ ] Generación de carnet digital PDF
- [ ] Búsqueda global de socios
- [ ] Ficha individual con historial
- [ ] Vista general con filtros (estado, cuota, tipo)
- [ ] Sistema de colores verde/amarillo/rojo

### Wave 1.3 — Registro de dispensas (MOD-03)
- [ ] Selección de socio (QR scan o búsqueda)
- [ ] Verificación automática (REPROCANN + cuota)
- [ ] Registro: fecha, hora, socio, cantidad, genética, operador
- [ ] Historial inmutable (RLS: no UPDATE, no DELETE)
- [ ] IDs legibles (DISP-0001)
- [ ] Flujo completo < 60 segundos
- [ ] Bloqueo si socio no cumple requisitos

### Wave 1.4 — Dashboard + Inscripción pública (MOD-07, MOD-12)
- [ ] Dashboard: accesos rápidos (nuevo socio, nueva dispensa)
- [ ] KPIs del día (dispensas, cuotas vencidas, stock bajo)
- [ ] Vista gerente (resumen general + alertas)
- [ ] Formulario público de inscripción (sin login)
- [ ] Gestión interna: aprobada/rechazada/pendiente
- [ ] Al aprobar → crear socio automáticamente
- [ ] Card en dashboard: solicitudes pendientes
- [ ] Demo y validación con el club

---

## Fase 2 — Stock, operaciones, finanzas, proveedores y reportes

**Objetivo:** Control completo del stock medicinal y comercial, cierre de caja diario, cuentas corrientes, proveedores y panel de reportes exportables.

### Wave 2.1 — Stock medicinal (MOD-04)
- [ ] Carga de lotes (genética, gramos, costo, fecha)
- [ ] Stock actual por genética
- [ ] Historial de movimientos (ingresos y egresos)
- [ ] Balance general del stock medicinal
- [ ] Descuento automático por dispensas (integración MOD-03)

### Wave 2.2 — Ventas, stock comercial y cierre de caja (MOD-05)
- [ ] Registro de ventas (producto, qty, precio, método pago)
- [ ] Stock comercial con descuento automático
- [ ] Alerta de stock bajo
- [ ] Cierre de caja diario
- [ ] Reconciliación: ventas vs cobros

### Wave 2.3 — Cuentas corrientes y pagos (MOD-06)
- [ ] Cuenta corriente individual por socio
- [ ] Registro de pagos (efectivo, transferencia, mixto)
- [ ] Pagos parciales y saldos pendientes
- [ ] Vista detallada de historial por socio
- [ ] Total adeudado con desglose

### Wave 2.4 — Proveedores + Reportes (MOD-11, MOD-13)
- [ ] CRUD proveedores (medicinal/comercial)
- [ ] Historial de suministros
- [ ] Estado de cuenta por proveedor
- [ ] Reportes: dispensas, financiero, REPROCANN, stock, cuentas
- [ ] Exportación a PDF y Excel
- [ ] Demo y validación

---

## Fase 3 — Funcionalidades avanzadas y automatización

**Objetivo:** Vista de calendario activa, módulo de eventos funcional, alertas automáticas por Telegram configuradas.

### Wave 3.1 — Calendario y eventos (MOD-08, MOD-09)
- [ ] Vista mensual y semanal del calendario
- [ ] Filtros por tipo de evento
- [ ] Click → detalle del registro
- [ ] CRUD de eventos con asistencia
- [ ] Costos, ingresos y balance por evento

### Wave 3.2 — Alertas automáticas (MOD-10)
- [ ] Configurar n8n + Telegram bot
- [ ] Alerta: cuota próxima a vencer
- [ ] Alerta: REPROCANN próximo a expirar
- [ ] Alerta: stock medicinal bajo
- [ ] Alerta: diferencia en cierre de caja
- [ ] Alerta: nueva solicitud de inscripción
- [ ] Actualización automática de REPROCANN al vencer
- [ ] Ajuste fino de todos los módulos
- [ ] Demo final y validación completa
