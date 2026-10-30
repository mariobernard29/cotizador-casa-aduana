/**
 * Genera supabase/seed.sql a partir de supabase/seed/catalog.json.
 * El SQL es idempotente: se puede ejecutar varias veces sin duplicar registros
 * y no sobrescribe cambios hechos desde la aplicación (ON CONFLICT DO NOTHING).
 * Uso: npm run seed:build
 */
import fs from "node:fs";
import path from "node:path";

type Variant = { label: string; description?: string; price: number | null };
type Item = {
  slug: string;
  name: string;
  description?: string;
  unit: string;
  kind: "food" | "drink" | "extra" | "modifier" | "service";
  price?: number | null;
  menu_label?: string;
  needs_review?: string;
  variants?: Variant[];
};
type Catalog = {
  menus: {
    slug: string;
    name: string;
    description?: string;
    source_file?: string;
    sort: number;
    categories: { name: string; items: Item[] }[];
  }[];
};

const root = process.cwd();
const catalog: Catalog = JSON.parse(fs.readFileSync(path.join(root, "supabase/seed/catalog.json"), "utf8"));

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const cents = (v: number | null | undefined) => (v == null ? "null" : String(Math.round(v * 100)));

const out: string[] = [
  "-- Generado por scripts/build-seed.ts a partir de supabase/seed/catalog.json. No editar a mano.",
  "begin;",
  "",
  "-- Configuración del negocio (datos de RECURSOS/DATOS Y VARIABLES.txt y casadelaaduana.com/eventos)",
  `insert into public.business_settings (id, name, tagline, address, phone, email, email_verified, website, instagram, facebook,
  timezone, currency, tax_rate, tax_mode, event_start_time, event_end_time, min_lead_days, default_terms)
values (1, 'Casa Aduana', 'Hotel Boutique', 'Lázaro Cárdenas, C.P. 81377, Topolobampo, Sin., México', '+52 668 463 9069',
  'casadelaadana@grupofelix.com.mx', false, 'https://www.casadelaaduana.com', 'casaaduanatopo', 'casaaduanatopo',
  'America/Mazatlan', 'MXN', 0.16, 'included', '09:00', '23:30', 7,
  ${q(
    [
      "Precios en pesos mexicanos (MXN) con IVA incluido.",
      "Esta cotización no garantiza la disponibilidad de la fecha; la reserva queda firme únicamente cuando Casa Aduana la confirma por escrito.",
      "Los eventos se organizan con al menos una semana de anticipación.",
      "El horario de eventos es de 09:00 a 23:30 h.",
      "La renta de la terraza es por 6 horas; las horas adicionales se cotizan por separado.",
    ].join("\n"),
  )})
on conflict (id) do nothing;`,
  "",
  "-- Espacios conocidos (capacidad pendiente)",
  `insert into public.spaces (name, description, sort) values ('Terraza', 'Terraza del hotel. Renta base de 6 horas.', 1)
on conflict (name) do nothing;`,
  `update public.spaces set base_hours = 6 where name = 'Terraza' and base_hours is null;`,
  "",
];

const seenItems = new Map<string, string[]>();
let priceRows = 0;

for (const menu of catalog.menus) {
  out.push(`-- Menú: ${menu.name}`);
  out.push(
    `insert into public.menus (slug, name, description, source_file, sort) values (${q(menu.slug)}, ${q(menu.name)}, ${q(menu.description)}, ${q(menu.source_file)}, ${menu.sort})
on conflict (slug) do nothing;`,
  );
  menu.categories.forEach((cat, ci) => {
    out.push(
      `insert into public.categories (menu_id, name, sort) select id, ${q(cat.name)}, ${ci + 1} from public.menus where slug = ${q(menu.slug)}
on conflict (menu_id, name) do nothing;`,
    );
    cat.items.forEach((item, ii) => {
      seenItems.set(item.slug, [...(seenItems.get(item.slug) ?? []), menu.name]);
      const hasVariants = !!item.variants?.length;
      const needsReview = !!item.needs_review || (!hasVariants && item.price == null) || !!item.variants?.some((v) => v.price == null);
      out.push(
        `insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values (${q(item.slug)}, ${q(item.name)}, ${q(
          hasVariants ? null : item.description,
        )}, ${q(item.unit)}, ${q(item.kind)}, ${needsReview}, ${q(item.needs_review)}, 'import')
on conflict (slug) do nothing;`,
      );
      const variants: Variant[] = hasVariants
        ? item.variants!
        : [{ label: "", description: item.menu_label, price: item.price ?? null }];
      variants.forEach((v, vi) => {
        priceRows++;
        out.push(
          `insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, ${q(v.label)}, ${q(v.description)}, ${cents(v.price)}, ${(ii + 1) * 10 + vi}
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = ${q(cat.name)} join public.items i on i.slug = ${q(item.slug)}
 where m.slug = ${q(menu.slug)}
on conflict (menu_id, item_id, variant_label) do nothing;`,
        );
      });
    });
  });
  out.push("");
}

out.push("commit;", "");
fs.writeFileSync(path.join(root, "supabase/seed.sql"), out.join("\n"));

const shared = [...seenItems].filter(([, menus]) => menus.length > 1);
console.log(`Artículos únicos: ${seenItems.size} · Precios por menú: ${priceRows}`);
console.log(`Compartidos entre menús: ${shared.map(([s, m]) => `${s} (${m.join(", ")})`).join("; ") || "ninguno"}`);
console.log("Escrito supabase/seed.sql");
