"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form";
import { createItem } from "@/server/actions/catalog";
import { ITEM_KIND_LABEL, type Category, type ItemKind, type Menu } from "@/lib/types";

export interface CustomLineDraft {
  description: string;
  detail: string;
  unit: string;
  priceCents: number;
}

/** Guarda explícitamente una partida personalizada como artículo del catálogo. */
export function SaveToCatalogDialog({
  open,
  onOpenChange,
  line,
  menus,
  categories,
  defaultMenuId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  line: CustomLineDraft | null;
  menus: Menu[];
  categories: Category[];
  defaultMenuId: string;
  onSaved: (ids: { item_id: string; menu_id: string }) => void;
}) {
  const [menuId, setMenuId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");
  const [kind, setKind] = useState<ItemKind>("service");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || !line) return;
    const m = defaultMenuId || menus[0]?.id || "";
    setMenuId(m);
    setCategoryId(categories.find((c) => c.menu_id === m)?.id ?? "");
    setUnit(line.unit || "servicio");
    setError(null);
  }, [open, line, defaultMenuId, menus, categories]);

  function save() {
    if (!line) return;
    start(async () => {
      const res = await createItem(
        { name: line.description, description: line.detail || undefined, unit, kind },
        { menu_id: menuId, category_id: categoryId || null, variant_label: "", price_cents: line.priceCents },
        "custom",
      );
      if (!res.ok) return setError(res.error);
      toast.success("Guardado en el catálogo");
      onSaved({ item_id: res.data.item_id, menu_id: menuId });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar en el catálogo</DialogTitle>
          <DialogDescription>“{line?.description}” quedará disponible para futuras cotizaciones.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Menú">
              <NativeSelect
                value={menuId}
                onChange={(e) => {
                  setMenuId(e.target.value);
                  setCategoryId(categories.find((c) => c.menu_id === e.target.value)?.id ?? "");
                }}
              >
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Categoría">
              <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sin categoría</option>
                {categories
                  .filter((c) => c.menu_id === menuId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Unidad">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
            <Field label="Tipo">
              <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as ItemKind)}>
                {Object.entries(ITEM_KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending || !menuId || !unit.trim()}>
            {pending && <Loader2 className="animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
