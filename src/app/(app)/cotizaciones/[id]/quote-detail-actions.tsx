"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarCheck, CalendarClock, CalendarX, Copy, Download, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDuplicate, useQuoteTransition } from "@/components/quotes/quote-actions";
import { setReservation } from "@/server/actions/quotes";
import {
  QUOTE_TRANSITIONS,
  RESERVATION_ACTION_LABEL,
  TRANSITION_ACTION_LABEL,
  reservationActions,
  type QuoteStatus,
  type ReservationStatus,
} from "@/lib/quote-status";

export function QuoteDetailActions({ id, folio, status }: { id: string; folio: string; status: QuoteStatus }) {
  const transition = useQuoteTransition();
  const dup = useDuplicate();
  const next = QUOTE_TRANSITIONS[status];

  function print() {
    const w = window.open(`/api/cotizaciones/${id}/pdf`, "_blank");
    w?.addEventListener("load", () => w.print());
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "borrador" && (
          <Button nativeButton={false} render={<Link href={`/cotizaciones/${id}/editar`} />}>
            <Pencil /> Editar
          </Button>
        )}
        <Button variant="outline" nativeButton={false} render={<a href={`/api/cotizaciones/${id}/pdf?download=1`} />}>
          <Download /> PDF
        </Button>
        <Button variant="outline" onClick={print}>
          <Printer /> Imprimir
        </Button>
        <Button variant="outline" onClick={() => dup.duplicate(id)} disabled={dup.pending}>
          {dup.pending ? <Loader2 className="animate-spin" /> : <Copy />} Duplicar
        </Button>
      </div>
      {next.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "cancelada" || to === "rechazada" ? "destructive" : to === "enviada" || to === "aceptada" ? "secondary" : "ghost"}
              onClick={() => transition.request(id, folio, to)}
            >
              {TRANSITION_ACTION_LABEL[to]}
            </Button>
          ))}
        </div>
      )}
      {transition.dialog}
    </>
  );
}

const RES_ICON = { apartado: CalendarClock, confirmada: CalendarCheck, liberada: CalendarX, sin_reserva: CalendarX };

export function ReservationActions({
  id,
  status,
  reservation,
  canReserve,
}: {
  id: string;
  status: QuoteStatus;
  reservation: ReservationStatus;
  canReserve: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const actions = reservationActions(status, reservation);

  function run(to: ReservationStatus) {
    start(async () => {
      const res = await setReservation(id, to);
      if (!res.ok) return void toast.error(res.error, { duration: 8000 });
      toast.success(to === "confirmada" ? "Reserva confirmada" : to === "apartado" ? "Fecha apartada" : "Fecha liberada");
      router.refresh();
    });
  }

  if (!actions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((to) => {
        const Icon = RES_ICON[to];
        const needsData = to !== "liberada" && !canReserve;
        return (
          <Button
            key={to}
            size="sm"
            variant={to === "confirmada" ? "default" : "outline"}
            disabled={pending || needsData}
            title={needsData ? "Define horario y espacio para reservar" : undefined}
            onClick={() => run(to)}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Icon />} {RESERVATION_ACTION_LABEL[to]}
          </Button>
        );
      })}
    </div>
  );
}
