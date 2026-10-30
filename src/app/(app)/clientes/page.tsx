import { getClients } from "@/server/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ClientsTable } from "./clients-table";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const clients = await getClients(q, 500);

  // Número de cotizaciones por cliente
  const supabase = await createClient();
  const { data: counts } = await supabase.from("quotes").select("client_id").in("client_id", clients.map((c) => c.id)).returns<{ client_id: string }[]>();
  const quoteCount: Record<string, number> = {};
  for (const r of counts ?? []) quoteCount[r.client_id] = (quoteCount[r.client_id] ?? 0) + 1;

  return (
    <>
      <PageHeader title="Clientes" description="Directorio de clientes y su historial de cotizaciones." />
      <ClientsTable clients={clients} quoteCount={quoteCount} initialQuery={q ?? ""} />
    </>
  );
}
