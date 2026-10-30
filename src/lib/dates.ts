import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/Mazatlan";

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio. */
export function todayISO(tz = APP_TIMEZONE): string {
  return format(TZDate.tz(tz), "yyyy-MM-dd");
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [ay, am, ad] = fromISO.split("-").map(Number);
  const [by, bm, bd] = toISO.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Formatea una fecha de calendario (YYYY-MM-DD) sin conversiones de zona horaria. */
export function formatDate(iso: string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern, { locale: es });
}

export function formatLongDate(iso: string | null | undefined): string {
  const s = formatDate(iso, "EEEE d 'de' MMMM 'de' yyyy");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "18:30:00" → "18:30" */
export function formatTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "—";
}

/** Fecha/hora (timestamptz) mostrada en la zona del negocio. */
export function formatDateTime(ts: string | null | undefined, pattern = "d MMM yyyy, HH:mm", tz = APP_TIMEZONE): string {
  if (!ts) return "—";
  return format(new TZDate(new Date(ts).getTime(), tz), pattern, { locale: es });
}

/** Fecha + hora local del negocio → instantes ISO (UTC). Igual que public.event_period(). */
export function eventPeriod(date: string, start: string, end: string, tz = APP_TIMEZONE) {
  const [y, m, d] = date.split("-").map(Number);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const nextDay = eh * 60 + em <= sh * 60 + sm ? 1 : 0;
  const s = new TZDate(y, m - 1, d, sh, sm, tz);
  const e = new TZDate(y, m - 1, d + nextDay, eh, em, tz);
  return { start: new Date(s.getTime()).toISOString(), end: new Date(e.getTime()).toISOString() };
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Convierte un tstzrange de Postgres ('["2026-11-01 16:00:00+00","2026-11-01 22:00:00+00")') a ISO. */
export function parseTstzRange(range: string | null): { start: string; end: string } | null {
  if (!range) return null;
  const m = range.match(/^[[(]"?([^",]+)"?,"?([^")\]]+)"?[)\]]$/);
  if (!m) return null;
  return { start: new Date(m[1]).toISOString(), end: new Date(m[2]).toISOString() };
}
