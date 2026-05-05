# Manual de Entrega — Jamrock Club

> Checklist de todo lo que hay que pedirle al cliente para poder lanzar, configurar y entregar el sistema funcionando en producción.

---

## 1. Identidad del club y branding

- **Nombre legal completo** de la asociación civil (tal como figura en documentación oficial).
- **Nombre comercial / de marca** (si es distinto).
- **Logo** en alta resolución: versión color, versión blanco, versión negro. Formatos: SVG (ideal), PNG con transparencia, JPG.
- **Favicon** (o lo generamos a partir del logo).
- **Paleta de colores institucional** (si quiere apartarse del default verde/amarillo/rojo).
- **Tipografía preferida** (si tiene alguna distinta a Inter).
- **Dirección física** del club (para carnet, PDFs y footer).
- **Email de contacto oficial**.
- **Teléfono** (si aplica, para carnet y recibos).
- **CUIT / datos fiscales** (para recibos y reportes).
- **Redes sociales** (Instagram, Facebook, WhatsApp) para footer.

---

## 2. Contenido legal y políticas

- **Estatuto de la asociación** (referencia para validaciones legales).
- **Texto de términos y condiciones** (para el formulario de inscripción pública).
- **Política de privacidad** (obligatoria por manejo de datos sensibles de salud — Ley 25.326 Argentina).
- **Política de manejo de datos REPROCANN** (qué se guarda, por cuánto tiempo, quién accede).
- **Texto de consentimiento informado** para el socio (al inscribirse).
- **Reglamento interno del club** (para uso de socios si se muestra en el sistema).

---

## 3. Credenciales y cuentas de servicios

El cliente tiene que crear (o darnos acceso a) las siguientes cuentas. Ideal que estén a **su nombre/email**, no al tuyo, para que el proyecto quede de él.

