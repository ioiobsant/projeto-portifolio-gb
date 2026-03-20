import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OrderItem } from '../types/order'

type OrderRow = OrderItem & { deliveryDateDisplay: string }

export type OrdersPdfDocumentRow = OrderRow

export function OrdersPdfDocument({
  rows,
  categoryLabel,
  statusLabel,
  materialLabel,
  foamLabel,
  searchLabel,
  sortLabel,
  generatedAt,
}: {
  rows: OrdersPdfDocumentRow[]
  categoryLabel: string
  statusLabel: string
  materialLabel: string
  foamLabel: string
  searchLabel: string
  sortLabel: string
  generatedAt: string
}) {
  const styles = pdfStyles

  const productLabel = (row: OrdersPdfDocumentRow) => {
    const base = `${row.category} - ${row.model}`
    return row.size ? `${base} (${row.size})` : base
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Pedidos</Text>
          <View style={styles.meta}>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Categoria:</Text> {categoryLabel}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Status:</Text> {statusLabel}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Material:</Text> {materialLabel}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Tipo de esponja:</Text> {foamLabel}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>{searchLabel}</Text>
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Ordenação:</Text> {sortLabel}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Quantidade:</Text> {rows.length}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Gerado em:</Text> {generatedAt}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.th, styles.colPedido]}>
              <Text style={styles.thText}>Pedido</Text>
            </View>
            <View style={[styles.th, styles.colCliente]}>
              <Text style={styles.thText}>Cliente</Text>
            </View>
            <View style={[styles.th, styles.colProduto]}>
              <Text style={styles.thText}>Produto</Text>
            </View>
            <View style={[styles.th, styles.colEntrega]}>
              <Text style={styles.thText}>Data de Entrega</Text>
            </View>
            <View style={[styles.th, styles.colStatus]}>
              <Text style={styles.thText}>Status</Text>
            </View>
          </View>

          {rows.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <View style={[styles.td, styles.colPedido]}>
                <Text style={styles.tdText}>{row.id}</Text>
              </View>
              <View style={[styles.td, styles.colCliente]}>
                <Text style={styles.tdText}>{row.customer.name}</Text>
              </View>
              <View style={[styles.td, styles.colProduto]}>
                <Text style={styles.tdText}>{productLabel(row)}</Text>
              </View>
              <View style={[styles.td, styles.colEntrega]}>
                <Text style={styles.tdText}>{row.deliveryDateDisplay}</Text>
              </View>
              <View style={[styles.td, styles.colStatus]}>
                <Text style={styles.tdText}>{row.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 6,
  },
  meta: {
    gap: 2,
  },
  metaLine: {
    fontSize: 10,
    lineHeight: 1.35,
  },
  metaStrong: {
    fontWeight: 700,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  th: {
    padding: 6,
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  td: {
    padding: 6,
    borderRightWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'flex-start',
  },
  thText: {
    fontWeight: 700,
    fontSize: 10,
  },
  tdText: {
    fontSize: 10,
    lineHeight: 1.3,
  },
  colPedido: { width: '20%' },
  colCliente: { width: '24%' },
  colProduto: { width: '26%' },
  colEntrega: { width: '15%' },
  colStatus: { width: '15%' },
})

