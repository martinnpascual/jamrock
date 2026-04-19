"""Genera el manual de usuario PDF para el sistema de dispensas con pricing."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)

OUTPUT = "MANUAL_DISPENSAS_PRICING.pdf"
GREEN = HexColor("#2DC814")
DARK = HexColor("#0f172a")
SLATE = HexColor("#64748b")
AMBER = HexColor("#eab308")
RED = HexColor("#ef4444")
LIGHT_GREEN = HexColor("#dcfce7")
LIGHT_BG = HexColor("#f1f5f9")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle("Cover_Title", parent=styles["Title"],
    fontSize=28, leading=34, textColor=GREEN, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle("Cover_Sub", parent=styles["Normal"],
    fontSize=14, leading=18, textColor=SLATE, alignment=TA_CENTER, spaceAfter=4))
styles.add(ParagraphStyle("SectionH", parent=styles["Heading1"],
    fontSize=18, leading=22, textColor=DARK, spaceBefore=20, spaceAfter=10,
    borderWidth=0, borderPadding=0))
styles.add(ParagraphStyle("SubH", parent=styles["Heading2"],
    fontSize=14, leading=17, textColor=HexColor("#334155"), spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle("Body", parent=styles["Normal"],
    fontSize=10.5, leading=15, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle("BulletItem", parent=styles["Normal"],
    fontSize=10.5, leading=15, leftIndent=18, bulletIndent=6, spaceAfter=4))
styles.add(ParagraphStyle("StepNum", parent=styles["Normal"],
    fontSize=11, leading=15, leftIndent=24, bulletIndent=6, spaceAfter=4,
    textColor=DARK, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Note", parent=styles["Normal"],
    fontSize=9.5, leading=13, textColor=SLATE, leftIndent=12, spaceAfter=8,
    fontName="Helvetica-Oblique"))
styles.add(ParagraphStyle("Important", parent=styles["Normal"],
    fontSize=10, leading=14, textColor=HexColor("#92400e"),
    backColor=HexColor("#fef3c7"), borderWidth=1, borderColor=AMBER,
    borderPadding=8, borderRadius=4, spaceAfter=10))
styles.add(ParagraphStyle("Footer", parent=styles["Normal"],
    fontSize=8, textColor=SLATE, alignment=TA_CENTER))


def hr():
    return HRFlowable(width="100%", thickness=0.5, color=HexColor("#e2e8f0"),
                       spaceBefore=6, spaceAfter=6)

def tbl(data, col_widths=None):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


story = []

# ─── COVER ──────────────────────────────────────────────────────────────
story.append(Spacer(1, 4 * cm))
story.append(Paragraph("Jamrock Club", styles["Cover_Title"]))
story.append(Paragraph("Sistema de Gestion Interna", styles["Cover_Sub"]))
story.append(Spacer(1, 1.5 * cm))
story.append(HRFlowable(width="40%", thickness=2, color=GREEN,
                          spaceBefore=0, spaceAfter=0, hAlign="CENTER"))
story.append(Spacer(1, 1.5 * cm))
story.append(Paragraph("Manual de Usuario", styles["Cover_Title"]))
story.append(Paragraph("Dispensas con Precio por Gramo y Pago Automatico", styles["Cover_Sub"]))
story.append(Spacer(1, 2 * cm))
story.append(Paragraph("Version 1.0 — Abril 2026", styles["Cover_Sub"]))
story.append(PageBreak())

# ─── TOC ────────────────────────────────────────────────────────────────
story.append(Paragraph("Indice", styles["SectionH"]))
toc_items = [
    "1. Introduccion",
    "2. Configurar precio de venta en Stock",
    "3. Flujo de dispensa con precio",
    "4. Metodos de pago",
    "5. Verificacion en Pagos",
    "6. Cuentas Corrientes",
    "7. Caja diaria",
    "8. Preguntas frecuentes",
]
for item in toc_items:
    story.append(Paragraph(item, styles["Body"]))
story.append(PageBreak())

# ─── 1. INTRO ───────────────────────────────────────────────────────────
story.append(Paragraph("1. Introduccion", styles["SectionH"]))
story.append(Paragraph(
    "El sistema de dispensas de Jamrock Club ahora incluye <b>precio de venta por gramo</b> "
    "en cada lote de stock medicinal y <b>generacion automatica de pagos</b> al confirmar "
    "una dispensa. Esto elimina la necesidad de registrar el pago manualmente en /pagos.",
    styles["Body"]))
story.append(Spacer(1, 4 * mm))

story.append(Paragraph("Que cambia:", styles["SubH"]))
story.append(Paragraph(
    "\u2022  Cada lote tiene su propio <b>precio por gramo</b> (lo que se cobra al socio).",
    styles["BulletItem"]))
story.append(Paragraph(
    "\u2022  Al dispensar, el sistema muestra el <b>total a cobrar</b> en tiempo real.",
    styles["BulletItem"]))
story.append(Paragraph(
    "\u2022  Al confirmar, se crea el pago automaticamente con detalle de genetica, gramos y precio.",
    styles["BulletItem"]))
story.append(Paragraph(
    "\u2022  El pago aparece instantaneamente en <b>/pagos</b> y en la <b>cuenta corriente</b> del socio.",
    styles["BulletItem"]))
story.append(hr())

# ─── 2. STOCK ───────────────────────────────────────────────────────────
story.append(Paragraph("2. Configurar precio de venta en Stock", styles["SectionH"]))
story.append(Paragraph(
    "Antes de dispensar, cada lote debe tener su precio de venta configurado.",
    styles["Body"]))

story.append(Paragraph("Crear un nuevo lote:", styles["SubH"]))
story.append(Paragraph("1. Ir a <b>Stock</b> en el menu lateral.", styles["StepNum"]))
story.append(Paragraph("2. Click en <b>Nuevo lote</b>.", styles["StepNum"]))
story.append(Paragraph("3. Completar los campos:", styles["StepNum"]))
story.append(Spacer(1, 2 * mm))

story.append(tbl([
    ["Campo", "Descripcion", "Ejemplo"],
    ["Genetica / Variedad", "Nombre de la cepa", "OG Kush"],
    ["Gramos iniciales", "Cantidad total del lote", "500"],
    ["Costo por gramo ($)", "Lo que se pago al proveedor", "8.000"],
    ["Precio por gramo ($)", "Lo que se cobra al socio", "15.000"],
    ["Fecha del lote", "Fecha de ingreso", "09/04/2026"],
    ["Notas", "Observaciones opcionales", "Indoor, curado 30 dias"],
], col_widths=[4*cm, 6.5*cm, 4*cm]))

story.append(Spacer(1, 4 * mm))
story.append(Paragraph("4. Click en <b>Registrar lote</b>.", styles["StepNum"]))
story.append(Spacer(1, 3 * mm))
story.append(Paragraph(
    "IMPORTANTE: Si el precio por gramo es $0, la dispensa sera gratuita (sin cargo).",
    styles["Important"]))

story.append(Paragraph("Editar precio de un lote existente:", styles["SubH"]))
story.append(Paragraph(
    "Actualmente los precios se configuran al crear el lote. Para modificar el precio "
    "de un lote existente, contactar al administrador del sistema para actualizarlo "
    "directamente en la base de datos.",
    styles["Body"]))
story.append(hr())

# ─── 3. FLUJO ───────────────────────────────────────────────────────────
story.append(Paragraph("3. Flujo de dispensa con precio", styles["SectionH"]))
story.append(Paragraph(
    "El flujo de dispensa tiene 5 pasos. El precio se calcula automaticamente.",
    styles["Body"]))

story.append(Paragraph("Paso 1 — Identificar socio", styles["SubH"]))
story.append(Paragraph(
    "Buscar al socio por nombre, DNI, numero de socio o escanear su QR. "
    "Solo se puede dispensar a socios con REPROCANN <b>activo</b>.",
    styles["Body"]))

story.append(Paragraph("Paso 2 — Seleccionar genetica y cantidad", styles["SubH"]))
story.append(Paragraph("1. Seleccionar el <b>lote/genetica</b> del dropdown. "
    "Cada opcion muestra el stock disponible y el <b>precio por gramo</b>.", styles["StepNum"]))
story.append(Paragraph("2. Ingresar la <b>cantidad en gramos</b>.", styles["StepNum"]))
story.append(Paragraph("3. El sistema muestra automaticamente:", styles["StepNum"]))
story.append(Paragraph("\u2022  Precio por gramo del lote seleccionado", styles["BulletItem"]))
story.append(Paragraph("\u2022  Subtotal (gramos x precio/g)", styles["BulletItem"]))
story.append(Paragraph("\u2022  Opcion de aplicar descuento (5%, 10%, 15%, 20%, 25%)", styles["BulletItem"]))
story.append(Paragraph("\u2022  <b>Total final</b> a cobrar", styles["BulletItem"]))
story.append(Spacer(1, 2 * mm))
story.append(Paragraph(
    "Ejemplo: zaza a $15.000/g x 2g = <b>$30.000</b>",
    styles["Important"]))
story.append(Paragraph("4. Elegir <b>Solo dispensar</b> (ir directo al pago) o "
    "<b>Agregar productos</b> (sumar productos comerciales al pedido).", styles["StepNum"]))

story.append(Paragraph("Paso 3 — Productos (opcional)", styles["SubH"]))
story.append(Paragraph(
    "Si se eligio 'Agregar productos', se pueden sumar productos comerciales al carrito. "
    "El total se actualiza sumando dispensa + productos.",
    styles["Body"]))
story.append(PageBreak())

story.append(Paragraph("Paso 4 — Metodo de pago", styles["SubH"]))
story.append(Paragraph(
    "Si el total es mayor a $0, se debe seleccionar un metodo de pago:",
    styles["Body"]))
story.append(Spacer(1, 2 * mm))

story.append(tbl([
    ["Metodo", "Que pide", "Que pasa"],
    ["Efectivo", "Monto recibido", "Muestra el vuelto si corresponde"],
    ["Transferencia", "Monto transferido", "Solo confirmar"],
    ["Mixto", "Monto efectivo + transferencia", "Ambos montos deben cubrir el total"],
    ["Cuenta corriente", "Nada", "Se carga como deuda (fiado) en la CC del socio"],
], col_widths=[3.5*cm, 4.5*cm, 6.5*cm]))

story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Click en <b>Confirmar y registrar</b> para procesar.",
    styles["Body"]))

story.append(Paragraph("Paso 5 — Confirmacion", styles["SubH"]))
story.append(Paragraph(
    "El sistema muestra un resumen con:", styles["Body"]))
story.append(Paragraph("\u2022  Numero de transaccion (TXN-XXXXX)", styles["BulletItem"]))
story.append(Paragraph("\u2022  Numero de dispensa (DISP-XXXX)", styles["BulletItem"]))
story.append(Paragraph("\u2022  Total cobrado", styles["BulletItem"]))
story.append(Paragraph("\u2022  Estado del pago (Pagado / Fiado)", styles["BulletItem"]))
story.append(Paragraph("\u2022  Saldo actualizado de la cuenta corriente", styles["BulletItem"]))
story.append(hr())

# ─── 4. METODOS ─────────────────────────────────────────────────────────
story.append(Paragraph("4. Metodos de pago — Detalle", styles["SectionH"]))

story.append(Paragraph("Efectivo", styles["SubH"]))
story.append(Paragraph(
    "Ingresar el monto que entrega el socio. Si es mayor al total, el sistema calcula "
    "y muestra el <b>vuelto</b>. El monto en efectivo se suma automaticamente a la "
    "<b>caja del dia</b> (cash_registers).",
    styles["Body"]))

story.append(Paragraph("Transferencia", styles["SubH"]))
story.append(Paragraph(
    "Ingresar el monto transferido. No se suma a la caja diaria.",
    styles["Body"]))

story.append(Paragraph("Mixto", styles["SubH"]))
story.append(Paragraph(
    "Combinar efectivo + transferencia. Ambos montos deben sumar al menos el total. "
    "Solo la parte de efectivo se suma a la caja.",
    styles["Body"]))

story.append(Paragraph("Cuenta corriente (fiado)", styles["SubH"]))
story.append(Paragraph(
    "El total se carga como <b>debito</b> en la cuenta corriente del socio. "
    "No se crea pago ni se afecta la caja. El socio queda con deuda pendiente "
    "que debera saldar mas adelante.",
    styles["Body"]))
story.append(Spacer(1, 3 * mm))
story.append(Paragraph(
    "Si el lote tiene precio $0/g, el total sera $0 y no se mostraran opciones de pago. "
    "La dispensa se registra como 'sin cargo'.",
    styles["Note"]))
story.append(hr())

# ─── 5. PAGOS ───────────────────────────────────────────────────────────
story.append(Paragraph("5. Verificacion en Pagos", styles["SectionH"]))
story.append(Paragraph(
    "Los pagos generados automaticamente por dispensas aparecen en <b>/pagos</b> "
    "con la siguiente informacion:",
    styles["Body"]))
story.append(Spacer(1, 2 * mm))

story.append(tbl([
    ["Columna", "Valor de ejemplo"],
    ["Socio", "Lucia Fernandez — JR-001"],
    ["Concepto", "Dispensa"],
    ["Detalle", "Dispensa: zaza x 2g @ $15.000/g — DISP-0012"],
    ["Metodo", "Efectivo"],
    ["Monto", "$30.000"],
    ["Fecha", "09 de abr de 2026"],
], col_widths=[3.5*cm, 11*cm]))

story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Los stats <b>Cobrado hoy</b> y <b>Cobrado este mes</b> incluyen "
    "automaticamente los pagos de dispensa.",
    styles["Body"]))
story.append(hr())

# ─── 6. CC ──────────────────────────────────────────────────────────────
story.append(Paragraph("6. Cuentas Corrientes", styles["SectionH"]))
story.append(Paragraph(
    "Cada dispensa con pago genera dos movimientos automaticos en la cuenta corriente:",
    styles["Body"]))
story.append(Paragraph(
    "\u2022  <b>DEBITO</b>: por el total de la dispensa (lo que consume el socio).",
    styles["BulletItem"]))
story.append(Paragraph(
    "\u2022  <b>CREDITO</b>: por el pago realizado (se genera automaticamente por trigger).",
    styles["BulletItem"]))
story.append(Paragraph(
    "Resultado neto: el saldo de la CC no cambia si el socio paga al momento.",
    styles["Body"]))
story.append(Spacer(1, 3 * mm))
story.append(Paragraph(
    "Si se elige <b>cuenta corriente (fiado)</b>, solo se genera el DEBITO. "
    "El saldo baja (deuda). Cuando el socio pague, se registra el pago manualmente "
    "y el trigger genera el CREDITO correspondiente.",
    styles["Body"]))
story.append(hr())

# ─── 7. CAJA ────────────────────────────────────────────────────────────
story.append(Paragraph("7. Caja diaria", styles["SectionH"]))
story.append(Paragraph(
    "Cuando una dispensa se paga con <b>efectivo</b> (total o parcial en mixto), "
    "el monto en efectivo se suma automaticamente al <b>expected_total</b> de la caja "
    "del dia. Si no existe una caja para hoy, se crea automaticamente.",
    styles["Body"]))
story.append(Paragraph(
    "Las transferencias NO se suman a la caja diaria.",
    styles["Note"]))
story.append(hr())

# ─── 8. FAQ ─────────────────────────────────────────────────────────────
story.append(Paragraph("8. Preguntas frecuentes", styles["SectionH"]))

faqs = [
    ("Como cambio el precio de un lote ya creado?",
     "Actualmente se debe modificar directamente en la base de datos (Supabase). "
     "Contactar al administrador. Los lotes nuevos se crean con el precio correcto desde el formulario."),
    ("Que pasa si el precio por gramo es $0?",
     "La dispensa se registra como 'sin cargo'. No se muestran opciones de pago ni se genera pago automatico."),
    ("Se puede anular una dispensa?",
     "Si, solo el gerente puede anular dispensas. Se crea un registro de anulacion (la tabla es inmutable, "
     "nunca se borra). El stock se devuelve automaticamente."),
    ("El pago aparece dos veces (en Pagos y en Cuentas Corrientes)?",
     "No es duplicado. En /pagos aparece el registro del cobro. En Cuentas Corrientes aparecen los "
     "movimientos (debito por consumo + credito por pago). Son vistas complementarias."),
    ("Que pasa si no hay caja abierta?",
     "El sistema crea una caja automaticamente para el dia con el monto en efectivo."),
    ("Puedo agregar productos comerciales a la dispensa?",
     "Si. En el Paso 2, elegir 'Agregar productos' en vez de 'Solo dispensar'. "
     "El total sumara dispensa + productos."),
]

for q, a in faqs:
    story.append(KeepTogether([
        Paragraph(f"<b>P: {q}</b>", styles["Body"]),
        Paragraph(f"R: {a}", styles["Body"]),
        Spacer(1, 3 * mm),
    ]))

# ─── FOOTER PAGE ────────────────────────────────────────────────────────
story.append(Spacer(1, 2 * cm))
story.append(HRFlowable(width="100%", thickness=1, color=GREEN,
                          spaceBefore=6, spaceAfter=12))
story.append(Paragraph("Jamrock Club — Sistema de Gestion Interna", styles["Footer"]))
story.append(Paragraph("Manual generado automaticamente — Abril 2026", styles["Footer"]))

# ─── BUILD ──────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2 * cm,
    rightMargin=2 * cm,
    topMargin=2 * cm,
    bottomMargin=2 * cm,
    title="Manual de Usuario — Dispensas con Pricing",
    author="Jamrock Club",
)
doc.build(story)
print(f"PDF generado: {OUTPUT}")
