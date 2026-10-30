"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin, getCurrentUser } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import type { ActionResult } from "@/lib/types";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del negocio").max(120),
  tagline: opt(120),
  legal_name: opt(200),
  tax_id: opt(20),
  address: opt(300),
  phone: opt(60),
  email: z
    .string()
    .trim()
    .max(160)
    .pipe(z.union([z.literal(""), z.email("Correo inválido")]))
    .optional()
    .transform((v) => v || null),
  email_verified: z.boolean(),
  website: opt(200),
  instagram: opt(80),
  facebook: opt(80),
  tax_rate: z.number().min(0).max(0.99),
  tax_mode: z.enum(["included", "added"]),
  default_validity_days: z.number().int().min(1).max(365),
  default_terms: opt(8000),
  event_start_time: z.string().regex(/^\d{2}:\d{2}/),
  event_end_time: z.string().regex(/^\d{2}:\d{2}/),
  min_lead_days: z.number().int().min(0).max(365),
  folio_prefix: z.string().trim().min(1).max(6).regex(/^[A-Za-z0-9]+$/, "Usa solo letras y números"),
});

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const userSchema = z.object({
  email: z.email("Correo inválido"),
  full_name: z.string().trim().min(2, "Escribe el nombre").max(120),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(72),
  role: z.enum(["admin", "staff"]),
});

/** Alta de usuario del personal (solo administradores). Usa la clave secreta en el servidor. */
export async function createStaffUser(input: z.input<typeof userSchema>): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied };
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message?.includes("already") ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario." };
  }
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, email: parsed.data.email, full_name: parsed.data.full_name, role: parsed.data.role, active: true });
  if (profileError) return { ok: false, error: friendlyError(profileError) };
  revalidatePath("/configuracion");
  return { ok: true, data: undefined };
}

export async function updateStaffUser(id: string, patch: { role?: "admin" | "staff"; active?: boolean }): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied };
  const me = await getCurrentUser();
  if (me.userId === id && (patch.active === false || patch.role === "staff")) {
    return { ok: false, error: "No puedes quitarte el acceso de administrador a ti mismo." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/configuracion");
  return { ok: true, data: undefined };
}
