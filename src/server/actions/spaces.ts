"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import type { ActionResult } from "@/lib/types";

const optionalNumber = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable());

const spaceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del espacio").max(80),
  description: z.string().trim().max(500).optional(),
  capacity: optionalNumber,
  base_hours: optionalNumber,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#2f6f8a"),
  sort: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

export async function saveSpace(input: z.input<typeof spaceSchema>): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied };
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("spaces").update({ ...row, description: row.description || null }).eq("id", id)
    : await supabase.from("spaces").insert({ ...row, description: row.description || null });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/espacios");
  return { ok: true, data: undefined };
}
