import { cn } from "@/lib/utils";
import {
  QUOTE_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  type QuoteStatus,
  type ReservationStatus,
} from "@/lib/quote-status";

const QUOTE_STYLE: Record<QuoteStatus, string> = {
  borrador: "bg-muted text-muted-foreground ring-border",
  enviada: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900",
  aceptada: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900",
  rechazada: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900",
  vencida: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  cancelada: "bg-zinc-100 text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800",
};

const RES_STYLE: Record<ReservationStatus, string> = {
  sin_reserva: "text-muted-foreground ring-transparent",
  apartado: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  confirmada: "bg-primary text-primary-foreground ring-primary",
  liberada: "text-muted-foreground ring-border",
};

const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return <span className={cn(base, QUOTE_STYLE[status], className)}>{QUOTE_STATUS_LABEL[status]}</span>;
}

export function ReservationBadge({ status, className }: { status: ReservationStatus; className?: string }) {
  return <span className={cn(base, RES_STYLE[status], className)}>{RESERVATION_STATUS_LABEL[status]}</span>;
}
