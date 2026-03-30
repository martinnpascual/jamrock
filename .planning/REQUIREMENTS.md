# REQUIREMENTS.md — Jamrock Club

## Módulos

| ID | Módulo | Fase | Estado |
|----|--------|------|--------|
| MOD-01 | Sistema base y gestión de usuarios | 1 | 🔲 pendiente |
| MOD-02 | Gestión de socios, REPROCANN y carnet digital | 1 | 🔲 pendiente |
| MOD-03 | Registro digital de dispensas medicinales | 1 | 🔲 pendiente |
| MOD-04 | Stock de material medicinal | 2 | 🔲 pendiente |
| MOD-05 | Ventas, stock comercial y cierre de caja | 2 | 🔲 pendiente |
| MOD-06 | Cuentas corrientes y pagos | 2 | 🔲 pendiente |
| MOD-07 | Dashboard operativo | 1 | 🔲 pendiente |
| MOD-08 | Vista de calendario | 3 | 🔲 pendiente |
| MOD-09 | Gestión de eventos | 3 | 🔲 pendiente |
| MOD-10 | Alertas y notificaciones automáticas | 3 | 🔲 pendiente |
| MOD-11 | Gestión de proveedores | 2 | 🔲 pendiente |
| MOD-12 | Formulario público de inscripción | 1 | 🔲 pendiente |
| MOD-13 | Reportes y exportaciones | 2 | 🔲 pendiente |

---

## Requerimientos funcionales

### MOD-01: Sistema base y gestión de usuarios

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-001 | Login con email/contraseña por usuario | v1 | 🔲 |
| RF-002 | 3 roles: gerente, secretaria, cultivador | v1 | 🔲 |
| RF-003 | Cada acción queda registrada con quién y cuándo (audit trail) | v1 | 🔲 |
| RF-004 | Gerente puede crear/editar/desactivar usuarios | v1 | 🔲 |
| RF-005 | Acceso restringido por rol en todas las vistas | v1 | 🔲 |

### MOD-02: Gestión de socios, estados REPROCANN y carnet digital

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-010 | CRUD completo de socios (datos personales, DNI, tel, email) | v1 | 🔲 |
| RF-011 | Estado REPROCANN por socio: activo, en trámite, vencido, cancelado | v1 | 🔲 |
| RF-012 | Fecha de vencimiento REPROCANN con actualización automática al vencer | v1 | 🔲 |
| RF-013 | Edición manual del estado REPROCANN por el equipo | v1 | 🔲 |
| RF-014 | Vista general con filtros: estado, cuota, tipo de socio | v1 | 🔲 |
| RF-015 | Generación automática de QR único al aprobar alta | v1 | 🔲 |
| RF-016 | Generación automática de carnet digital PDF (nombre, QR, estado, fecha alta) | v1 | 🔲 |
| RF-017 | Búsqueda global de socios accesible desde cualquier pantalla | v1 | 🔲 |
| RF-018 | Ficha individual del socio con historial completo | v1 | 🔲 |
| RF-019 | IDs legibles: SOC-0001, SOC-0002 | v1 | 🔲 |

### MOD-03: Registro digital de dispensas medicinales

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-020 | Selección de socio (por QR o búsqueda) | v1 | 🔲 |
| RF-021 | Verificación automática: REPROCANN activo + cuota al día | v1 | 🔲 |
| RF-022 | Registro: fecha, hora, socio, cantidad, genética, operador | v1 | 🔲 |
| RF-023 | Descuento automático del stock medicinal activo | v1 | 🔲 |
| RF-024 | Historial INMUTABLE: no se puede modificar ni eliminar ningún registro | v1 | 🔲 |
| RF-025 | Flujo completo en < 60 segundos | v1 | 🔲 |
| RF-026 | IDs legibles: DISP-0001 | v1 | 🔲 |
| RF-027 | Bloqueo si socio no cumple requisitos (REPROCANN vencido o cuota impaga) | v1 | 🔲 |

