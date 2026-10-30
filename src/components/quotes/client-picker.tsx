"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, Pencil, Phone, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { searchClients } from "@/server/actions/clients";
import type { Client } from "@/lib/types";

export function ClientPicker({ value, onChange }: { value: Client | null; onChange: (c: Client | null) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchClients(term);
      setResults(r);
      setActive(0);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(c: Client) {
    onChange(c);
    setTerm("");
    setOpen(false);
  }

  if (value) {
    return (
      <>
        <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="font-medium">{value.name}</p>
            {value.company && <p className="text-sm text-muted-foreground">{value.company}</p>}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {value.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {value.email}
                </span>
              )}
              {value.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" /> {value.phone}
                </span>
              )}
              {!value.email && !value.phone && <span className="text-amber-700">Sin correo ni teléfono</span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Editar datos del cliente" onClick={() => setDialog({ open: true, client: value })}>
              <Pencil />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Cambiar cliente" onClick={() => onChange(null)}>
              <X />
            </Button>
          </div>
        </div>
        <ClientFormDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} client={dialog.client} onSaved={onChange} />
      </>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                pick(results[active]);
              }
            }}
            placeholder="Buscar cliente por nombre, correo o teléfono"
            className="h-9 pl-8"
            role="combobox"
            aria-expanded={open}
            aria-controls="client-results"
          />
          {loading && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <Button type="button" variant="outline" className="h-9" onClick={() => setDialog({ open: true, client: null })}>
          <UserPlus /> Nuevo
        </Button>
      </div>
      {open && term.trim() && (
        <ul id="client-results" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {results.length === 0 && !loading && (
            <li className="flex items-center justify-between gap-2 px-2 py-2 text-sm text-muted-foreground">
              Sin coincidencias.
              <Button type="button" size="xs" variant="outline" onClick={() => setDialog({ open: true, client: null })}>
                Registrar “{term.trim()}”
              </Button>
            </li>
          )}
          {results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              className={`cursor-pointer rounded px-2 py-1.5 text-sm ${i === active ? "bg-accent" : ""}`}
            >
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
      <ClientFormDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        client={null}
        initialName={term}
        onSaved={pick}
        onUseExisting={pick}
      />
    </div>
  );
}
