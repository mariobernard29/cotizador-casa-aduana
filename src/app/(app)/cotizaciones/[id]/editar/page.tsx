import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getCategories, getMenus, getQuote, getSettings, getSpaces } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import type { Client } from "@/lib/types";

export const metadata = { title: "Editar cotización" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getQuote(id);
  if (!detail) notFound();
  if (detail.quote.status !== "borrador") redirect(`/cotizaciones/${id}`);

  const supabase = await createClient();
  const [settings, catalog, menus, categories, spaces, client] = await Promise.all([
    getSettings(),
    getCatalog({ onlyActive: true }),
    getMenus(),
    getCategories(),
    getSpaces(true),
    supabase.from("clients").select("*").eq("id", detail.quote.client_id).maybeSingle<Client>(),
  ]);
  if (!settings) notFound();

  const spaceIds = detail.spaces.map((s) => s.id);
  return (
    <>
      <PageHeader title={`Editar ${detail.quote.folio}`} description={detail.quote.event_name} />
      <QuoteEditor
        settings={settings}
        catalog={catalog}
        menus={menus}
        categories={categories}
        spaces={spaces.filter((s) => s.active || spaceIds.includes(s.id))}
        initial={{ quote: detail.quote, lines: detail.lines, spaceIds, client: client.data }}
      />
    </>
  );
}
