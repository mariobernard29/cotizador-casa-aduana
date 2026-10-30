import { Sidebar } from "@/components/shell/sidebar";
import { requireStaff } from "@/server/auth";
import { getSettings } from "@/server/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireStaff();
  const settings = await getSettings();
  return (
    <div className="min-h-dvh">
      <Sidebar businessName={settings?.name ?? "Casa Aduana"} userName={profile.full_name || email || "Usuario"} role={profile.role} />
      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
