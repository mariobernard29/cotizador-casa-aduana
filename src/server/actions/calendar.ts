"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import { eventPeriod } from "@/lib/dates";
import { getCalendarEvents, type CalendarEvent } from "@/server/queries";
import type { ActionResult } from "@/lib/types";

const blockSchema = z.object({
  space_id: z.uuid().nullable(),
  date: z.iso.date("Selecciona la fecha"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  reason: z.string().trim().min(3, "Escribe el motivo").max(200),
});

export async function createBlock(input: z.input<typeof blockSchema>): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = eventPeriod(parsed.data.date, parsed.data.start_time, parsed.data.end_time);
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_blocks").insert({
    space_id: parsed.data.space_id,
    period: `[${p.start},${p.end})`,
    reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/calendario");
  return { ok: true, data: undefined };
}

export async function loadCalendarEvents(fromISO: string, toISO: string): Promise<ActionResult<CalendarEvent[]>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  if (Number.isNaN(Date.parse(fromISO)) || Number.isNaN(Date.parse(toISO))) return { ok: false, error: "Rango inválido" };
  return { ok: true, data: await getCalendarEvents(fromISO, toISO) };
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/calendario");
  return { ok: true, data: undefined };
}
