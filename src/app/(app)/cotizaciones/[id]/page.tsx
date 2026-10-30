import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileDown, Info } from "lucide-react";
import { getQuote } from "@/server/queries";
import { Section } from "@/components/page-header";
import { QuoteStatusBadge, ReservationBadge } from "@/components/status-badge";
import { QuoteDetailActions, ReservationActions } from "./quote-detail-actions";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime, formatLongDate, formatTime } from "@/lib/dates";
import {
  QUOTE_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  type QuoteStatus,
  type ReservationStatus,
} from "@/lib/quote-status";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getQuote(id);
  return { title: d ? d.quote.folio : "Cotización" };
}

function statusLabel(kind: "quote" | "reservation", s: string | null) {
  if (!s) return "—";
  return kind === "quote" ? QUOTE_STATUS_LABEL[s as QuoteStatus] ?? s : RESERVATION_STATUS_LABEL[s as ReservationStatus] ?? s;
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getQuote(id);
  if (!detail) notFound();
  const { quote: q, lines, spaces, history, revisions, menuName } = detail;
  const canReserve = !!(q.start_time && q.end_time && spaces.length);

  return (
    <>
      <Link href="/cotizaciones" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title tabular">{q.folio}</h1>
            {q.version > 1 && <span className="text-sm text-muted-foreground">v{q.version}</span>}
            <QuoteStatusBadge status={q.status} />
            <ReservationBadge status={q.reservation_status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {q.event_name} · {q.client_name}
          </p>
        </div>
        <div className="lg:text-right">
          <QuoteDetailActions id={q.id} folio={q.folio} status={q.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Evento">
              <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd>{formatLongDate(q.event_date)}</dd>
                <dt className="text-muted-foreground">Horario</dt>
                <dd>{q.start_time ? `${formatTime(q.start_time)} a ${formatTime(q.end_time)} h` : <span className="text-amber-700">Sin definir</span>}</dd>
                <dt className="text-muted-foreground">Espacios</dt>
                <dd>{spaces.length ? spaces.map((s) => s.name).join(", ") : <span className="text-amber-700">Sin definir</span>}</dd>
                <dt className="text-muted-foreground">Invitados</dt>
                <dd>{q.guests ?? "—"}</dd>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{q.event_type ?? "—"}</dd>
                <dt className="text-muted-foreground">Menú</dt>
                <dd>{menuName ?? "—"}</dd>
              </dl>
            </Section>
            <Section title="Cliente">
              <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{q.client_name}</dd>
                {q.client_company && (
                  <>
                    <dt className="text-muted-foreground">Empresa</dt>
                    <dd>{q.client_company}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Correo</dt>
                <dd className="break-all">{q.client_email ? <a className="underline-offset-4 hover:underline" href={`mailto:${q.client_email}`}>{q.client_email}</a> : "—"}</dd>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{q.client_phone ? <a className="underline-offset-4 hover:underline" href={`tel:${q.client_phone}`}>{q.client_phone}</a> : "—"}</dd>
                <dt className="text-muted-foreground">Elaborada</dt>
                <dd>{formatDate(q.issued_on)}</dd>
                <dt className="text-muted-foreground">Vence</dt>
                <dd>{formatDate(q.valid_until)}</dd>
              </dl>
            </Section>
          </div>

          <Section title="Reserva de fecha">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  {q.reservation_status === "confirmada"
                    ? "La fecha está confirmada; nadie más puede reservar estos espacios en ese horario."
                    : q.reservation_status === "apartado"
                      ? "La fecha está apartada de forma tentativa. Para confirmarla, la cotización debe estar aceptada."
                      : "Aparta la fecha mientras el cliente decide; confírmala cuando la cotización esté aceptada y se cumplan los requisitos comerciales."}
                </p>
              </div>
              <ReservationActions id={q.id} status={q.status} reservation={q.reservation_status} canReserve={canReserve} />
            </div>
          </Section>

          <Section title="Partidas" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pl-4 font-medium">Concepto</th>
                    <th className="py-2 text-right font-medium">Cant.</th>
                    <th className="py-2 pl-3 font-medium">Unidad</th>
                    <th className="py-2 text-right font-medium">P. unitario</th>
                    <th className="py-2 pr-4 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 pl-4">
                        <div className="font-medium">{l.description}</div>
                        {l.detail && <div className="text-xs text-muted-foreground">{l.detail}</div>}
                      </td>
                      <td className="py-2 text-right tabular">{l.quantity}</td>
                      <td className="py-2 pl-3 text-muted-foreground">{l.unit}</td>
                      <td className="py-2 text-right tabular">{formatMoney(l.unit_price_cents)}</td>
                      <td className="py-2 pr-4 text-right font-medium tabular">{formatMoney(l.line_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto grid max-w-xs gap-1.5 border-t p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{formatMoney(q.subtotal_cents)}</dd>
              </div>
              {q.discount_cents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descuento{q.discount_type === "percent" ? ` (${q.discount_value} %)` : ""}</dt>
                  <dd className="tabular text-destructive">−{formatMoney(q.discount_cents)}</dd>
                </div>
              )}
              {q.tax_mode === "added" && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">IVA {+(q.tax_rate * 100).toFixed(2)} %</dt>
                  <dd className="tabular">{formatMoney(q.tax_cents)}</dd>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between border-t pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="text-xl font-semibold tabular">{formatMoney(q.total_cents)}</dd>
              </div>
              {q.tax_mode === "included" && q.tax_rate > 0 && (
                <p className="text-right text-xs text-muted-foreground">
                  Incluye IVA {+(q.tax_rate * 100).toFixed(2)} %: {formatMoney(q.tax_cents)}
                </p>
              )}
            </dl>
          </Section>

          {(q.notes || q.terms) && (
            <Section title="Notas y condiciones">
              {q.notes && <p className="mb-3 text-sm whitespace-pre-line">{q.notes}</p>}
              {q.terms && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {q.terms
                    .split("\n")
                    .filter((t) => t.trim())
                    .map((t, i) => (
                      <li key={i}>{t.replace(/^[•\-\s]+/, "")}</li>
                    ))}
                </ul>
              )}
            </Section>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Section title="Vista previa" bodyClassName="p-0" className="overflow-hidden">
            <iframe
              title={`Vista previa ${q.folio}`}
              src={`/api/cotizaciones/${q.id}/pdf#view=FitH&toolbar=0`}
              className="hidden h-[520px] w-full bg-muted xl:block"
            />
            <a href={`/api/cotizaciones/${q.id}/pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 text-sm underline-offset-4 hover:underline">
              <FileDown className="size-4" /> Abrir PDF en una pestaña nueva
            </a>
          </Section>

          {revisions.length > 0 && (
            <Section title="Versiones enviadas">
              <ul className="grid gap-2 text-sm">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>
                      v{r.version} · {formatDateTime(r.created_at)}
                    </span>
                    {r.pdf_path ? (
                      <a className="text-primary underline-offset-4 hover:underline" href={`/api/cotizaciones/${q.id}/pdf?version=${r.version}`} target="_blank" rel="noreferrer">
                        PDF enviado
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin archivo</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Historial">
            <ol className="relative grid gap-3 border-l pl-4 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <p>
                    {h.kind === "reservation" ? "Reserva: " : ""}
                    {h.from_status ? `${statusLabel(h.kind, h.from_status)} → ` : ""}
                    <b>{statusLabel(h.kind, h.to_status)}</b>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(h.changed_at)}
                    {h.changed_by_name ? ` · ${h.changed_by_name}` : h.changed_by ? "" : " · Sistema"}
                  </p>
                  {h.note && <p className="text-xs text-muted-foreground italic">{h.note}</p>}
                </li>
              ))}
            </ol>
            {q.duplicated_from && (
              <p className="mt-4 text-xs text-muted-foreground">
                Duplicada de{" "}
                <Link className="underline" href={`/cotizaciones/${q.duplicated_from}`}>
                  otra cotización
                </Link>
                .
              </p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
