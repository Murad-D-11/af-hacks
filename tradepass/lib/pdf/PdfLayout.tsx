// Shared header/footer for every TradePass PDF, per the Context Pack: header "TradePass",
// footer disclaimer + page numbers on every page.
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { FONT_FAMILY } from './fonts';

export const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: '#0f172a',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  headerSubtitle: { fontSize: 8, color: '#64748b' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#94a3b8', maxWidth: 420 },
  footerPage: { fontSize: 7, color: '#94a3b8' },
  h1: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  h2: { fontSize: 12, fontWeight: 'bold', marginTop: 14, marginBottom: 6, color: '#059669' },
  p: { fontSize: 10, lineHeight: 1.4, marginBottom: 4 },
  small: { fontSize: 8, color: '#64748b' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 140, fontSize: 9, color: '#64748b' },
  value: { flex: 1, fontSize: 9, color: '#0f172a' },
  box: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 8, marginBottom: 10 },
  boxAmber: { borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fffbeb', borderRadius: 4, padding: 8, marginBottom: 10 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowLast: { flexDirection: 'row' },
  tableHeaderCell: { flex: 1, fontSize: 8, fontWeight: 'bold', padding: 5, backgroundColor: '#f1f5f9', color: '#334155' },
  tableCell: { flex: 1, fontSize: 9, padding: 5 },
  signatureBox: { borderWidth: 1, borderColor: '#94a3b8', borderStyle: 'dashed', borderRadius: 4, height: 50, marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: '#64748b' },
  badgeGreen: { fontSize: 10, fontWeight: 'bold', color: '#065f46', backgroundColor: '#d1fae5', padding: 6, borderRadius: 4 },
  badgeAmber: { fontSize: 10, fontWeight: 'bold', color: '#92400e', backgroundColor: '#fef3c7', padding: 6, borderRadius: 4 },
});

export function PdfHeader({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerTitle}>TradePass</Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Prepared by TradePass for a Skilled Trades Ontario Trade Equivalency Assessment. STO makes all assessment
        decisions.
      </Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
