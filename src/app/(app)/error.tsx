"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <TriangleAlert className="mx-auto size-8 text-destructive" />
      <h1 className="page-title mt-4">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No se pudo cargar esta sección. Si el problema persiste, verifica la conexión con la base de datos.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Referencia: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
