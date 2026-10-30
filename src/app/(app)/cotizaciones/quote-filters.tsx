"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form";
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL, RESERVATION_STATUSES, RESERVATION_STATUS_LABEL } from "@/lib/quote-status";

export function QuoteFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  // Búsqueda con retardo
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "estado", "reserva", "desde", "hasta"].some((k) => params.get(k));

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <div className="relative sm:col-span-2 lg:w-72">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Folio, cliente o evento" className="h-9 pl-8" aria-label="Buscar" />
      </div>
      <NativeSelect className="lg:w-40" value={params.get("estado") ?? ""} onChange={(e) => set("estado", e.target.value)} aria-label="Estado">
        <option value="">Todos los estados</option>
        {QUOTE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {QUOTE_STATUS_LABEL[s]}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="lg:w-40" value={params.get("reserva") ?? ""} onChange={(e) => set("reserva", e.target.value)} aria-label="Reserva">
        <option value="">Toda reserva</option>
        {RESERVATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {RESERVATION_STATUS_LABEL[s]}
          </option>
        ))}
      </NativeSelect>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="shrink-0">Evento del</span>
        <Input type="date" className="h-8" value={params.get("desde") ?? ""} onChange={(e) => set("desde", e.target.value)} aria-label="Desde" />
        <span>al</span>
        <Input type="date" className="h-8" value={params.get("hasta") ?? ""} onChange={(e) => set("hasta", e.target.value)} aria-label="Hasta" />
      </div>
      <NativeSelect className="lg:w-52" value={params.get("orden") ?? "created_desc"} onChange={(e) => set("orden", e.target.value)} aria-label="Ordenar">
        <option value="created_desc">Más recientes primero</option>
        <option value="created_asc">Más antiguas primero</option>
        <option value="event_asc">Fecha de evento ↑</option>
        <option value="event_desc">Fecha de evento ↓</option>
        <option value="total_desc">Mayor importe</option>
      </NativeSelect>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            router.replace(pathname);
          }}
        >
          <X /> Limpiar
        </Button>
      )}
    </div>
  );
}
