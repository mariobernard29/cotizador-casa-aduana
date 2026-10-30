"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form";
import { findDuplicateClients, saveClient } from "@/server/actions/clients";
import type { Client } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  initialName?: string;
  onSaved?: (client: Client) => void;
  /** Si se encuentra un duplicado, permite usarlo directamente. */
  onUseExisting?: (client: Client) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, initialName, onSaved, onUseExisting }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [duplicates, setDuplicates] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm({
      name: client?.name ?? initialName ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      company: client?.company ?? "",
      notes: client?.notes ?? "",
    });
    setDuplicates([]);
    setError(null);
  }, [open, client, initialName]);

  // Aviso temprano de duplicados por correo o teléfono.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!form.email && form.phone.replace(/\D/g, "").length < 7) return setDuplicates([]);
      setDuplicates(await findDuplicateClients(form.email, form.phone, client?.id));
    }, 400);
    return () => clearTimeout(t);
  }, [open, form.email, form.phone, client?.id]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveClient({ ...form, id: client?.id });
      if (!res.ok) return setError(res.error);
      toast.success(client ? "Cliente actualizado" : "Cliente registrado");
      onSaved?.(res.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>El correo o el teléfono ayudan a evitar registros duplicados.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" id="client-form">
          <Field label="Nombre completo" htmlFor="c-name" required>
            <Input id="c-name" value={form.name} onChange={set("name")} required autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico" htmlFor="c-email">
              <Input id="c-email" type="email" value={form.email} onChange={set("email")} autoComplete="off" />
            </Field>
            <Field label="Teléfono" htmlFor="c-phone">
              <Input id="c-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
            </Field>
          </div>
          <Field label="Empresa (opcional)" htmlFor="c-company">
            <Input id="c-company" value={form.company} onChange={set("company")} />
          </Field>
          <Field label="Notas" htmlFor="c-notes">
            <Textarea id="c-notes" value={form.notes} onChange={set("notes")} rows={2} />
          </Field>

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlert className="size-4" /> Posible cliente duplicado
              </p>
              <ul className="mt-2 grid gap-1.5">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {d.name} · {d.email || d.phone}
                    </span>
                    {onUseExisting && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          onUseExisting(d);
                          onOpenChange(false);
                        }}
                      >
                        Usar este
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
