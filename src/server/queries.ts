import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/dates";
import type {
  BusinessSettings,
  CatalogEntry,
  Category,
  Client,
  Menu,
  Quote,
  QuoteHistoryEntry,
  QuoteLine,
  QuoteRevision,
  Space,
} from "@/lib/types";
import type { QuoteStatus, ReservationStatus } from "@/lib/quote-status";

export async function getSettings(): Promise<BusinessSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("business_settings").select("*").eq("id", 1).maybeSingle<BusinessSettings>();
  return data ? { ...data, tax_rate: Number(data.tax_rate) } : null;
}

export async function getSpaces(includeInactive = false): Promise<Space[]> {
  const supabase = await createClient();
  let q = supabase.from("spaces").select("*").order("sort").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q.returns<Space[]>();
  return (data ?? []).map((s) => ({ ...s, base_hours: s.base_hours == null ? null : Number(s.base_hours) }));
}

export async function getMenus(): Promise<Menu[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("menus").select("*").order("sort").returns<Menu[]>();
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort").returns<Category[]>();
  return data ?? [];
}

type PriceRow = {
  id: string;
  menu_id: string;
  item_id: string;
  category_id: string | null;
  variant_label: string;
  description: string | null;
  price_cents: number | null;
  sort: number;
  active: boolean;
  items: {
    name: string;
    description: string | null;
    unit: string;
    kind: CatalogEntry["kind"];
    active: boolean;
    needs_review: boolean;
    review_note: string | null;
  };
  menus: { name: string; sort: number };
  categories: { name: string; sort: number } | null;
};

/** Catálogo plano (un renglón por precio de menú). */
export async function getCatalog(opts: { onlyActive?: boolean } = {}): Promise<CatalogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("menu_item_prices")
    .select(
      "id, menu_id, item_id, category_id, variant_label, description, price_cents, sort, active, items!inner(name, description, unit, kind, active, needs_review, review_note), menus!inner(name, sort), categories(name, sort)",
    )
    .returns<PriceRow[]>();

  const rows = (data ?? []).map<CatalogEntry & { menu_sort: number }>((r) => ({
    price_id: r.id,
    item_id: r.item_id,
    menu_id: r.menu_id,
    menu_name: r.menus.name,
    menu_sort: r.menus.sort,
    category_id: r.category_id,
    category_name: r.categories?.name ?? null,
    category_sort: r.categories?.sort ?? 999,
    name: r.items.name,
    variant_label: r.variant_label,
    description: r.description || r.items.description,
    item_description: r.items.description,
    price_description: r.description,
    unit: r.items.unit,
    kind: r.items.kind,
    price_cents: r.price_cents == null ? null : Number(r.price_cents),
    active: r.active,
    item_active: r.items.active,
    item_needs_review: r.items.needs_review,
    needs_review: r.items.needs_review || r.price_cents == null,
    review_note: r.items.review_note,
    sort: r.sort,
  }));

  return rows
    .filter((r) => !opts.onlyActive || (r.active && r.item_active))
    .sort((a, b) => a.menu_sort - b.menu_sort || a.category_sort - b.category_sort || a.sort - b.sort);
}

export async function getClients(search?: string, limit = 200): Promise<Client[]> {
  const supabase = await createClient();
  let q = supabase.from("clients").select("*").order("name").limit(limit);
  if (search?.trim()) {
    const s = search.trim().replace(/[%,()]/g, " ");
    const digits = s.replace(/\D/g, "");
    q = q.or(
      [`name.ilike.%${s}%`, `email.ilike.%${s}%`, `company.ilike.%${s}%`, digits.length >= 3 ? `phone_digits.ilike.%${digits}%` : null]
        .filter(Boolean)
        .join(","),
    );
  }
  const { data } = await q.returns<Client[]>();
  return data ?? [];
}

export interface QuoteListFilters {
  q?: string;
  status?: QuoteStatus | "";
  reservation?: ReservationStatus | "";
  from?: string;
  to?: string;
  sort?: "created_desc" | "created_asc" | "event_asc" | "event_desc" | "total_desc";
}

export type QuoteListRow = Pick<
  Quote,
  | "id"
  | "folio"
  | "client_name"
  | "event_name"
  | "event_type"
  | "event_date"
  | "start_time"
  | "end_time"
  | "created_at"
  | "valid_until"
  | "total_cents"
  | "status"
  | "reservation_status"
>;

