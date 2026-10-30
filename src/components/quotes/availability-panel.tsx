"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Loader2, TriangleAlert } from "lucide-react";
import { checkAvailability } from "@/server/actions/quotes";
import { daysBetween, eventPeriod, formatDateTime, todayISO } from "@/lib/dates";
import type { AvailabilityConflict, BusinessSettings, Space } from "@/lib/types";

interface Props {
  date: string;
  start: string;
  end: string;
  spaceIds: string[];
  spaces: Space[];
  guests: number | null;
  settings: Pick<BusinessSettings, "event_start_time" | "event_end_time" | "min_lead_days">;
  excludeQuoteId?: string;
}

/** Disponibilidad en vivo y advertencias de reglas del negocio. */
export function AvailabilityPanel({ date, start, end, spaceIds, spaces, guests, settings, excludeQuoteId }: Props) {
  const [conflicts, setConflicts] = useState<AvailabilityConflict[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !!(date && start && end && spaceIds.length);
  const key = `${date}|${start}|${end}|${spaceIds.join(",")}`;

  useEffect(() => {
    if (!ready) {
      setConflicts(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const p = eventPeriod(date, start, end);
      const res = await checkAvailability(spaceIds, p.start, p.end, excludeQuoteId);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        setConflicts(null);
      } else {
        setError(null);
        setConflicts(res.data);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, excludeQuoteId]);

  const warnings: string[] = [];
  if (date) {
    const lead = daysBetween(todayISO(), date);
    if (lead < 0) warnings.push("La fecha del evento ya pasó.");
    else if (lead < settings.min_lead_days) warnings.push(`El evento es en ${lead} día(s); la anticipación mínima es de ${settings.min_lead_days}.`);
  }
  if (start && end) {
    const open = settings.event_start_time.slice(0, 5);
    const close = settings.event_end_time.slice(0, 5);
    if (start < open || end > close || end <= start) warnings.push(`Fuera del horario de eventos (${open}–${close}).`);
  }
  if (guests) {
    for (const s of spaces.filter((sp) => spaceIds.includes(sp.id))) {
      if (s.capacity && guests > s.capacity) warnings.push(`${s.name}: ${guests} invitados superan la capacidad (${s.capacity}).`);
    }
  }

  const hard = conflicts?.filter((c) => c.kind !== "hold") ?? [];
  const holds = conflicts?.filter((c) => c.kind === "hold") ?? [];

  if (!ready && warnings.length === 0) {
    return <p className="text-xs text-muted-foreground">Indica fecha, horario y espacio para revisar la disponibilidad.</p>;
  }

  return (
    <div className="grid gap-2 text-sm" aria-live="polite">
      {ready && loading && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Revisando disponibilidad…
        </p>
      )}
      {ready && !loading && error && <p className="text-destructive">{error}</p>}
      {ready && !loading && conflicts && hard.length === 0 && holds.length === 0 && (
        <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="size-4" /> Espacio disponible en ese horario.
        </p>
      )}
      {!loading &&
        hard.map((c, i) => (
          <div key={`h${i}`} className="flex gap-2 rounded-md bg-destructive/10 p-2 text-destructive">
            <CircleX className="mt-0.5 size-4 shrink-0" />
            <p>
              {c.kind === "block" ? (
                <>
                  <b>{c.space_name}</b> bloqueado: {c.reason} ({formatDateTime(c.start_at, "HH:mm")}–{formatDateTime(c.end_at, "HH:mm")})
                </>
              ) : (
                <>
                  <b>{c.space_name}</b> ya está reservado para{" "}
                  <Link className="underline" href={`/cotizaciones/${c.quote_id}`}>
                    {c.event_name} ({c.folio})
                  </Link>{" "}
                  {formatDateTime(c.start_at, "HH:mm")}–{formatDateTime(c.end_at, "HH:mm")}. No se podrá confirmar.
                </>
              )}
            </p>
          </div>
        ))}
      {!loading &&
        holds.map((c, i) => (
          <div key={`o${i}`} className="flex gap-2 rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Fecha apartada (sin confirmar) en <b>{c.space_name}</b> por{" "}
              <Link className="underline" href={`/cotizaciones/${c.quote_id}`}>
                {c.event_name} ({c.folio})
              </Link>
              .
            </p>
          </div>
        ))}
      {warnings.map((w) => (
        <p key={w} className="flex gap-2 text-amber-800 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {w}
        </p>
      ))}
    </div>
  );
}
