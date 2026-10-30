import Image from "next/image";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sin acceso" };

export default function NoAccessPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm text-center">
        <Image src="/brand/logo@4x.png" alt="Casa Aduana" width={88} height={91} className="mx-auto" />
        <h1 className="page-title mt-6">Tu cuenta aún no está activa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un administrador debe habilitar tu usuario desde Configuración → Usuarios.
        </p>
        <form action={signOut} className="mt-6">
          <Button variant="outline" type="submit">Cerrar sesión</Button>
        </form>
      </div>
    </main>
  );
}
