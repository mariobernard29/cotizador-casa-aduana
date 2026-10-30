import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BusinessSettings, Quote, QuoteLine, Space } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { formatDate, formatLongDate, formatTime } from "@/lib/dates";
import { QUOTE_STATUS_LABEL } from "@/lib/quote-status";

const C = {
  ink: "#1d2b36",
  muted: "#5f6b73",
  navy: "#1f4e6e",
  teal: "#4f9198",
  sand: "#f6f2ea",
  line: "#d9d3c7",
  gold: "#a9844e",
};

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9, color: C.ink, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  brand: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 16 },
  logo: { width: 62, height: 64, marginRight: 12 },
  brandText: { flex: 1 },
  bizName: { fontFamily: "Times-Roman", fontSize: 16, lineHeight: 1.1, color: C.navy, letterSpacing: 1.5, marginBottom: 3 },
  bizLine: { color: C.muted, fontSize: 8, lineHeight: 1.4 },
  docBox: { alignItems: "flex-end", width: 170 },
  docTitle: { fontFamily: "Times-Roman", fontSize: 18, lineHeight: 1.1, color: C.navy, letterSpacing: 2, marginBottom: 4 },
  folio: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
  meta: { color: C.muted, fontSize: 8, lineHeight: 1.4 },
  rule: { height: 1, backgroundColor: C.navy, marginBottom: 14 },
  grid: { flexDirection: "row", gap: 14, marginBottom: 16 },
  panel: { flex: 1, backgroundColor: C.sand, padding: 10, borderRadius: 3 },
  panelTitle: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: C.teal, letterSpacing: 1.2, marginBottom: 5 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 70, color: C.muted },
  value: { flex: 1 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.navy, paddingBottom: 4, marginBottom: 2 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: C.navy, letterSpacing: 0.6 },
  tr: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.line },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 64, textAlign: "left", paddingLeft: 8 },
  cPrice: { width: 72, textAlign: "right" },
  cTotal: { width: 78, textAlign: "right" },
  detail: { color: C.muted, fontSize: 7.5, marginTop: 1 },
  totals: { alignSelf: "flex-end", width: 230, marginTop: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.navy, marginTop: 4, paddingTop: 5 },
  grandText: { fontFamily: "Helvetica-Bold", fontSize: 11, color: C.navy },
  section: { marginTop: 18 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: C.teal, letterSpacing: 1.2, marginBottom: 4 },
  para: { marginBottom: 2 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 6 },
  watermark: { position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontSize: 60, color: "#efebe3", fontFamily: "Helvetica-Bold", transform: "rotate(-24deg)" },
});

export interface QuotePdfProps {
  quote: Quote;
  lines: QuoteLine[];
  spaces: Space[];
  settings: BusinessSettings;
  menuName: string | null;
  logo: Buffer | null;
}

