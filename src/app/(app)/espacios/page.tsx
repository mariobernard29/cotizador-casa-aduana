import { getSpaces } from "@/server/queries";
import { requireStaff } from "@/server/auth";
import { PageHeader } from "@/components/page-header";
import { SpacesManager } from "./spaces-manager";

export const metadata = { title: "Espacios" };

export default async function SpacesPage() {
  const { profile } = await requireStaff();
  const spaces = await getSpaces(true);
  return (
    <>
      <PageHeader
        title="Espacios"
        description="Áreas que se pueden reservar para eventos. La disponibilidad se controla por espacio."
      />
      <SpacesManager spaces={spaces} canEdit={profile.role === "admin"} />
    </>
  );
}
