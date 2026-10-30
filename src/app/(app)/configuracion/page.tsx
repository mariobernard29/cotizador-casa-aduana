import { requireStaff } from "@/server/auth";
import { getSettings } from "@/server/queries";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { UsersManager } from "./users-manager";
import type { Profile } from "@/lib/types";
import { Database } from "lucide-react";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { profile, userId } = await requireStaff();
  const settings = await getSettings();
  const isAdmin = profile.role === "admin";

  let users: Profile[] = [];
  if (isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("*").order("created_at").returns<Profile[]>();
    users = data ?? [];
  }

  return (
    <>
      <PageHeader title="Configuración" description="Datos comerciales, impuestos y condiciones que aparecen en las cotizaciones." />
      {!settings ? (
        <EmptyState
          icon={Database}
          title="Falta la configuración inicial"
          description="Ejecuta supabase/seed.sql en el SQL Editor de Supabase para cargar los datos de Casa Aduana."
        />
      ) : (
        <div className="grid gap-8">
          <SettingsForm settings={settings} readOnly={!isAdmin} />
          {isAdmin && <UsersManager users={users} currentUserId={userId!} />}
        </div>
      )}
    </>
  );
}
