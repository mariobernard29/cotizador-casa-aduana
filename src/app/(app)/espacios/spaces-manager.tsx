"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/page-header";
import { Field } from "@/components/form";
import { saveSpace } from "@/server/actions/spaces";
import type { Space } from "@/lib/types";

const EMPTY = { name: "", description: "", capacity: "", base_hours: "", color: "#2f6f8a", sort: "0", active: true };

export function SpacesManager({ spaces, canEdit }: { spaces: Space[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edit(space: Space | null) {
    setEditing(space);
    setError(null);
    setForm(
      space
        ? {
            name: space.name,
            description: space.description ?? "",
            capacity: space.capacity?.toString() ?? "",
            base_hours: space.base_hours?.toString() ?? "",
            color: space.color,
            sort: String(space.sort),
            active: space.active,
          }
        : { ...EMPTY, sort: String(spaces.length + 1) },
    );
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveSpace({ ...form, id: editing?.id });
      if (!res.ok) return setError(res.error);
      toast.success("Espacio guardado");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => edit(null)}>
            <Plus /> Nuevo espacio
          </Button>
        </div>
      )}

      {spaces.length === 0 ? (
        <EmptyState icon={MapPin} title="No hay espacios registrados" description="Agrega los espacios que se pueden reservar (terraza, salón, jardín…)." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((s) => (
            <article key={s.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: s.color }} />
                  <h2 className="font-medium">{s.name}</h2>
                  {!s.active && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">Inactivo</span>}
                </div>
                {canEdit && (
                  <Button size="icon-sm" variant="ghost" aria-label={`Editar ${s.name}`} onClick={() => edit(s)}>
                    <Pencil />
                  </Button>
                )}
              </div>
              {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Capacidad</dt>
                  <dd>{s.capacity ? `${s.capacity} personas` : <span className="text-amber-700 dark:text-amber-400">Pendiente</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Renta base</dt>
                  <dd>{s.base_hours ? `${s.base_hours} horas` : "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {!canEdit && <p className="mt-4 text-xs text-muted-foreground">Solo un administrador puede modificar los espacios.</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar espacio" : "Nuevo espacio"}</DialogTitle>
          </DialogHeader>
          <form id="space-form" onSubmit={submit} className="grid gap-4">
            <Field label="Nombre" htmlFor="s-name" required>
              <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Descripción" htmlFor="s-desc">
              <Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Capacidad" htmlFor="s-cap">
                <Input id="s-cap" type="number" min={1} inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </Field>
              <Field label="Horas base" htmlFor="s-hours">
                <Input id="s-hours" type="number" min={0.5} step={0.5} value={form.base_hours} onChange={(e) => setForm({ ...form, base_hours: e.target.value })} />
              </Field>
              <Field label="Color" htmlFor="s-color">
                <Input id="s-color" type="color" className="p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Orden" htmlFor="s-sort">
                <Input id="s-sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
              </Field>
              <label className="flex h-8 items-center gap-2 text-sm">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Activo
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="space-form" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
