"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilePlus2, Pencil, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { formatDate } from "@/lib/dates";
import type { Client } from "@/lib/types";

export function ClientsTable({ clients, quoteCount, initialQuery }: { clients: Client[]; quoteCount: Record<string, number>; initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(query ? `/clientes?q=${encodeURIComponent(query)}` : "/clientes");
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={search} className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o teléfono" className="h-9 pl-8" />
        </form>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Nuevo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={initialQuery ? "Sin resultados" : "Aún no hay clientes"}
          description={initialQuery ? "Prueba con otro nombre, correo o teléfono." : "Registra clientes aquí o directamente al crear una cotización."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Correo</TableHead>
                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                <TableHead className="text-right">Cotizaciones</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                    <div className="text-xs text-muted-foreground md:hidden">{c.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.email ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{c.phone ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(c.created_at.slice(0, 10))}</TableCell>
                  <TableCell className="text-right tabular">
                    {quoteCount[c.id] ? (
                      <Link className="underline-offset-4 hover:underline" href={`/cotizaciones?q=${encodeURIComponent(c.name)}`}>
                        {quoteCount[c.id]}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Nueva cotización para este cliente"
                        nativeButton={false}
                        render={<Link href={`/cotizaciones/nueva?cliente=${c.id}`} />}
                      >
                        <FilePlus2 />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Editar cliente"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog open={open} onOpenChange={setOpen} client={editing} onSaved={() => router.refresh()} />
    </>
  );
}