function qty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function QuoteDocument({ quote, lines, spaces, settings, menuName, logo }: QuotePdfProps) {
  const taxPct = `${(quote.tax_rate * 100).toFixed(quote.tax_rate * 100 % 1 ? 2 : 0)} %`;
  const terms = (quote.terms ?? settings.default_terms ?? "").split("\n").filter((l) => l.trim());
  const draft = quote.status === "borrador" || quote.status === "cancelada";

  return (
    <Document title={`Cotización ${quote.folio} · ${settings.name}`} author={settings.name} subject={quote.event_name} language="es">
      <Page size="LETTER" style={s.page}>
        {draft && <Text style={s.watermark} fixed>{quote.status === "borrador" ? "BORRADOR" : "CANCELADA"}</Text>}

        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo && <Image src={{ data: logo, format: "png" }} style={s.logo} />}
            <View style={s.brandText}>
              <Text style={s.bizName}>{settings.name.toUpperCase()}</Text>
              {settings.tagline && <Text style={s.bizLine}>{settings.tagline}</Text>}
              {settings.legal_name && <Text style={s.bizLine}>{settings.legal_name}{settings.tax_id ? ` · RFC ${settings.tax_id}` : ""}</Text>}
              {settings.address && <Text style={s.bizLine}>{settings.address}</Text>}
              {[settings.phone, settings.email].filter(Boolean).length > 0 && (
                <Text style={s.bizLine}>{[settings.phone, settings.email].filter(Boolean).join("  ·  ")}</Text>
              )}
              {settings.website && <Text style={s.bizLine}>{settings.website.replace(/^https?:\/\//, "")}</Text>}
            </View>
          </View>
          <View style={s.docBox}>
            <Text style={s.docTitle}>COTIZACIÓN</Text>
            <Text style={s.folio}>{quote.folio}{quote.version > 1 ? `  ·  v${quote.version}` : ""}</Text>
            <Text style={s.meta}>Elaborada: {formatDate(quote.issued_on, "d 'de' MMMM 'de' yyyy")}</Text>
            <Text style={s.meta}>Vigente hasta: {formatDate(quote.valid_until, "d 'de' MMMM 'de' yyyy")}</Text>
            {draft && <Text style={s.meta}>Estado: {QUOTE_STATUS_LABEL[quote.status]}</Text>}
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.grid}>
          <View style={s.panel}>
            <Text style={s.panelTitle}>CLIENTE</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{quote.client_name}</Text>
            {quote.client_company && <Text>{quote.client_company}</Text>}
            {quote.client_email && <Text>{quote.client_email}</Text>}
            {quote.client_phone && <Text>{quote.client_phone}</Text>}
          </View>
          <View style={[s.panel, { flex: 1.3 }]}>
            <Text style={s.panelTitle}>EVENTO</Text>
            <View style={s.row}><Text style={s.label}>Evento</Text><Text style={s.value}>{quote.event_name}{quote.event_type ? ` (${quote.event_type})` : ""}</Text></View>
            <View style={s.row}><Text style={s.label}>Fecha</Text><Text style={s.value}>{formatLongDate(quote.event_date)}</Text></View>
            {quote.start_time && (
              <View style={s.row}><Text style={s.label}>Horario</Text><Text style={s.value}>{formatTime(quote.start_time)} a {formatTime(quote.end_time)} h</Text></View>
            )}
            {spaces.length > 0 && (
              <View style={s.row}><Text style={s.label}>Espacio</Text><Text style={s.value}>{spaces.map((sp) => sp.name).join(", ")}</Text></View>
            )}
            {quote.guests != null && (
              <View style={s.row}><Text style={s.label}>Invitados</Text><Text style={s.value}>{quote.guests}</Text></View>
            )}
            {menuName && (
              <View style={s.row}><Text style={s.label}>Menú</Text><Text style={s.value}>{menuName}</Text></View>
            )}
          </View>
        </View>

        <View style={s.th} fixed>
          <Text style={[s.thText, s.cDesc]}>CONCEPTO</Text>
          <Text style={[s.thText, s.cQty]}>CANT.</Text>
          <Text style={[s.thText, s.cUnit]}>UNIDAD</Text>
          <Text style={[s.thText, s.cPrice]}>P. UNITARIO</Text>
          <Text style={[s.thText, s.cTotal]}>IMPORTE</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={s.tr} wrap={false}>
            <View style={s.cDesc}>
              <Text>{l.description}</Text>
              {l.detail && <Text style={s.detail}>{l.detail}</Text>}
            </View>
            <Text style={s.cQty}>{qty(l.quantity)}</Text>
            <Text style={s.cUnit}>{l.unit ?? ""}</Text>
            <Text style={s.cPrice}>{formatMoney(l.unit_price_cents)}</Text>
            <Text style={s.cTotal}>{formatMoney(l.line_total_cents)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{formatMoney(quote.subtotal_cents)}</Text></View>
          {quote.discount_cents > 0 && (
            <View style={s.totalRow}>
              <Text>Descuento{quote.discount_type === "percent" ? ` (${quote.discount_value} %)` : ""}</Text>
              <Text>-{formatMoney(quote.discount_cents)}</Text>
            </View>
          )}
          {quote.tax_mode === "added" ? (
            <View style={s.totalRow}><Text>IVA {taxPct}</Text><Text>{formatMoney(quote.tax_cents)}</Text></View>
          ) : null}
          <View style={s.grand}><Text style={s.grandText}>Total {settings.currency}</Text><Text style={s.grandText}>{formatMoney(quote.total_cents)}</Text></View>
          {quote.tax_mode === "included" && quote.tax_rate > 0 && (
            <Text style={[s.meta, { textAlign: "right", marginTop: 3 }]}>Incluye IVA {taxPct}: {formatMoney(quote.tax_cents)}</Text>
          )}
        </View>

        {quote.notes && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>NOTAS</Text>
            {quote.notes.split("\n").map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}
          </View>
        )}
        {terms.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>CONDICIONES COMERCIALES</Text>
            {terms.map((t, i) => <Text key={i} style={s.para}>• {t.replace(/^[•\-\s]+/, "")}</Text>)}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>{settings.name} · {quote.folio}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
