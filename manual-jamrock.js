const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents
} = require("docx");

// Colors
const GREEN = "2DC814";
const DARK = "111111";
const GRAY = "666666";
const WHITE = "FFFFFF";
const ACCENT = "16a34a";

const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1a1a1a", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 18 })] })],
  });
}

function cell(text, width, opts = {}) {
  const runs = [];
  if (opts.bold) {
    runs.push(new TextRun({ text, bold: true, font: "Arial", size: 18, color: opts.color || "333333" }));
  } else {
    runs.push(new TextRun({ text, font: "Arial", size: 18, color: opts.color || "333333" }));
  }
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: runs })],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 36, color: DARK })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: "1a1a1a" })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: "333333" })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    alignment: opts.align,
    children: [new TextRun({ text, font: "Arial", size: 20, color: opts.color || "444444", bold: opts.bold, italics: opts.italic })],
  });
}

function paraRuns(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    children: runs.map(r => new TextRun({ font: "Arial", size: 20, color: "444444", ...r })),
  });
}

function bulletItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref || "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "444444" })],
  });
}

function bulletItemBold(boldPart, rest, ref) {
  return new Paragraph({
    numbering: { reference: ref || "bullets", level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({ text: boldPart, font: "Arial", size: 20, color: "333333", bold: true }),
      new TextRun({ text: rest, font: "Arial", size: 20, color: "444444" }),
    ],
  });
}

function importantBox(text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 1, color: GREEN }, bottom: { style: BorderStyle.SINGLE, size: 1, color: GREEN }, left: { style: BorderStyle.SINGLE, size: 6, color: GREEN }, right: { style: BorderStyle.SINGLE, size: 1, color: GREEN } },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: "f0fdf4", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [new Paragraph({ children: [
              new TextRun({ text: "IMPORTANTE: ", bold: true, font: "Arial", size: 20, color: ACCENT }),
              new TextRun({ text, font: "Arial", size: 20, color: "333333" }),
            ] })],
          }),
        ],
      }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

