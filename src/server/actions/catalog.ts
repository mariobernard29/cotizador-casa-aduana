"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/server/auth";
import { friendlyError } from "@/server/errors";
import { slugify } from "@/lib/slug";
import type { ActionResult } from "@/lib/types";

const kind = z.enum(["food", "drink", "extra", "modifier", "service"]);
const priceCents = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int("Precio inválido").min(0, "El precio no puede ser negativo").nullable(),
);

const itemSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del artículo").max(160),
  description: z.string().trim().max(1000).optional(),
  unit: z.string().trim().min(1, "Indica la unidad").max(40),
  kind,
  active: z.boolean().default(true),
  needs_review: z.boolean().default(false),
  review_note: z.string().trim().max(500).optional(),
});

const priceSchema = z.object({
  id: z.uuid().optional(),
  item_id: z.uuid().optional(),
  menu_id: z.uuid("Selecciona un menú"),
  category_id: z.uuid().nullable().optional(),
  variant_label: z.string().trim().max(120).default(""),
  description: z.string().trim().max(1000).optional(),
  price_cents: priceCents,
  active: z.boolean().default(true),
});

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, name: string) {
  const base = slugify(name) || "articulo";
  const { data } = await supabase.from("items").select("slug").like("slug", `${base}%`).returns<{ slug: string }[]>();
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function done() {
  revalidatePath("/catalogo");
  revalidatePath("/cotizaciones/nueva");
}

/** Crea un artículo con su primer precio de menú. */
export async function createItem(
  item: z.input<typeof itemSchema>,
  price: z.input<typeof priceSchema>,
  source: "manual" | "custom" = "manual",
): Promise<ActionResult<{ item_id: string; price_id: string }>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const i = itemSchema.safeParse(item);
  if (!i.success) return { ok: false, error: i.error.issues[0].message };
  const p = priceSchema.safeParse(price);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };

  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, i.data.name);
  const itemRow = { ...i.data, id: undefined };
  const { data: created, error } = await supabase
    .from("items")
    .insert({
      ...itemRow,
      slug,
      source,
      description: itemRow.description || null,
      review_note: itemRow.review_note || null,
      needs_review: itemRow.needs_review || p.data.price_cents == null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) return { ok: false, error: friendlyError(error) };

  const priceRow = { ...p.data, id: undefined, item_id: undefined };
  const { data: priceCreated, error: priceError } = await supabase
    .from("menu_item_prices")
    .insert({ ...priceRow, item_id: created.id, description: priceRow.description || null, category_id: priceRow.category_id ?? null })
    .select("id")
    .single<{ id: string }>();
  if (priceError || !priceCreated) {
    await supabase.from("items").delete().eq("id", created.id);
    return { ok: false, error: friendlyError(priceError) };
  }
  done();
  return { ok: true, data: { item_id: created.id, price_id: priceCreated.id } };
}

export async function updateItem(item: z.input<typeof itemSchema>): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const parsed = itemSchema.safeParse(item);
  if (!parsed.success || !parsed.data.id) return { ok: false, error: parsed.success ? "Falta el artículo" : parsed.error.issues[0].message };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ ...row, description: row.description || null, review_note: row.needs_review ? row.review_note || null : null })
    .eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  done();
  return { ok: true, data: undefined };
}

/** Crea o actualiza el precio de un artículo en un menú. No afecta cotizaciones existentes. */
export async function savePrice(price: z.input<typeof priceSchema>): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const parsed = priceSchema.safeParse(price);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const payload = { ...row, description: row.description || null, category_id: row.category_id ?? null };
  const { error } = id
    ? await supabase.from("menu_item_prices").update(payload).eq("id", id)
    : await supabase.from("menu_item_prices").insert(payload);
  if (error) return { ok: false, error: friendlyError(error) };
  done();
  return { ok: true, data: undefined };
}

export async function setPriceActive(priceId: string, active: boolean): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const supabase = await createClient();
  const { error } = await supabase.from("menu_item_prices").update({ active }).eq("id", priceId);
  if (error) return { ok: false, error: friendlyError(error) };
  done();
  return { ok: true, data: undefined };
}

export async function deletePrice(priceId: string): Promise<ActionResult> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const supabase = await createClient();
  const { error } = await supabase.from("menu_item_prices").delete().eq("id", priceId);
  if (error) return { ok: false, error: friendlyError(error) };
  done();
  return { ok: true, data: undefined };
}

export async function createCategory(menuId: string, name: string): Promise<ActionResult<{ id: string }>> {
  const denied = await assertStaff();
  if (denied) return { ok: false, error: denied };
  const clean = name.trim();
  if (clean.length < 2) return { ok: false, error: "Escribe el nombre de la categoría" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ menu_id: menuId, name: clean, sort: 100 })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { ok: false, error: friendlyError(error) };
  done();
  return { ok: true, data };
}
