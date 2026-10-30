"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import type { ActionResult, Client } from "@/lib/types";

const clientSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del cliente").max(160),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((v) => v.toLowerCase())
    .pipe(z.union([z.literal(""), z.email("Correo inválido")]))
    .optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ClientInput = z.input<typeof clientSchema>;

/** Busca clientes posiblemente duplicados por correo o teléfono. */
export async function findDuplicateClients(email?: string, phone?: string, excludeId?: string): Promise<Client[]> {
  if (await assertStaff()) return [];
  const supabase = await createClient();
  const conds: string[] = [];
  if (email?.trim()) conds.push(`email.ilike.${email.trim().replace(/[%,()]/g, "")}`);
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 7) conds.push(`phone_digits.eq.${digits}`);
  if (!conds.length) return [];
  let q = supabase.from("clients").select("*").or(conds.join(",")).limit(5);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.returns<Client[]>();
  return data ?? [];
}

export async function saveClient(input: ClientInput): Promise<ActionResult<Client>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { id, ...rest } = parsed.data;
  const row = {
    name: rest.name,
    email: rest.email || null,
    phone: rest.phone || null,
    company: rest.company || null,
    notes: rest.notes || null,
  };
  const supabase = await createClient();
  const result = id
    ? await supabase.from("clients").update(row).eq("id", id).select().single<Client>()
    : await supabase.from("clients").insert(row).select().single<Client>();
  if (result.error) return { ok: false, error: friendlyError(result.error) };

  revalidatePath("/clientes");
  return { ok: true, data: result.data };
}

export async function searchClients(term: string): Promise<Client[]> {
  if (await assertStaff()) return [];
  const { getClients } = await import("@/server/queries");
  return getClients(term, 20);
}