export async function getQuotes(f: QuoteListFilters = {}): Promise<QuoteListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("quotes")
    .select("id, folio, client_name, event_name, event_type, event_date, start_time, end_time, created_at, valid_until, total_cents, status, reservation_status")
    .limit(500);
  if (f.q?.trim()) {
    const s = f.q.trim().replace(/[%,()]/g, " ");
    q = q.or(`folio.ilike.%${s}%,client_name.ilike.%${s}%,event_name.ilike.%${s}%,client_email.ilike.%${s}%`);
  }
  if (f.status) q = q.eq("status", f.status);
  if (f.reservation) q = q.eq("reservation_status", f.reservation);
  if (f.from) q = q.gte("event_date", f.from);
  if (f.to) q = q.lte("event_date", f.to);
  switch (f.sort) {
    case "created_asc":
      q = q.order("created_at", { ascending: true });
      break;
    case "event_asc":
      q = q.order("event_date", { ascending: true });
      break;
    case "event_desc":
      q = q.order("event_date", { ascending: false });
      break;
    case "total_desc":
      q = q.order("total_cents", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }
  const { data } = await q.returns<QuoteListRow[]>();
  return (data ?? []).map((r) => ({ ...r, total_cents: Number(r.total_cents) }));
}

export interface QuoteDetail {
  quote: Quote;
  lines: QuoteLine[];
  spaces: Space[];
  history: (QuoteHistoryEntry & { changed_by_name: string | null })[];
  revisions: QuoteRevision[];
  menuName: string | null;
}

function normalizeQuote(q: Quote): Quote {
  return {
    ...q,
    tax_rate: Number(q.tax_rate),
    discount_value: Number(q.discount_value),
    subtotal_cents: Number(q.subtotal_cents),
    discount_cents: Number(q.discount_cents),
    tax_cents: Number(q.tax_cents),
    total_cents: Number(q.total_cents),
  };
}

export async function getQuote(id: string): Promise<QuoteDetail | null> {
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle<Quote>();
  if (!quote) return null;

  const [lines, spaces, history, revisions, menu, profiles] = await Promise.all([
    supabase.from("quote_lines").select("*").eq("quote_id", id).order("position").returns<QuoteLine[]>(),
    supabase.from("quote_spaces").select("spaces(*)").eq("quote_id", id).returns<{ spaces: Space }[]>(),
    supabase.from("quote_status_history").select("*").eq("quote_id", id).order("changed_at").returns<QuoteHistoryEntry[]>(),
    supabase.from("quote_revisions").select("id, quote_id, version, pdf_path, created_at").eq("quote_id", id).order("version").returns<QuoteRevision[]>(),
    quote.menu_id ? supabase.from("menus").select("name").eq("id", quote.menu_id).maybeSingle<{ name: string }>() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name, email").returns<{ id: string; full_name: string | null; email: string | null }[]>(),
  ]);

  const names = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name || p.email]));
  return {
    quote: normalizeQuote(quote),
    lines: (lines.data ?? []).map((l) => ({
      ...l,
      quantity: Number(l.quantity),
      unit_price_cents: Number(l.unit_price_cents),
      line_total_cents: Number(l.line_total_cents),
    })),
    spaces: (spaces.data ?? []).map((s) => s.spaces).sort((a, b) => a.sort - b.sort),
    history: (history.data ?? []).map((h) => ({ ...h, changed_by_name: h.changed_by ? names.get(h.changed_by) ?? null : null })),
    revisions: revisions.data ?? [],
    menuName: menu.data?.name ?? null,
  };
}

