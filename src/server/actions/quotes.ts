"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import { QUOTE_STATUSES, RESERVATION_STATUSES } from "@/lib/quote-status";
import type { ActionResult, AvailabilityConflict } from "@/lib/types";

const time = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida")
  .or(z.literal(""))
  .optional();

const lineSchema = z.object({
  item_id: z.uuid().nullable().optional(),
  menu_id: z.uuid().nullable().optional(),
  description: z.string().trim().min(1, "Cada partida necesita una descripción").max(300),
  detail: z.string().trim().max(1000).optional().nullable(),
  unit: z.string().trim().max(40).optional().nullable(),
  quantity: z.number().positive("La cantidad debe ser mayor a cero").max(100000),
  unit_price_cents: z.number().int().min(0, "El precio no puede ser negativo").max(10_000_000_000),
});

const quoteSchema = z
  .object({
    id: z.uuid().optional(),
    client_id: z.uuid("Selecciona un cliente"),
    event_name: z.string().trim().min(2, "Escribe el nombre del evento").max(160),
    event_type: z.string().trim().max(60).optional(),
    event_date: z.iso.date("Selecciona la fecha del evento"),
    start_time: time,
    end_time: time,
    guests: z.number().int().positive().max(100000).nullable().optional(),
    menu_id: z.uuid().nullable().optional(),
    valid_until: z.iso.date("Fecha de vencimiento inválida"),
    discount_type: z.enum(["none", "percent", "amount"]),
    discount_value: z.number().min(0),
    notes: z.string().max(4000).optional(),
    terms: z.string().max(8000).optional(),
    space_ids: z.array(z.uuid()).max(20),
    lines: z.array(lineSchema).min(1, "Agrega al menos una partida").max(300),
  })
  .refine((q) => q.discount_type !== "percent" || q.discount_value <= 100, {
    message: "El descuento no puede ser mayor al 100 %",
  })
  .refine((q) => !!q.start_time === !!q.end_time, { message: "Indica hora de inicio y de fin, o deja ambas vacías" });

export type QuoteInput = z.input<typeof quoteSchema>;

function revalidateQuotes(id?: string) {
  revalidatePath("/");
  revalidatePath("/cotizaciones");
  revalidatePath("/calendario");
  if (id) revalidatePath(`/cotizaciones/${id}`);
}

/** Guarda (crea o edita) una cotización en borrador. Los importes se recalculan en la base de datos. */
export async function saveQuote(input: QuoteInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_quote", { p: parsed.data });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidateQuotes(data as string);
  return { ok: true, data: { id: data as string } };
}

export async function transitionQuote(id: string, to: string, note?: string): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const status = z.enum(QUOTE_STATUSES).safeParse(to);
  if (!status.success) return { ok: false, error: "Estado inválido" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_quote", { p_quote_id: id, p_to: status.data, p_note: note || null });
  if (error) return { ok: false, error: friendlyError(error) };

  // Al enviar se archiva el PDF de esa versión.
  if (status.data === "enviada") {
    const { archiveQuotePdf } = await import("@/server/pdf");
    const archived = await archiveQuotePdf(id);
    if (!archived.ok) console.error("[pdf] No se pudo archivar el PDF:", archived.error);
  }
  revalidateQuotes(id);
  return { ok: true, data: undefined };
}

export async function setReservation(id: string, to: string, note?: string): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const status = z.enum(RESERVATION_STATUSES).safeParse(to);
  if (!status.success) return { ok: false, error: "Estado de reserva inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_reservation", { p_quote_id: id, p_to: status.data, p_note: note || null });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidateQuotes(id);
  return { ok: true, data: undefined };
}

export async function duplicateQuote(id: string): Promise<ActionResult<{ id: string }>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_quote", { p_quote_id: id });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidateQuotes();
  return { ok: true, data: { id: data as string } };
}

export async function checkAvailability(
  spaceIds: string[],
  startISO: string,
  endISO: string,
  excludeQuoteId?: string,
): Promise<ActionResult<AvailabilityConflict[]>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  if (!spaceIds.length) return { ok: true, data: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_availability", {
    p_space_ids: spaceIds,
    p_start: startISO,
    p_end: endISO,
    p_exclude_quote: excludeQuoteId ?? null,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data: (data ?? []) as AvailabilityConflict[] };
}
