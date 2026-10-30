import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <p className="font-heading text-6xl text-muted-foreground">404</p>
        <h1 className="page-title mt-2">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-muted-foreground">Puede que el registro se haya eliminado o que el enlace sea incorrecto.</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </div>
    </main>
  );
}
