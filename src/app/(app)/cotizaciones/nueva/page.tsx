import { Database } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getCategories, getMenus, getSettings, getSpaces } from "@/server/queries";
import { EmptyState, PageHeader } from "@/components/page-header";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import type { Client } from "@/lib/types";

export const metadata = { title: "Nueva cotización" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ cliente?: string; fecha?: string }> }) {
  const { cliente, fecha } = await searchParams;
  const [settings, catalog, menus, categories, spaces] = await Promise.all([
    getSettings(),
    getCatalog({ onlyActive: true }),
    getMenus(),
    getCategories(),
    getSpaces(),
  ]);

  let presetClient: Client | null = null;
  if (cliente) {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("*").eq("id", cliente).maybeSingle<Client>();
    presetClient = data;
  }

  return (
    <>
      <PageHeader title="Nueva cotización" description="Completa cliente, evento y partidas. Se guarda como borrador." />
      {!settings ? (
        <EmptyState icon={Database} title="Falta la configuración inicial" description="Aplica las migraciones y ejecuta supabase/seed.sql (ver README)." />
      ) : (
        <QuoteEditor
          settings={settings}
          catalog={catalog}
          menus={menus.filter((m) => m.active)}
          categories={categories}
          spaces={spaces}
          presetClient={presetClient}
          presetDate={fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined}
        />
      )}
    </>
  );
}
