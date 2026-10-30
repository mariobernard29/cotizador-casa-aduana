"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form";
import { createItem, deletePrice, savePrice, updateItem } from "@/server/actions/catalog";
import { centsToInput, toCents } from "@/lib/money";
import { ITEM_KIND_LABEL, type CatalogEntry, type Category, type ItemKind, type Menu } from "@/lib/types";

interface PriceDraft {
  id?: string;
  menu_id: string;
  category_id: string;
  variant_label: string;
  description: string;
  price: string;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  entries: CatalogEntry[];
  menus: Menu[];
  categories: Category[];
  defaultMenuId: string;
  onSaved: () => void;
}

export function ItemDialog({ open, onOpenChange, itemId, entries, menus, categories, defaultMenuId, onSaved }: Props) {
  const [item, setItem] = useState({ name: "", description: "", unit: "platillo", kind: "food" as ItemKind, active: true, needs_review: false, review_note: "" });
  const [prices, setPrices] = useState<PriceDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRemoved([]);
    const rows = itemId ? entries.filter((e) => e.item_id === itemId) : [];
    if (rows[0]) {
      const first = rows[0];
      setItem({
        name: first.name,
        description: first.item_description ?? "",
        unit: first.unit,
        kind: first.kind,
        active: first.item_active,
        needs_review: first.item_needs_review,
        review_note: first.review_note ?? "",
      });
      setPrices(
        rows.map((r) => ({
          id: r.price_id,
          menu_id: r.menu_id,
          category_id: r.category_id ?? "",
          variant_label: r.variant_label,
          description: r.price_description ?? "",
          price: centsToInput(r.price_cents),
          active: r.active,
        })),
      );
    } else {
      const menu = defaultMenuId || menus[0]?.id || "";
      setItem({ name: "", description: "", unit: "platillo", kind: "food", active: true, needs_review: false, review_note: "" });
      setPrices([{ menu_id: menu, category_id: categories.find((c) => c.menu_id === menu)?.id ?? "", variant_label: "", description: "", price: "", active: true }]);
    }
  }, [open, itemId, entries, defaultMenuId, menus, categories]);

  const updatePrice = (i: number, patch: Partial<PriceDraft>) => setPrices((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    for (const p of prices) {
      if (p.price.trim() !== "" && toCents(p.price) == null) return setError("Hay un precio inválido");
      if (!p.menu_id) return setError("Selecciona el menú de cada precio");
    }
    start(async () => {
      const payload = (p: PriceDraft) => ({
        id: p.id,
        menu_id: p.menu_id,
        category_id: p.category_id || null,
        variant_label: p.variant_label,
        description: p.description || undefined,
        price_cents: p.price.trim() === "" ? null : toCents(p.price),
        active: p.active,
      });

      if (!itemId) {
        const [first, ...rest] = prices;
        const res = await createItem(item, payload(first));
        if (!res.ok) return setError(res.error);
        for (const p of rest) {
          const r = await savePrice({ ...payload(p), item_id: res.data.item_id });
          if (!r.ok) return setError(r.error);
        }
      } else {
        const res = await updateItem({ ...item, id: itemId });
        if (!res.ok) return setError(res.error);
        for (const id of removed) {
          const r = await deletePrice(id);
          if (!r.ok) return setError(r.error);
        }
        for (const p of prices) {
          const r = await savePrice({ ...payload(p), item_id: itemId });
          if (!r.ok) return setError(r.error);
        }
      }
      toast.success("Artículo guardado");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{itemId ? "Editar artículo" : "Nuevo artículo"}</DialogTitle>
          <DialogDescription>
            Un artículo puede tener precio en varios menús y variantes. Los cambios no afectan cotizaciones existentes.
          </DialogDescription>
        </DialogHeader>
        <form id="item-form" onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem_10rem]">
            <Field label="Nombre" required>
              <Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} required />
            </Field>
            <Field label="Unidad" required>
              <Input value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} required list="units" />
              <datalist id="units">
                {["platillo", "orden", "pieza", "bebida", "postre", "cerveza", "persona", "evento", "hora", "servicio"].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
            <Field label="Tipo">
              <NativeSelect value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value as ItemKind })}>
                {Object.entries(ITEM_KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Descripción">
            <Textarea rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <Switch checked={item.active} onCheckedChange={(v) => setItem({ ...item, active: v })} /> Activo
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={item.needs_review} onCheckedChange={(v) => setItem({ ...item, needs_review: v })} /> Pendiente de revisión
            </label>
          </div>
          {item.needs_review && (
            <Field label="Nota de revisión">
              <Input value={item.review_note} onChange={(e) => setItem({ ...item, review_note: e.target.value })} />
            </Field>
          )}

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Precios por menú</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPrices((p) => [...p, { menu_id: menus[0]?.id ?? "", category_id: "", variant_label: "", description: "", price: "", active: true }])
                }
              >
                <Plus /> Agregar precio
              </Button>
            </div>
            {prices.map((p, i) => (
              <div key={p.id ?? `new-${i}`} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_7rem_auto]">
                <NativeSelect value={p.menu_id} onChange={(e) => updatePrice(i, { menu_id: e.target.value, category_id: "" })} aria-label="Menú">
                  {menus.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect value={p.category_id} onChange={(e) => updatePrice(i, { category_id: e.target.value })} aria-label="Categoría">
                  <option value="">Sin categoría</option>
                  {categories
                    .filter((c) => c.menu_id === p.menu_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </NativeSelect>
                <Input value={p.variant_label} placeholder="Variante (opcional)" onChange={(e) => updatePrice(i, { variant_label: e.target.value })} />
                <Input value={p.price} placeholder="Sin precio" inputMode="decimal" className="text-right tabular" onChange={(e) => updatePrice(i, { price: e.target.value })} aria-label="Precio" />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Quitar precio"
                  disabled={prices.length === 1}
                  onClick={() => {
                    if (p.id) setRemoved((r) => [...r, p.id!]);
                    setPrices((list) => list.filter((_, idx) => idx !== i));
                  }}
                >
                  <Trash2 />
                </Button>
                <Input
                  className="sm:col-span-5"
                  value={p.description}
                  placeholder="Descripción en este menú (opcional, reemplaza la general)"
                  onChange={(e) => updatePrice(i, { description: e.target.value })}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="item-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