### MOD-04: Stock de material medicinal

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-030 | Carga de lotes: genética, cantidad (gramos), costo, fecha ingreso | v2 | 🔲 |
| RF-031 | Stock actual por genética (descuenta automáticamente por dispensas) | v2 | 🔲 |
| RF-032 | Historial de movimientos (ingresos y egresos por dispensa) | v2 | 🔲 |
| RF-033 | Balance general del stock medicinal | v2 | 🔲 |
| RF-034 | Vistas filtrables por genética | v2 | 🔲 |
| RF-035 | Completamente separado del stock comercial | v2 | 🔲 |

### MOD-05: Ventas, stock comercial y cierre de caja

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-040 | Registro de ventas (producto, cantidad, precio, método pago) | v2 | 🔲 |
| RF-041 | Descuento automático de stock comercial | v2 | 🔲 |
| RF-042 | Panel de stock comercial con alerta de stock bajo | v2 | 🔲 |
| RF-043 | Cierre de caja diario: reconcilia ventas + cobros del día | v2 | 🔲 |
| RF-044 | Registro de diferencia entre esperado y real | v2 | 🔲 |

### MOD-06: Cuentas corrientes y pagos

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-050 | Cuenta corriente individual por socio | v2 | 🔲 |
| RF-051 | Registro de pago: fecha, monto, concepto, método (efectivo/transferencia/mixto) | v2 | 🔲 |
| RF-052 | Soporte pagos parciales y saldos pendientes | v2 | 🔲 |
| RF-053 | Vista detallada de historial de pagos por socio | v2 | 🔲 |
| RF-054 | Total adeudado con desglose por movimiento | v2 | 🔲 |

### MOD-07: Dashboard operativo

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-060 | Accesos rápidos: Nuevo socio, Nueva dispensa, Cargar venta, Registrar pago | v1 | 🔲 |
| RF-061 | KPIs del día: dispensas, ventas del turno, cuotas vencidas, stock bajo | v1 | 🔲 |
| RF-062 | Vista gerente: socios activos totales, ingresos del día, alertas pendientes | v1 | 🔲 |
| RF-063 | Responsive tablet-first (1024px óptimo) | v1 | 🔲 |

### MOD-08: Vista de calendario

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-070 | Vista mensual y semanal | v3 | 🔲 |
| RF-071 | Filtros por tipo: dispensas, stock, acciones de socios, pagos, eventos | v3 | 🔲 |
| RF-072 | Click en entrada → detalle del registro correspondiente | v3 | 🔲 |

### MOD-09: Gestión de eventos

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-080 | CRUD de eventos: nombre, descripción, fecha, lugar | v3 | 🔲 |
| RF-081 | Lista de asistencia vinculada a socios del sistema | v3 | 🔲 |
| RF-082 | Tabla de costos e ingresos por evento | v3 | 🔲 |
| RF-083 | Balance automático (ingresos - costos) al cerrar evento | v3 | 🔲 |
| RF-084 | Historial de eventos consultable y comparable | v3 | 🔲 |

### MOD-10: Alertas y notificaciones automáticas

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-090 | Alerta Telegram: socios con cuota próxima a vencer | v3 | 🔲 |
| RF-091 | Alerta Telegram: REPROCANN próximo a expirar | v3 | 🔲 |
| RF-092 | Alerta Telegram: stock medicinal bajo por genética | v3 | 🔲 |
| RF-093 | Alerta Telegram: diferencia en cierre de caja | v3 | 🔲 |
| RF-094 | Alerta Telegram: nueva solicitud de inscripción | v3 | 🔲 |
| RF-095 | Actualización automática de estado REPROCANN al alcanzar fecha de vencimiento | v3 | 🔲 |
| RF-096 | Socios sin actividad de dispensa en período configurable | v3 | 🔲 |

