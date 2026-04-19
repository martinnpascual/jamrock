'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: 14,
  },
  clubName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 4,
    padding: 10,
  },
  metaLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    borderBottom: '1px solid #eeeeee',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 10,
    color: '#444444',
  },
  rowValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1.5px solid #111111',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  diffPositive: {
    color: '#16a34a',
  },
  diffNegative: {
    color: '#dc2626',
  },
  diffNeutral: {
    color: '#111111',
  },
  notesBox: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e8e8e8',
    borderRadius: 4,
    padding: 10,
  },
  notesText: {
    fontSize: 9,
    color: '#555555',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #eeeeee',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#aaaaaa',
  },
  stamp: {
    marginTop: 24,
    alignItems: 'center',
    padding: 12,
    border: '1px dashed #cccccc',
    borderRadius: 4,
  },
  stampLabel: {
    fontSize: 9,
    color: '#888888',
    marginBottom: 4,
  },
  stampLine: {
    width: 160,
    height: 1,
    backgroundColor: '#cccccc',
    marginBottom: 4,
  },
  stampSub: {
    fontSize: 8,
    color: '#aaaaaa',
  },
})

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface CashRegisterPDFProps {
  shift: 'mañana' | 'tarde'
  date: string          // e.g. "2026-04-19"
  expectedTotal: number
  actualTotal: number
  difference: number
  notes?: string
  salesTotal?: number
  paymentsTotal?: number
}

function CashRegisterDocument({
  shift, date, expectedTotal, actualTotal, difference, notes, salesTotal, paymentsTotal,
}: CashRegisterPDFProps) {
  const diffStyle = difference > 0 ? styles.diffPositive : difference < 0 ? styles.diffNegative : styles.diffNeutral
  const diffLabel = difference === 0 ? 'Cuadra perfecto' : difference > 0 ? 'Sobrante' : 'Faltante'
  const shiftLabel = shift === 'mañana' ? 'Mañana' : 'Tarde'
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const now = new Date()
  const closedAt = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <Document title={`Cierre de caja — Turno ${shiftLabel} — ${date}`} author="Jamrock Club">
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.clubName}>Jamrock Club</Text>
          </View>
          <Text style={styles.subtitle}>Asociación Civil · Sistema de gestión</Text>
        </View>

        <Text style={styles.docTitle}>Comprobante de cierre de caja</Text>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={[styles.metaValue, { fontSize: 10 }]}>{dateFormatted}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Turno</Text>
            <Text style={styles.metaValue}>{shiftLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Hora de cierre</Text>
            <Text style={styles.metaValue}>{closedAt}</Text>
          </View>
        </View>

        {/* Desglose de ingresos */}
        {(salesTotal !== undefined || paymentsTotal !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Desglose de ingresos</Text>
            {salesTotal !== undefined && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Ventas de productos</Text>
                <Text style={styles.rowValue}>{ARS(salesTotal)}</Text>
              </View>
            )}
            {paymentsTotal !== undefined && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Cuotas y pagos de socios</Text>
                <Text style={styles.rowValue}>{ARS(paymentsTotal)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Resumen de caja */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de caja</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Monto esperado en caja</Text>
            <Text style={styles.rowValue}>{ARS(expectedTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Monto contado</Text>
            <Text style={styles.rowValue}>{ARS(actualTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{diffLabel}</Text>
            <Text style={[styles.totalValue, diffStyle]}>
              {difference >= 0 ? '+' : ''}{ARS(difference)}
            </Text>
          </View>
        </View>

        {/* Notas */}
        {notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        )}

        {/* Firma */}
        <View style={styles.stamp}>
          <Text style={styles.stampLabel}>Responsable del turno</Text>
          <View style={styles.stampLine} />
          <Text style={styles.stampSub}>Firma y aclaración</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Jamrock Club — Cierre de caja {shiftLabel} {date}</Text>
          <Text style={styles.footerText}>Generado automáticamente</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadCashRegisterPDF(props: CashRegisterPDFProps): Promise<void> {
  const blob = await pdf(<CashRegisterDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cierre-caja-${props.shift}-${props.date}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
