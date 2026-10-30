import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/logo@4x.png" alt="Casa Aduana, Hotel Boutique" width={112} height={116} priority />
          <p className="mt-4 text-sm text-muted-foreground">Cotizaciones y eventos</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso exclusivo para el personal. Si necesitas una cuenta, solicítala a un administrador.
        </p>
      </div>
    </main>
  );
}