### 3.1 Supabase (base de datos + auth)
- Crear cuenta en [supabase.com](https://supabase.com).
- Crear proyecto nuevo (región: South America — São Paulo).
- Entregarte: email y contraseña **o** invitarte como miembro del proyecto.
- Plan inicial: Free (alcanza para empezar). Migrar a Pro (~$25/mes) cuando supere 500 MB o 50k MAU.

### 3.2 Vercel (hosting de la app Next.js)
- Crear cuenta en [vercel.com](https://vercel.com) (ideal con el mismo GitHub del club).
- Conectar con el repo de GitHub.
- Plan: Hobby (gratis) alcanza para empezar.

### 3.3 Railway (hosting de n8n para automatizaciones)
- Crear cuenta en [railway.app](https://railway.app).
- Plan: Hobby ($5/mes) — necesario para n8n corriendo 24/7.

### 3.4 GitHub
- Cuenta del club o personal del responsable técnico.
- Decidir si el repo queda **privado a nombre del cliente** o vos le transferís el repo al final.

### 3.5 Dominio
- **¿Ya tiene dominio?** Si sí, necesito acceso al panel del registrador (Nic.ar, GoDaddy, Namecheap, etc.) para configurar DNS → Vercel.
- **¿Quiere uno nuevo?** Sugerir opciones (ej: `jamrockclub.com.ar`, `jamrock.club`) y que lo compre a su nombre.
- Quién paga la renovación anual: **el cliente**.

### 3.6 Telegram Bot (notificaciones)
- El cliente debe crear un bot con [@BotFather](https://t.me/BotFather) en Telegram.
- Entregarte: `TELEGRAM_BOT_TOKEN`.
- Crear un grupo de Telegram con las personas que deben recibir avisos (gerente, secretarias).
- Agregar el bot al grupo y obtener el `TELEGRAM_CHAT_ID`.

### 3.7 Email transaccional (opcional pero recomendado)
Si se envían mails de confirmación de inscripción, recuperación de contraseña, etc.:
- Cuenta en **Resend** (3.000 emails/mes gratis) o **SendGrid**.
- Email remitente verificado con el dominio del club.

---

## 4. Usuarios iniciales del sistema

Lista en Excel/planilla con las personas que van a operar el sistema:

| Nombre completo | Email | Rol | Teléfono |
|-----------------|-------|-----|----------|
| Ej: Juan Pérez | juan@... | gerente | ... |
| Ej: María López | maria@... | secretaria | ... |
| Ej: Pedro Díaz | pedro@... | cultivador | ... |

**Roles disponibles:** `gerente`, `secretaria`, `cultivador` (ver matriz de permisos en CLAUDE.md).

- ¿Contraseñas iniciales las definís vos y se las pasás, o las generan ellos via "recuperar contraseña"?
- Foto de perfil de cada usuario (opcional, mejora UX).

---

## 5. Datos operativos iniciales (configuración del sistema)

- **Cuota mensual default** para socios estándar (monto en ARS).
- **Cuotas diferenciales** si hay tipos de socios distintos (ej: honorarios, medicinales, etc.).
- **Umbral de stock bajo** (default sugerido: 5 unidades / 10 gramos).
- **Umbral de alerta REPROCANN próximo a vencer** (default sugerido: 30 días antes).
- **Cantidad máxima de gramos por dispensa** (si aplica límite legal/interno).
- **Frecuencia máxima de dispensas por socio** (ej: 1 cada 7 días).
- **Horarios de atención** (para mostrar en dashboard).
- **Categorías de productos comerciales** (ej: merchandising, semillas, accesorios, etc.).

---

## 6. Migración de datos existentes

Si el club ya tiene datos (en Excel, Google Sheets, otro sistema):

### 6.1 Socios
- Planilla con: nombre, apellido, DNI, fecha de nacimiento, dirección, teléfono, email, estado REPROCANN, número REPROCANN, fecha de vencimiento REPROCANN, fecha de alta, tipo de socio, cuota.
- Fotos de socios (si tiene) — carpeta con nombre `{DNI}.jpg`.

### 6.2 Stock medicinal actual
- Genéticas existentes, cantidad en gramos, costo por gramo, fecha de lote, proveedor.

### 6.3 Productos comerciales actuales
- Nombre, descripción, categoría, precio, stock actual.

### 6.4 Proveedores
- Nombre, tipo (medicinal/comercial), contacto, teléfono, email, notas.

### 6.5 Cuentas corrientes / pagos pendientes
- Socios con deuda y monto.
- Historial de pagos del último año (para continuidad contable).

### 6.6 Eventos pasados / futuros programados
- Si quiere conservar histórico.

**Formato ideal:** Excel (.xlsx) con una hoja por entidad. Yo lo importo con scripts.

---

## 7. Hardware y entorno de uso

- **Tablet(s) donde se va a operar:** marca, modelo, SO (Android/iPad). Esto me permite testear en el dispositivo real.
- **Conexión a internet** del club: ¿WiFi estable? ¿Plan de datos de respaldo?
- **Impresora** (si quiere imprimir carnets o recibos): modelo y si tiene impresión inalámbrica.
- **Lector de QR:** ¿usa la cámara de la tablet o tiene scanner dedicado?

---

## 8. Documentación legal / REPROCANN

- **Formato del número REPROCANN** (ejemplo real de uno vigente para validar regex).
- **Documentos que debe cargar el socio al inscribirse:**
  - DNI frente
  - DNI dorso
  - Constancia REPROCANN
  - ¿Algún otro? (certificado médico, etc.)
- **Criterio de aprobación de solicitudes** (checklist que usa la secretaria).
- **Motivos típicos de rechazo** (para alimentar el dropdown de `rejection_reason`).

---

## 9. Accesos y permisos extra (si aplica)

- **Cuenta de Google Workspace** del club (si usan Drive/Calendar y queremos integrar).
- **Cuenta de MercadoPago / banco** (si en el futuro se integra cobro online — no es Fase 1).
- **WhatsApp Business** (si quieren integrar notificaciones por WA en vez de/además de Telegram).

---

## 10. Acuerdos del proyecto (definir antes de entregar)

- **Forma y cronograma de pago** del desarrollo.
- **Quién paga el hosting mensual** (Supabase Pro + Railway + dominio ≈ USD 30-40/mes).
- **Alcance del soporte post-lanzamiento:** ¿cuántos meses de garantía? ¿bugs incluidos, features nuevas no?
- **SLA:** tiempo de respuesta ante incidentes críticos.
- **Ventana de mantenimiento** acordada (ej: domingos 3am).
- **Política de backups:** Supabase hace backups automáticos en plan Pro. Acordar retención.
- **Entrega de credenciales finales:** documento cerrado con todas las contraseñas en un gestor (1Password, Bitwarden) compartido.

---

## 11. Capacitación del equipo

- **Día y hora** para capacitación presencial o por videollamada.
- **Quiénes participan** de cada rol.
- **Material de entrega:**
  - Manual de usuario por rol (gerente / secretaria / cultivador) en PDF.
  - Videos cortos (screencast) de los flujos principales: inscripción, dispensa, cierre de caja.
  - Acceso a ambiente de prueba para practicar antes de ir a producción.

---

## 12. Checklist final antes de ir a producción

- [ ] Todas las credenciales entregadas y configuradas en Vercel / Supabase.
- [ ] Dominio apuntando a Vercel con SSL activo.
- [ ] Usuarios iniciales creados con sus roles correctos.
- [ ] Datos migrados y verificados (contar registros, spot-check manual).
- [ ] Backups automáticos activados en Supabase.
- [ ] Bot de Telegram probado (enviar alerta de prueba).
- [ ] RLS verificado en todas las tablas (ningún rol ve más de lo que debe).
- [ ] Formulario público de inscripción probado end-to-end.
- [ ] Flujo de dispensa probado en la tablet real (< 60 segundos).
- [ ] Capacitación completada y material entregado.
- [ ] Documento de credenciales cerrado y entregado al cliente.
- [ ] Acuerdo de soporte firmado.

---

## 13. Plantilla de email para pedirle todo al cliente

> Hola [Nombre],
>
> Para arrancar con Jamrock Club necesito que me pases / creemos juntos lo siguiente. Te lo divido por bloques así vamos de a poco:
>
> **Ya mismo (bloqueante para empezar):**
> 1. Logo del club en alta (SVG/PNG) y paleta de colores si tenés una.
> 2. Lista de usuarios que van a operar el sistema (nombre, email, rol: gerente/secretaria/cultivador).
> 3. Crear cuenta en Supabase.com y en Vercel.com e invitarme con mi email: [tu email].
>
> **Esta semana:**
> 4. Planilla Excel con tus socios actuales (te paso el formato).
> 5. Stock medicinal actual y productos comerciales con precios.
> 6. Proveedores con datos de contacto.
> 7. Textos legales: términos, política de privacidad, consentimiento.
>
> **Antes del lanzamiento:**
> 8. Dominio (si ya tenés o querés comprar uno nuevo).
> 9. Bot de Telegram para notificaciones (te guío para crearlo).
> 10. Definir cronograma de capacitación.
>
> Cualquier duda me escribís. Saludos!

---

**Última actualización:** 2026-04-20