export async function getDashboard() {
  const supabase = await createClient();
  // Marca como vencidas las cotizaciones enviadas fuera de vigencia (además del cron diario).
  await supabase.rpc("expire_quotes");

  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const horizon = addDaysISO(today, 60);

  const count = (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => build(base()).then((r) => r.count ?? 0);
  function base() {
    return supabase.from("quotes").select("id", { count: "exact", head: true });
  }

  const [createdThisMonth, pending, accepted, expired, upcoming, holds, confirmed] = await Promise.all([
    count((q) => q.gte("issued_on", monthStart)),
    count((q) => q.eq("status", "enviada")),
    count((q) => q.eq("status", "aceptada")),
    count((q) => q.eq("status", "vencida")),
    supabase
      .from("quotes")
      .select("id, folio, client_name, event_name, event_date, start_time, end_time, status, reservation_status, guests, total_cents")
      .gte("event_date", today)
      .lte("event_date", horizon)
      .in("status", ["borrador", "enviada", "aceptada"])
      .order("event_date")
      .order("start_time")
      .limit(8)
      .returns<QuoteListRow[]>(),
    supabase
      .from("quotes")
      .select("id, folio, client_name, event_name, event_date, start_time, end_time, status, reservation_status")
      .eq("reservation_status", "apartado")
      .gte("event_date", today)
      .order("event_date")
      .limit(8)
      .returns<QuoteListRow[]>(),
    supabase
      .from("quotes")
      .select("id, folio, client_name, event_name, event_date, start_time, end_time, status, reservation_status")
      .eq("reservation_status", "confirmada")
      .gte("event_date", today)
      .order("event_date")
      .limit(8)
      .returns<QuoteListRow[]>(),
  ]);

  return {
    createdThisMonth,
    pending,
    accepted,
    expired,
    upcoming: upcoming.data ?? [],
    holds: holds.data ?? [],
    confirmed: confirmed.data ?? [],
  };
}

export interface CalendarEvent {
  id: string;
  kind: "booking" | "quote" | "block";
  title: string;
  start: string;
  end: string;
  quoteId: string | null;
  folio: string | null;
  status: string;
  reservation: string | null;
  spaceId: string | null;
  spaceName: string | null;
  clientName: string | null;
}

/** Eventos para el calendario: reservas (apartado/confirmada), cotizaciones con fecha sin reserva y bloqueos. */
export async function getCalendarEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const range = `[${fromISO},${toISO})`;
  const [bookings, quotes, blocks] = await Promise.all([
    supabase
      .from("space_bookings")
      .select("id, period, status, space_id, spaces(name), quotes!inner(id, folio, event_name, client_name, status, reservation_status, start_at, end_at)")
      .in("status", ["hold", "confirmed"])
      .overlaps("period", range)
      .returns<
        {
          id: string;
          period: string;
          status: "hold" | "confirmed";
          space_id: string;
          spaces: { name: string } | null;
          quotes: { id: string; folio: string; event_name: string; client_name: string; status: string; reservation_status: string; start_at: string; end_at: string };
        }[]
      >(),
    supabase
      .from("quotes")
      .select("id, folio, event_name, client_name, status, reservation_status, start_at, end_at, event_date")
      .in("status", ["borrador", "enviada", "aceptada"])
      .in("reservation_status", ["sin_reserva", "liberada"])
      .gte("event_date", fromISO.slice(0, 10))
      .lte("event_date", toISO.slice(0, 10))
      .returns<{ id: string; folio: string; event_name: string; client_name: string; status: string; reservation_status: string; start_at: string | null; end_at: string | null; event_date: string }[]>(),
    supabase
      .from("calendar_blocks")
      .select("id, period, reason, space_id, spaces(name)")
      .overlaps("period", range)
      .returns<{ id: string; period: string; reason: string; space_id: string | null; spaces: { name: string } | null }[]>(),
  ]);

  const { parseTstzRange } = await import("@/lib/dates");
  const events: CalendarEvent[] = [];
  for (const b of bookings.data ?? []) {
    const p = parseTstzRange(b.period);
    if (!p) continue;
    events.push({
      id: `b-${b.id}`,
      kind: "booking",
      title: `${b.quotes.event_name} · ${b.spaces?.name ?? ""}`,
      start: p.start,
      end: p.end,
      quoteId: b.quotes.id,
      folio: b.quotes.folio,
      status: b.status,
      reservation: b.quotes.reservation_status,
      spaceId: b.space_id,
      spaceName: b.spaces?.name ?? null,
      clientName: b.quotes.client_name,
    });
  }
  for (const q of quotes.data ?? []) {
    events.push({
      id: `q-${q.id}`,
      kind: "quote",
      title: q.event_name,
      start: q.start_at ?? q.event_date,
      end: q.end_at ?? q.event_date,
      quoteId: q.id,
      folio: q.folio,
      status: q.status,
      reservation: q.reservation_status,
      spaceId: null,
      spaceName: null,
      clientName: q.client_name,
    });
  }
  for (const bl of blocks.data ?? []) {
    const p = parseTstzRange(bl.period);
    if (!p) continue;
    events.push({
      id: `k-${bl.id}`,
      kind: "block",
      title: `Bloqueo: ${bl.reason}`,
      start: p.start,
      end: p.end,
      quoteId: null,
      folio: null,
      status: "block",
      reservation: null,
      spaceId: bl.space_id,
      spaceName: bl.spaces?.name ?? "Todo el lugar",
      clientName: null,
    });
  }
  return events;
}
