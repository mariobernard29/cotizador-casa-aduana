/**
 * Carga la configuración, los espacios y el catálogo (supabase/seed/catalog.json) en el
 * proyecto de Supabase usando la API con la clave secreta. Equivale a supabase/seed.sql:
 * es idempotente y no sobrescribe registros existentes.
 * Uso: npm run seed:remote
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

type Variant = { label: string; description?: string; price: number | null };
type Item = {
  slug: string;
  name: string;
  description?: string;
  unit: string;
  kind: string;
  price?: number | null;
  menu_label?: string;
  needs_review?: string;
  variants?: Variant[];
};
type Catalog = {
  menus: { slug: string; name: string; description?: string; source_file?: string; sort: number; categories: { name: string; items: Item[] }[] }[];
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const catalog: Catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), "supabase/seed/catalog.json"), "utf8"));

function check<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

async function main() {
  check(
    await db.from("business_settings").upsert(
      {
        id: 1,
        name: "Casa Aduana",
        tagline: "Hotel Boutique",
        address: "Lázaro Cárdenas, C.P. 81377, Topolobampo, Sin., México",
        phone: "+52 668 463 9069",
        email: "casadelaadana@grupofelix.com.mx",
        email_verified: false,
        website: "https://www.casadelaaduana.com",
        instagram: "casaaduanatopo",
        facebook: "casaaduanatopo",
        timezone: "America/Mazatlan",
        currency: "MXN",
        tax_rate: 0.16,
        tax_mode: "included",
        event_start_time: "09:00",
        event_end_time: "23:30",
        min_lead_days: 7,
        default_terms: [
          "Precios en pesos mexicanos (MXN) con IVA incluido.",
          "Esta cotización no garantiza la disponibilidad de la fecha; la reserva queda firme únicamente cuando Casa Aduana la confirma por escrito.",
          "Los eventos se organizan con al menos una semana de anticipación.",
          "El horario de eventos es de 09:00 a 23:30 h.",
          "La renta de la terraza es por 6 horas; las horas adicionales se cotizan por separado.",
        ].join("\n"),
      },
      { onConflict: "id", ignoreDuplicates: true },
    ),
    "configuración",
  );

  check(
    await db
      .from("spaces")
      .upsert({ name: "Terraza", description: "Terraza del hotel. Renta base de 6 horas.", base_hours: 6, sort: 1 }, { onConflict: "name", ignoreDuplicates: true }),
    "espacios",
  );

  let prices = 0;
  for (const menu of catalog.menus) {
    check(
      await db
        .from("menus")
        .upsert({ slug: menu.slug, name: menu.name, description: menu.description, source_file: menu.source_file, sort: menu.sort }, { onConflict: "slug", ignoreDuplicates: true }),
      `menú ${menu.name}`,
    );
    const { id: menuId } = check(await db.from("menus").select("id").eq("slug", menu.slug).single<{ id: string }>(), "menú");

    for (const [ci, cat] of menu.categories.entries()) {
      check(
        await db.from("categories").upsert({ menu_id: menuId, name: cat.name, sort: ci + 1 }, { onConflict: "menu_id,name", ignoreDuplicates: true }),
        `categoría ${cat.name}`,
      );
      const { id: catId } = check(await db.from("categories").select("id").eq("menu_id", menuId).eq("name", cat.name).single<{ id: string }>(), "categoría");

      for (const [ii, item] of cat.items.entries()) {
        const hasVariants = !!item.variants?.length;
        const needsReview = !!item.needs_review || (!hasVariants && item.price == null) || !!item.variants?.some((v) => v.price == null);
        check(
          await db.from("items").upsert(
            {
              slug: item.slug,
              name: item.name,
              description: hasVariants ? null : item.description ?? null,
              unit: item.unit,
              kind: item.kind,
              needs_review: needsReview,
              review_note: item.needs_review ?? null,
              source: "import",
            },
            { onConflict: "slug", ignoreDuplicates: true },
          ),
          `artículo ${item.name}`,
        );
        const { id: itemId } = check(await db.from("items").select("id").eq("slug", item.slug).single<{ id: string }>(), "artículo");

        const variants: Variant[] = hasVariants ? item.variants! : [{ label: "", description: item.menu_label, price: item.price ?? null }];
        const rows = variants.map((v, vi) => ({
          menu_id: menuId,
          item_id: itemId,
          category_id: catId,
          variant_label: v.label,
          description: v.description ?? null,
          price_cents: v.price == null ? null : Math.round(v.price * 100),
          sort: (ii + 1) * 10 + vi,
        }));
        check(await db.from("menu_item_prices").upsert(rows, { onConflict: "menu_id,item_id,variant_label", ignoreDuplicates: true }), `precio ${item.name}`);
        prices += rows.length;
      }
    }
  }

  const counts = await Promise.all(
    ["menus", "categories", "items", "menu_item_prices", "spaces", "business_settings"].map(async (t) => {
      const { count } = await db.from(t).select("*", { count: "exact", head: true });
      return `${t}=${count}`;
    }),
  );
  console.log(`Procesados ${prices} precios. En la base: ${counts.join(" · ")}`);
}

main().catch((e) => {
  console.error("Error:", e.message ?? e);
  process.exit(1);
});
