import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getQuotes, type QuoteListFilters } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { QuoteStatusBadge, ReservationBadge } from "@/components/status-badge";
import { QuoteRowActions } from "@/components/quotes/quote-actions";
import { QuoteFilters } from "./quote-filters";
import { formatMoney } from "@/lib/money";
import { addDaysISO, formatDate, formatTime, todayISO } from "@/lib/dates";
import { QUOTE_STATUSES, RESERVATION_STATUSES } from "@/lib/quote-status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cotizaciones" };

type SP = Record<string, string | undefined>;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: QuoteListFilters = {
    q: sp.q,
    status: QUOTE_STATUSES.includes(sp.estado as never) ? (sp.estado as QuoteListFilters["status"]) : "",
    reservation: RESERVATION_STATUSES.includes(sp.reserva as never) ? (sp.reserva as QuoteListFilters["reservation"]) : "",
    from: sp.desde,
    to: sp.hasta,
    sort: (sp.orden as QuoteListFilters["sort"]) ?? "created_desc",
  };

  const supabase = await createClient();
  await supabase.rpc("expire_quotes");
  const quotes = await getQuotes(filters);
  const today = todayISO();
  const soon = addDaysISO(today, 3);
  const filtered = !!(filters.q || filters.status || filters.reservation || filters.from || filters.to);

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description={`${quotes.length} ${quotes.length === 1 ? "cotización" : "cotizaciones"}${filtered ? " con los filtros aplicados" : ""}`}
        actions={
          <Button nativeButton={false} render={<Link href="/cotizaciones/nueva" />}>
            <FilePlus2 /> Nueva cotización
          </Button>
        }
      />
      <QuoteFilters />

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtered ? "Sin resultados" : "Aún no hay cotizaciones"}
          description={filtered ? "Ajusta o limpia los filtros." : "Crea la primera cotización para un cliente."}
          action={
            !filtered && (
              <Button nativeButton={false} render={<Link href="/cotizaciones/nueva" />}>
                <FilePlus2 /> Nueva cotización
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Folio</TableHead>
                <TableHead>Cliente / evento</TableHead>
                <TableHead>Fecha del evento</TableHead>
                <TableHead className="hidden xl:table-cell">Creada</TableHead>
                <TableHead className="hidden lg:table-cell">Vence</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Reserva</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => {
                const expiringSoon = q.status === "enviada" && q.valid_until >= today && q.valid_until <= soon;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="pl-4">
                      <Link href={`/cotizaciones/${q.id}`} className="font-medium tabular underline-offset-4 hover:underline">
                        {q.folio}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal">
                      <div className="font-medium">{q.client_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{q.event_name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(q.event_date)}</div>
                      {q.start_time && <div className="text-xs text-muted-foreground">{formatTime(q.start_time)}–{formatTime(q.end_time)}</div>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(q.created_at.slice(0, 10))}</TableCell>
                    <TableCell className={cn("hidden lg:table-cell", expiringSoon ? "text-amber-700" : "text-muted-foreground")}>{formatDate(q.valid_until)}</TableCell>
                    <TableCell className="text-right font-medium tabular">{formatMoney(q.total_cents)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ReservationBadge status={q.reservation_status} />
                    </TableCell>
                    <TableCell className="pr-2">
                      <QuoteRowActions id={q.id} folio={q.folio} status={q.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