// ── Build document ──

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1a1a1a" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ═══════════ COVER PAGE ═══════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 3000 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "JAMROCK CLUB", font: "Arial", size: 60, bold: true, color: GREEN })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Sistema de Gesti\u00F3n Interna", font: "Arial", size: 32, color: GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: GREEN, space: 10 } },
          spacing: { before: 200, after: 100 },
          children: [],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "MANUAL DE USUARIO", font: "Arial", size: 44, bold: true, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Gu\u00EDa completa de uso del sistema", font: "Arial", size: 24, color: GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Versi\u00F3n 1.0 \u2014 Abril 2026", font: "Arial", size: 20, color: GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Confidencial \u2014 Uso interno exclusivo", font: "Arial", size: 18, color: "999999", italics: true })],
        }),
      ],
    },

    // ═══════════ TOC + MAIN CONTENT ═══════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD", space: 4 } },
            children: [
              new TextRun({ text: "Jamrock Club", font: "Arial", size: 16, color: GREEN, bold: true }),
              new TextRun({ text: "  |  Manual de Usuario", font: "Arial", size: 16, color: GRAY }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD", space: 4 } },
            children: [
              new TextRun({ text: "P\u00E1gina ", font: "Arial", size: 16, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY }),
            ],
          })],
        }),
      },
      children: [
        // TOC
        heading1("\u00CDndice"),
        new TableOfContents("Tabla de Contenidos", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 1. INTRODUCCION ═══════
        heading1("1. Introducci\u00F3n"),
        para("Jamrock Club es un sistema integral de gesti\u00F3n para clubes cann\u00E1bicos. Permite administrar socios, dispensas medicinales, stock, ventas comerciales, pagos, cuentas corrientes, eventos y reportes desde una interfaz web moderna y segura."),
        para("El sistema est\u00E1 dise\u00F1ado para uso en tablets (1024px) con tema oscuro, accesible desde cualquier navegador moderno."),
        spacer(),
        heading2("1.1. Acceso al sistema"),
        para("Ingres\u00E1 a la app desde el navegador:"),
        bulletItemBold("URL: ", "jamrock.vercel.app"),
        bulletItemBold("Login: ", "Ingres\u00E1 con tu email y contrase\u00F1a proporcionados por el gerente."),
        bulletItem("Si no ten\u00E9s cuenta, contact\u00E1 al gerente del club. Las cuentas se crean desde Supabase Authentication."),
        spacer(),

        heading2("1.2. Roles de usuario"),
        para("El sistema tiene tres roles con distintos niveles de acceso:"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 7360],
          rows: [
            new TableRow({ children: [headerCell("Rol", 2000), headerCell("Descripci\u00F3n y acceso", 7360)] }),
            new TableRow({ children: [
              cell("Gerente", 2000, { bold: true, shade: "f8f8f8" }),
              cell("Acceso total a todos los m\u00F3dulos. Puede crear/eliminar socios, abrir/cerrar caja, gestionar configuraci\u00F3n, ver reportes y administrar operadores.", 7360),
            ] }),
            new TableRow({ children: [
              cell("Secretaria", 2000, { bold: true, shade: "f8f8f8" }),
              cell("Acceso a la mayor\u00EDa de m\u00F3dulos operativos: socios, dispensas, ventas, pagos, cuentas corrientes, eventos y solicitudes. Sin acceso a Reportes ni Configuraci\u00F3n.", 7360),
            ] }),
            new TableRow({ children: [
              cell("Cultivador", 2000, { bold: true, shade: "f8f8f8" }),
              cell("Acceso limitado: Dashboard, Socios (lectura), Stock (puede crear lotes). No puede dispensar, vender ni gestionar pagos.", 7360),
            ] }),
          ],
        }),
        spacer(),

        heading2("1.3. Navegaci\u00F3n"),
        para("La barra lateral izquierda muestra solo los m\u00F3dulos disponibles seg\u00FAn tu rol. En dispositivos m\u00F3viles, la navegaci\u00F3n aparece como barra inferior."),
        para("En la parte inferior del sidebar se muestra tu nombre, rol y el bot\u00F3n de cerrar sesi\u00F3n."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 2. DASHBOARD ═══════
        heading1("2. Dashboard"),
        para("Es la primera pantalla tras iniciar sesi\u00F3n. Muestra un resumen en tiempo real del estado del club."),
        spacer(),
        heading2("2.1. Indicadores principales"),
        para("Visibles para todos los roles:"),
        bulletItemBold("Socios activos: ", "Cantidad de socios con REPROCANN activo."),
        bulletItemBold("Dispensas hoy: ", "N\u00FAmero de dispensas realizadas en el d\u00EDa."),
        bulletItemBold("Solicitudes pendientes: ", "Inscripciones esperando aprobaci\u00F3n."),
        bulletItemBold("REPROCANN vencidos: ", "Socios con carnet vencido (alerta roja)."),
        spacer(),
        para("Exclusivos del Gerente:", { bold: true }),
        bulletItemBold("Cuentas en deuda: ", "Cuentas corrientes con saldo negativo."),
        bulletItemBold("Ventas del d\u00EDa: ", "Monto total de checkouts pagados hoy."),
        bulletItemBold("Fiado del d\u00EDa: ", "Monto total cargado a cuenta corriente hoy (si aplica)."),
        spacer(),

        heading2("2.2. Panel de alertas"),
        para("Solo visible para el Gerente. Muestra alertas activas que requieren atenci\u00F3n:"),
        bulletItem("Socios con REPROCANN vencido (rojo)"),
        bulletItem("Solicitudes de inscripci\u00F3n pendientes (\u00E1mbar)"),
        bulletItem("Lotes de stock medicinal con menos de 50g (naranja)"),
        para("Cada alerta es clickeable y lleva al m\u00F3dulo correspondiente."),
        spacer(),

        heading2("2.3. Acciones r\u00E1pidas y \u00FAltimas dispensas"),
        para("Botones de acceso directo: Nuevo socio, Nueva dispensa, Solicitudes, Ver socios."),
        para("Tabla de las 5 dispensas m\u00E1s recientes con nombre del socio, gen\u00E9tica, n\u00FAmero y hora."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 3. SOCIOS ═══════
        heading1("3. Socios"),
        para("M\u00F3dulo central para la gesti\u00F3n del padr\u00F3n de miembros del club."),
        spacer(),

        heading2("3.1. Listado de socios"),
        para("Tabla filtrable y buscable con todos los socios activos."),
        bulletItemBold("Buscador: ", "Por nombre, apellido, DNI o n\u00FAmero de socio."),
        bulletItemBold("Filtro REPROCANN: ", "Activo, En tr\u00E1mite, Vencido, Cancelado."),
        bulletItem("Click en un socio para ver su perfil completo."),
        spacer(),

        heading2("3.2. Alta de nuevo socio"),
        para("Accesible desde el bot\u00F3n \u201CNuevo socio\u201D (solo Gerente y Secretaria)."),
        spacer(),
        heading3("Datos personales"),
        bulletItemBold("Nombre y Apellido: ", "Obligatorios."),
        bulletItemBold("DNI: ", "Obligatorio y \u00FAnico en el sistema. Si ya existe, muestra error."),
        bulletItem("Fecha de nacimiento, tel\u00E9fono, email y direcci\u00F3n (opcionales)."),
        spacer(),
        heading3("Membres\u00EDa"),
        bulletItemBold("Tipo de socio: ", "Est\u00E1ndar, Terap\u00E9utico u Honorario."),
        bulletItemBold("Cuota mensual: ", "Se pre-carga con el valor por defecto del club (configurable)."),
        spacer(),
        heading3("Estado REPROCANN"),
        bulletItemBold("Estado: ", "Activo, En tr\u00E1mite, Vencido o Cancelado."),
        bulletItem("N\u00FAmero de registro y fecha de vencimiento del REPROCANN."),
        spacer(),
        importantBox("El DNI debe ser \u00FAnico. No se pueden registrar dos socios con el mismo DNI. El n\u00FAmero de socio se asigna autom\u00E1ticamente."),
        spacer(),

        heading2("3.3. Perfil del socio"),
        para("Vista completa con todos los datos, historial de dispensas, pagos y estado de cuenta corriente. Desde aqu\u00ED se puede editar la informaci\u00F3n y generar el carnet digital del socio."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 4. DISPENSAS ═══════
        heading1("4. Dispensas"),
        para("M\u00F3dulo para registrar las entregas de cannabis medicinal a los socios. Accesible para Gerente y Secretaria."),
        spacer(),
        importantBox("Las dispensas son INMUTABLES. Una vez registradas, no pueden modificarse ni eliminarse. Esto es un requisito de compliance REPROCANN."),
        spacer(),

        heading2("4.1. Historial de dispensas"),
        para("Vista del historial completo con n\u00FAmero de dispensa, socio, gramos, gen\u00E9tica, tipo (Normal/Anulada) y fecha. Las anulaciones aparecen como registros separados."),
        spacer(),

        heading2("4.2. Nueva dispensa (Checkout)"),
        para("Flujo guiado de 5 pasos para registrar una entrega:"),
        spacer(),

        heading3("Paso 1 \u2014 Selecci\u00F3n de socio"),
        bulletItem("Busc\u00E1 al socio por nombre, apellido o n\u00FAmero de socio."),
        bulletItem("Se muestra el saldo de cuenta corriente (si est\u00E1 habilitado en configuraci\u00F3n)."),
        bulletItem("El socio debe tener REPROCANN activo para poder dispensar."),
        spacer(),

        heading3("Paso 2 \u2014 Dispensa medicinal"),
        bulletItemBold("Lote: ", "Seleccion\u00E1 el lote de cannabis. Solo aparecen lotes con stock disponible."),
        bulletItemBold("Gramos: ", "Ingres\u00E1 la cantidad (m\u00EDnimo 0.1g, paso de 0.5g)."),
        bulletItem("Si el cobro est\u00E1 habilitado: muestra precio por gramo, subtotal y opci\u00F3n de descuento (5%-25%)."),
        bulletItem("Pod\u00E9s elegir \u201CSolo dispensar\u201D (va directo al pago) o \u201CAgregar productos\u201D."),
        spacer(),

        heading3("Paso 3 \u2014 Productos comerciales (opcional)"),
        bulletItem("Cat\u00E1logo de productos comerciales disponibles con stock."),
        bulletItem("Agreg\u00E1 items al carrito. El resumen se ve en el panel lateral."),
        spacer(),

        heading3("Paso 4 \u2014 Pago"),
        para("M\u00E9todos de pago disponibles (configurable por el Gerente):"),
        bulletItemBold("Efectivo: ", "Con c\u00E1lculo autom\u00E1tico de vuelto."),
        bulletItemBold("Transferencia: ", "Pago electr\u00F3nico."),
        bulletItemBold("Mixto: ", "Parte efectivo + parte transferencia."),
        bulletItemBold("Cuenta corriente (fiado): ", "Solo si est\u00E1 habilitado. Genera deuda en la CC del socio."),
        spacer(),

        heading3("Paso 5 \u2014 Confirmaci\u00F3n"),
        bulletItem("Muestra el n\u00FAmero de dispensa asignado y el resumen de la operaci\u00F3n."),
        bulletItem("Bot\u00F3n para iniciar una nueva dispensa."),
        spacer(),
        importantBox("Los gramos se descuentan autom\u00E1ticamente del lote. Si el pago es fiado, se genera un movimiento negativo en la cuenta corriente del socio."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 5. STOCK MEDICINAL ═══════
        heading1("5. Stock Medicinal"),
        para("Gesti\u00F3n de los lotes de cannabis medicinal disponibles para dispensar. Accesible para todos los roles."),
        spacer(),

        heading2("5.1. Vista general"),
        para("Indicadores en la parte superior:"),
        bulletItemBold("Stock total: ", "Gramos disponibles en todos los lotes."),
        bulletItemBold("Lotes activos: ", "Cantidad de lotes con stock."),
        bulletItemBold("Stock bajo: ", "Lotes con menos de 50g (alerta visual)."),
        bulletItemBold("Agotados: ", "Lotes sin stock restante."),
        spacer(),

        heading2("5.2. Tarjeta de lote"),
        para("Cada lote muestra:"),
        bulletItem("Gen\u00E9tica/variedad y fecha del lote."),
        bulletItem("Gramos actuales vs. iniciales con barra de progreso."),
        bulletItem("Costo por gramo (si se registr\u00F3)."),
        bulletItem("Badge de estado: Activo / Stock bajo / Agotado."),
        spacer(),
        para("Al expandir la tarjeta:"),
        bulletItem("Historial de movimientos: cada dispensa que descont\u00F3 gramos del lote."),
        bulletItem("Anulaciones aparecen en rojo con signo positivo (reintegro de gramos)."),
        bulletItem("Bot\u00F3n \u201CDar de baja\u201D (solo Gerente) con confirmaci\u00F3n."),
        spacer(),

        heading2("5.3. Nuevo lote"),
        para("Accesible para Gerente y Cultivador. Campos:"),
        bulletItemBold("Gen\u00E9tica: ", "Nombre de la variedad (obligatorio)."),
        bulletItemBold("Gramos iniciales: ", "Cantidad del lote (obligatorio)."),
        bulletItem("Costo por gramo y fecha del lote (opcionales)."),
        bulletItem("Notas internas."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 6. VENTAS Y CAJA ═══════
        heading1("6. Ventas y Caja"),
        para("M\u00F3dulo de punto de venta para productos comerciales y gesti\u00F3n de caja diaria. Accesible para Gerente y Secretaria. Tiene 3 pesta\u00F1as."),
        spacer(),

        heading2("6.1. Pesta\u00F1a Ventas"),
        bulletItem("Indicadores: ventas del d\u00EDa, transacciones, total de registros."),
        bulletItem("Listado de ventas con producto, cantidad, precio, socio, m\u00E9todo de pago y fecha."),
        bulletItemBold("Nueva venta: ", "Modal con selecci\u00F3n de producto (solo los que tienen stock), cantidad, precio unitario (pre-carga autom\u00E1tica), socio opcional y m\u00E9todo de pago."),
        bulletItem("El Gerente puede eliminar ventas (soft delete, reversible)."),
        spacer(),

        heading2("6.2. Pesta\u00F1a Productos"),
        bulletItem("Vista de cards por producto: nombre, categor\u00EDa, precio, stock actual."),
        bulletItem("Indicadores de stock: total, stock bajo, sin stock."),
        bulletItemBold("Nuevo producto (solo Gerente): ", "Nombre, descripci\u00F3n, categor\u00EDa, precio, stock inicial y umbral de alerta."),
        spacer(),

        heading2("6.3. Pesta\u00F1a Caja del d\u00EDa"),
        para("Solo el Gerente puede abrir y cerrar la caja."),
        spacer(),
        heading3("Apertura de caja"),
        bulletItem("Bot\u00F3n \u201CAbrir caja\u201D disponible solo si no hay caja abierta para el d\u00EDa."),
        bulletItem("Solo se permite una caja por d\u00EDa."),
        spacer(),
        heading3("Durante el d\u00EDa"),
        bulletItem("Panel de ingresos: ventas (cantidad + monto), pagos de socios, total esperado."),
        bulletItem("Se actualiza autom\u00E1ticamente con cada operaci\u00F3n."),
        spacer(),
        heading3("Cierre de caja"),
        bulletItemBold("Monto contado: ", "El Gerente ingresa el monto f\u00EDsico contado en caja."),
        bulletItemBold("Diferencia: ", "El sistema calcula la diferencia (sobrante, faltante o cero)."),
        bulletItem("Campo opcional de notas/observaciones del cierre."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 7. PAGOS ═══════
        heading1("7. Pagos de Socios"),
        para("Registro y seguimiento de pagos: cuotas, dispensas y otros conceptos. Accesible para Gerente y Secretaria."),
        spacer(),

        heading2("7.1. Vista principal"),
        bulletItemBold("Indicadores: ", "Cobrado hoy, cobrado este mes, total de registros."),
        bulletItem("Buscador por nombre del socio, concepto o n\u00FAmero de socio."),
        bulletItem("Cada pago muestra: socio (enlazable al perfil), concepto, m\u00E9todo, monto y fecha."),
        spacer(),

        heading2("7.2. Registrar pago"),
        para("Modal con campos:"),
        bulletItemBold("Socio: ", "Selector con b\u00FAsqueda (obligatorio)."),
        bulletItemBold("Concepto: ", "Cuota, Dispensa, etc."),
        bulletItemBold("Monto: ", "En pesos argentinos (obligatorio)."),
        bulletItemBold("M\u00E9todo: ", "Efectivo, Transferencia o Mixto."),
        bulletItem("Notas opcionales."),
        spacer(),

        heading2("7.3. Anulaci\u00F3n de pagos"),
        para("Solo el Gerente puede anular pagos. Aparece un bot\u00F3n al pasar el mouse sobre cada fila. Requiere confirmaci\u00F3n con el monto visible."),
        importantBox("La anulaci\u00F3n es un soft delete. El pago no desaparece de la base de datos, se marca como eliminado."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 8. CUENTAS CORRIENTES ═══════
        heading1("8. Cuentas Corrientes"),
        para("Gesti\u00F3n de saldos de socios y proveedores. Saldo negativo = deuda, saldo positivo = cr\u00E9dito a favor. Accesible para Gerente y Secretaria."),
        spacer(),

        heading2("8.1. Filtros"),
        bulletItemBold("B\u00FAsqueda: ", "Por nombre o n\u00FAmero."),
        bulletItemBold("Balance: ", "Todos / En deuda / A favor / Sin saldo."),
        bulletItemBold("Tipo: ", "Todos / Socios / Proveedores."),
        spacer(),

        heading2("8.2. Detalle de cuenta"),
        para("Al hacer click en una cuenta se accede al historial completo de movimientos:"),
        bulletItem("D\u00E9bitos (rojo): dispensas fiadas, compras cargadas a cuenta."),
        bulletItem("Cr\u00E9ditos (verde): pagos realizados por el socio."),
        bulletItem("Saldo actual actualizado en tiempo real."),
        bulletItem("Exportaci\u00F3n del historial de movimientos."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 9. PROVEEDORES ═══════
        heading1("9. Proveedores"),
        para("Directorio de proveedores del club con historial de suministros. Todos los roles pueden ver; solo el Gerente puede crear y eliminar."),
        spacer(),

        heading2("9.1. Datos del proveedor"),
        bulletItem("Nombre, tipo (Medicinal / Comercial / Ambos), contacto, tel\u00E9fono, email."),
        bulletItem("Estad\u00EDsticas en el encabezado: total, medicinales, comerciales."),
        spacer(),

        heading2("9.2. Historial de suministros"),
        para("Al expandir la tarjeta del proveedor:"),
        bulletItem("Lista de entregas: descripci\u00F3n, unidades, costo total y fecha."),
        bulletItem("Gasto total acumulado con el proveedor."),
        bulletItem("Notas internas."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 10. EVENTOS Y CALENDARIO ═══════
        heading1("10. Eventos y Calendario"),
        spacer(),

        heading2("10.1. Gesti\u00F3n de eventos"),
        para("M\u00F3dulo para crear y gestionar actividades del club. Todos pueden ver; solo el Gerente puede crear, modificar y eliminar."),
        spacer(),
        heading3("Estados de evento"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell("Estado", 2340), headerCell("Descripci\u00F3n", 7020)] }),
            new TableRow({ children: [cell("Planificado", 2340, { bold: true, color: "2563eb" }), cell("Evento agendado a futuro.", 7020)] }),
            new TableRow({ children: [cell("Activo", 2340, { bold: true, color: ACCENT }), cell("Evento en curso o abierto.", 7020)] }),
            new TableRow({ children: [cell("Cerrado", 2340, { bold: true }), cell("Evento finalizado. No permite cambios de asistencia.", 7020)] }),
            new TableRow({ children: [cell("Cancelado", 2340, { bold: true, color: "dc2626" }), cell("Evento cancelado.", 7020)] }),
          ],
        }),
        spacer(),

        heading3("Datos de cada evento"),
        bulletItem("Nombre, descripci\u00F3n, fecha/hora, ubicaci\u00F3n."),
        bulletItem("Balance financiero: costos vs. ingresos."),
        bulletItem("Panel de asistentes con control de asistencia (check/uncheck)."),
        bulletItem("Agregar o quitar asistentes desde un selector de socios."),
        spacer(),

        heading2("10.2. Calendario"),
        para("Vista mensual visual de todos los eventos. Accesible para todos los roles."),
        bulletItem("Grilla de 7 columnas (Dom-S\u00E1b) con navegaci\u00F3n por mes."),
        bulletItem("El d\u00EDa actual se resalta con un c\u00EDrculo verde."),
        bulletItem("Eventos como chips de color seg\u00FAn estado."),
        bulletItem("Panel lateral con detalle al hacer click en un evento."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 11. SOLICITUDES ═══════
        heading1("11. Solicitudes de Inscripci\u00F3n"),
        para("Bandeja de entrada para revisar solicitudes que llegan desde el formulario p\u00FAblico de inscripci\u00F3n. Accesible para Gerente y Secretaria."),
        spacer(),

        heading2("11.1. Flujo de inscripci\u00F3n"),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "El interesado completa el formulario p\u00FAblico ", font: "Arial", size: 20, color: "444444" }),
            new TextRun({ text: "(jamrock.vercel.app/inscripcion)", font: "Arial", size: 20, color: "444444", bold: true }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: "La solicitud aparece como \u201CPendiente\u201D en este m\u00F3dulo.", font: "Arial", size: 20, color: "444444" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: "El Gerente o Secretaria revisa los datos y decide:", font: "Arial", size: 20, color: "444444" })],
        }),
        spacer(),

        heading2("11.2. Aprobar solicitud"),
        bulletItem("Abre un modal de confirmaci\u00F3n."),
        bulletItem("Al aprobar, el sistema crea autom\u00E1ticamente el perfil del socio con n\u00FAmero asignado."),
        bulletItem("Se muestra un toast con el n\u00FAmero de socio y enlace al perfil."),
        spacer(),

        heading2("11.3. Rechazar solicitud"),
        bulletItem("Requiere ingresar un motivo de rechazo (obligatorio)."),
        bulletItem("El motivo queda registrado en la solicitud."),
        spacer(),
        importantBox("La aprobaci\u00F3n es irreversible desde la interfaz. Verificar bien los datos antes de aprobar."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 12. REPORTES ═══════
        heading1("12. Reportes"),
        para("Generaci\u00F3n y descarga de reportes en formato CSV para an\u00E1lisis externos. Solo accesible para el Gerente."),
        spacer(),

        heading2("12.1. Tipos de reporte"),
        spacer(),
        heading3("Dispensas"),
        bulletItem("Historial de entregas en el rango de fechas seleccionado."),
        bulletItem("Datos: N\u00BA de dispensa, socio, gramos, gen\u00E9tica, tipo, fecha."),
        bulletItem("Resumen: total de gramos dispensados en el per\u00EDodo."),
        bulletItem("Exporta a: dispensas_DESDE_HASTA.csv"),
        spacer(),

        heading3("Socios"),
        bulletItem("Padr\u00F3n completo (sin filtro de fechas)."),
        bulletItem("Datos: N\u00BA de socio, nombre, estado REPROCANN, tipo, fecha de alta."),
        bulletItem("Resumen: total de socios y cu\u00E1ntos tienen REPROCANN activo."),
        spacer(),

        heading3("Financiero"),
        bulletItem("Ventas y pagos en el rango de fechas."),
        bulletItem("Ventas: producto, total, m\u00E9todo de pago, fecha."),
        bulletItem("Pagos de socios: socio, monto, concepto (Dispensa/Cuota), m\u00E9todo, fecha."),
        bulletItem("Genera dos archivos CSV separados: ventas y pagos."),
        spacer(),

        heading3("Stock medicinal"),
        bulletItem("Estado actual de todos los lotes (sin filtro de fechas)."),
        bulletItem("Datos: gen\u00E9tica, gramos iniciales/actuales/dispensados, costo/g, fecha."),
        spacer(),
        importantBox("Todos los CSV se generan con codificaci\u00F3n UTF-8 compatible con Excel en espa\u00F1ol."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 13. CONFIGURACION ═══════
        heading1("13. Configuraci\u00F3n"),
        para("Par\u00E1metros generales del club. Solo el Gerente puede modificar valores."),
        spacer(),

        heading2("13.1. Datos del club"),
        bulletItemBold("Nombre del club: ", "Nombre que aparece en la interfaz."),
        bulletItemBold("Direcci\u00F3n y tel\u00E9fono: ", "Datos de contacto del club."),
        bulletItemBold("Cuota mensual por defecto: ", "Valor base para nuevos socios."),
        bulletItemBold("M\u00E1ximo gramos por dispensa: ", "L\u00EDmite que el checkout respeta."),
        spacer(),

        heading2("13.2. Umbrales de alertas"),
        bulletItemBold("Stock medicinal bajo: ", "Gramos m\u00EDnimos antes de alertar (por defecto: 100g)."),
        bulletItemBold("REPROCANN \u2014 d\u00EDas de aviso: ", "D\u00EDas antes del vencimiento para mostrar alerta (por defecto: 30)."),
        bulletItemBold("Cuota \u2014 d\u00EDas sin pago: ", "D\u00EDas sin pagar para considerar mora (por defecto: 35)."),
        spacer(),

        heading2("13.3. Dispensas y Checkout"),
        bulletItemBold("Cobrar dispensa: ", "Toggle on/off. Si est\u00E1 habilitado, aparece el campo de precio por gramo."),
        bulletItemBold("Permitir cuenta corriente: ", "Toggle. Habilita la opci\u00F3n \u201CFiado\u201D en el checkout."),
        bulletItemBold("Mostrar saldo de CC: ", "Toggle. Muestra el saldo actual del socio durante el checkout."),
        spacer(),

        heading2("13.4. Operadores del sistema"),
        bulletItem("Lista de todos los usuarios con acceso al sistema."),
        bulletItem("Muestra nombre, rol (badge de color) y estado activo/inactivo."),
        bulletItem("El Gerente puede activar/desactivar operadores con un click."),
        spacer(),
        importantBox("Para crear nuevos usuarios, se debe usar Supabase Authentication directamente. No es posible crear usuarios desde la interfaz de Jamrock."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 14. FORMULARIO PUBLICO ═══════
        heading1("14. Formulario P\u00FAblico de Inscripci\u00F3n"),
        para("P\u00E1gina accesible sin autenticaci\u00F3n. Permite que cualquier interesado solicite membres\u00EDa al club."),
        spacer(),

        heading2("14.1. Campos del formulario"),
        bulletItemBold("Obligatorios: ", "Nombre, Apellido, DNI."),
        bulletItemBold("Opcionales: ", "Email, tel\u00E9fono, fecha de nacimiento, direcci\u00F3n."),
        bulletItemBold("Estado REPROCANN: ", "Selector con opciones: No tengo, Activo, En tr\u00E1mite, Vencido."),
        bulletItem("N\u00FAmero de registro REPROCANN (si tiene)."),
        bulletItem("Informaci\u00F3n adicional / motivaci\u00F3n (texto libre)."),
        spacer(),

        heading2("14.2. Qu\u00E9 pasa despu\u00E9s"),
        bulletItem("Al enviar, se genera una solicitud con estado \u201CPendiente\u201D."),
        bulletItem("La solicitud aparece en el m\u00F3dulo Solicitudes para que el Gerente o Secretaria la revise."),
        bulletItem("Si el DNI ya tiene una solicitud pendiente o ya es socio, se rechaza con mensaje de error."),
        bulletItem("El formulario muestra una pantalla de confirmaci\u00F3n tras el env\u00EDo exitoso."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════ 15. REGLAS DE NEGOCIO ═══════
        heading1("15. Reglas de Negocio Clave"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 6560],
          rows: [
            new TableRow({ children: [headerCell("Regla", 2800), headerCell("Detalle", 6560)] }),
            new TableRow({ children: [
              cell("Dispensas inmutables", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Una vez registrada, una dispensa no puede modificarse ni eliminarse. Solo existe la anulaci\u00F3n, que genera un registro separado y reintegra los gramos al lote.", 6560),
            ] }),
            new TableRow({ children: [
              cell("Soft delete", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Socios, lotes, proveedores, ventas y pagos nunca se eliminan f\u00EDsicamente. Se marcan como eliminados y pueden recuperarse.", 6560),
            ] }),
            new TableRow({ children: [
              cell("REPROCANN", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Solo los socios con REPROCANN activo pueden recibir dispensas. El sistema alerta sobre vencimientos pr\u00F3ximos.", 6560),
            ] }),
            new TableRow({ children: [
              cell("Stock autom\u00E1tico", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Cada dispensa descuenta gramos del lote autom\u00E1ticamente. Las anulaciones los reintegran.", 6560),
            ] }),
            new TableRow({ children: [
              cell("Cuenta corriente", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Los pagos \u201Cfiados\u201D generan saldo negativo (deuda). Los pagos registrados reducen la deuda.", 6560),
            ] }),
            new TableRow({ children: [
              cell("DNI \u00FAnico", 2800, { bold: true, shade: "f8f8f8" }),
              cell("No pueden existir dos socios con el mismo DNI. Tampoco pueden existir dos solicitudes pendientes con el mismo DNI.", 6560),
            ] }),
            new TableRow({ children: [
              cell("Caja diaria", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Solo una caja por d\u00EDa. La apertura y cierre son exclusivos del Gerente. El cierre registra la diferencia entre lo esperado y lo contado.", 6560),
            ] }),
            new TableRow({ children: [
              cell("Configuraci\u00F3n central", 2800, { bold: true, shade: "f8f8f8" }),
              cell("Precio por gramo, gramos m\u00E1ximos, umbral de stock y alertas son par\u00E1metros configurables que afectan el comportamiento de todo el sistema.", 6560),
            ] }),
          ],
        }),
        spacer(),
        spacer(),

        // ═══════ FOOTER ═══════
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: GREEN, space: 10 } },
          spacing: { before: 400, after: 100 },
          children: [],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Jamrock Club \u2014 Sistema de Gesti\u00F3n Interna", font: "Arial", size: 20, color: GREEN, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Versi\u00F3n 1.0 \u2014 Abril 2026", font: "Arial", size: 18, color: GRAY })],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outputPath = "C:\\Users\\Martin\\jamrock\\MANUAL_JAMROCK_CLUB.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log("Manual generado: " + outputPath);
});
