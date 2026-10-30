import { getCatalog, getCategories, getMenus } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { CatalogManager } from "./catalog-manager";

export const metadata = { title: "Catálogo" };

export default async function CatalogPage() {
  const [entries, menus, categories] = await Promise.all([getCatalog(), getMenus(), getCategories()]);
  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Artículos y servicios por menú. Cambiar un precio aquí no modifica cotizaciones ya creadas."
      />
      <CatalogManager entries={entries} menus={menus} categories={categories} />
    </>
  );
}