### MOD-11: Gestión de proveedores

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-100 | CRUD proveedores con tipo (medicinal/comercial) | v2 | 🔲 |
| RF-101 | Historial de suministros: qué, cuándo, cuánto, a qué precio | v2 | 🔲 |
| RF-102 | Especificar si impactó stock medicinal o comercial | v2 | 🔲 |
| RF-103 | Estado de cuenta por proveedor: facturas, pagos, saldo pendiente | v2 | 🔲 |
| RF-104 | Vista resumen por proveedor (deuda actual, último suministro) | v2 | 🔲 |
| RF-105 | Filtrable por fecha, tipo, proveedor | v2 | 🔲 |

### MOD-12: Formulario público de inscripción

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-110 | Página pública (sin login) para solicitar ingreso al club | v1 | 🔲 |
| RF-111 | Captura: datos personales, situación REPROCANN, info adicional | v1 | 🔲 |
| RF-112 | Gestión interna: tabla con estados Aprobada/Rechazada/Pendiente | v1 | 🔲 |
| RF-113 | Al aprobar → crea socio automáticamente (pasa al flujo MOD-02) | v1 | 🔲 |
| RF-114 | Al rechazar → campo de motivo obligatorio | v1 | 🔲 |
| RF-115 | Pendiente → registrar qué datos faltan | v1 | 🔲 |
| RF-116 | Card en dashboard con conteo de solicitudes pendientes | v1 | 🔲 |
| RF-117 | Notificación in-app + Telegram al recibir nueva solicitud | v1 | 🔲 |
| RF-118 | Historial de solicitudes con filtros por estado, fecha, nombre | v1 | 🔲 |

### MOD-13: Reportes y exportaciones

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|-----------|--------|
| RF-120 | Reporte de dispensas por período (filtrable por socio, genética, operador, fecha) | v2 | 🔲 |
| RF-121 | Reporte financiero mensual (ingresos por concepto: cuotas, ventas, dispensas) | v2 | 🔲 |
| RF-122 | Listado de socios por estado (exportable para auditorías REPROCANN) | v2 | 🔲 |
| RF-123 | Reporte de movimientos de stock medicinal (ingresos/egresos por genética) | v2 | 🔲 |
| RF-124 | Resumen de cuentas corrientes (socios con deuda, total adeudado) | v2 | 🔲 |
| RF-125 | Exportación a PDF y Excel con un clic | v2 | 🔲 |
| RF-126 | Comparativa con meses anteriores | v2 | 🔲 |

---

## Requerimientos no funcionales (estándar)

| ID | Requerimiento | Estándar |
|----|--------------|----------|
| RNF-01 | Soft delete en todas las tablas (excepto inmutables) | `is_deleted`, `deleted_at`, `deleted_by` |
| RNF-02 | Audit trail INSERT-only | `audit_logs` inmutable |
| RNF-03 | RLS habilitado en todas las tablas | Políticas por rol (gerente, secretaria, cultivador) |
| RNF-04 | Variables de entorno | Nunca en código, siempre .env |
| RNF-05 | service_role_key solo en API routes | Nunca en componentes cliente |
| RNF-06 | TypeScript estricto | Zod para validación |
| RNF-07 | Layout tablet-first | Optimizado para 1024px (mostrador del club) |
| RNF-08 | Loading, empty y error states | En todas las vistas |
| RNF-09 | Dispensas inmutables | No UPDATE, no DELETE en dispensations |
| RNF-10 | Datos sensibles de salud | No en logs, no en URLs, no en consola |
| RNF-11 | Flujo de dispensa < 60 seg | Optimización UX crítica |
| RNF-12 | Sistema de colores por estado | Verde/Amarillo/Rojo consistente |

---

## Fuera de alcance

- Integración directa con REPROCANN (no existe API pública)
- App móvil nativa (iOS/Android) — web responsive
- Facturación electrónica (AFIP/ARBA) — fase futura
- Migración de datos históricos en papel
- Sitio web público institucional
- Portal del socio con login propio — fase futura
- Ciclo de cultivo completo (seed-to-sale) — fase futura
- Integración con medios de pago digitales — fase futura
