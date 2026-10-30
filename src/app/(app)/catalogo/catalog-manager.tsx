"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BookOpen, Check, CircleAlert, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { NativeSelect } from "@/components/form";
import { savePrice, setPriceActive } from "@/server/actions/catalog";
import { centsToInput, formatMoney, toCents } from "@/lib/money";
import { normalizeSearch } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { CatalogEntry, Category, Menu } from "@/lib/types";
import { ItemDialog } from "./item-dialog";

export function CatalogManager({ entries, menus, categories }: { entries: CatalogEntry[]; menus: Menu[]; categories: Category[] }) {
  const router = useRouter();
  const [menuId, setMenuId] = useState<string>(menus[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });

  const reviewCount = entries.filter((e) => e.needs_review).length;
  const menuCategories = categories.filter((c) => c.menu_id === menuId);

  const rows = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return entries.filter((e) => {
      if (menuId && e.menu_id !== menuId) return false;
      if (categoryId && e.category_id !== categoryId) return false;
      if (onlyReview && !e.needs_review) return false;
      if (!showInactive && (!e.active || !e.item_active)) return false;
      if (q && !normalizeSearch(`${e.name} ${e.variant_label} ${e.description ?? ""} ${e.category_name ?? ""}`).includes(q)) return false;
      return true;
    });
  }, [entries, menuId, categoryId, onlyReview, showInactive, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    for (const r of rows) {
      const k = r.category_name ?? "Sin categoría";
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map];
  }, [rows]);

  if (menus.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="El catálogo está vacío"
        description="Ejecuta supabase/seed.sql para importar los menús de Desayunos y Marino Azul desde los recursos originales."
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b">
        {menus.map((m) => {
          const count = entries.filter((e) => e.menu_id === m.id && e.active && e.item_active).length;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMenuId(m.id);
                setCategoryId("");
              }}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                menuId === m.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {m.name} <span className="ml-1 text-xs text-muted-foreground tabular">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar artículo" className="h-9 pl-8" />
        </div>
        <NativeSelect className="lg:w-56" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {menuCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <div className="flex flex-wrap items-center gap-4 text-sm lg:ml-2">
          <label className="flex items-center gap-2">
            <Switch checked={onlyReview} onCheckedChange={setOnlyReview} /> Por revisar
            {reviewCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800 tabular">{reviewCount}</span>}
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Mostrar inactivos
          </label>
        </div>
        <Button className="lg:ml-auto" onClick={() => setDialog({ open: true, itemId: null })}>
          <Plus /> Nuevo artículo
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Search} title="Sin artículos" description="No hay artículos que coincidan con los filtros." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Artículo</TableHead>
                <TableHead className="hidden md:table-cell">Unidad</TableHead>
                <TableHead className="w-40 text-right">Precio</TableHead>
                <TableHead className="hidden w-20 text-center sm:table-cell">Activo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(([cat, list]) => (
                <CategoryRows key={cat} category={cat} rows={list} onEdit={(id) => setDialog({ open: true, itemId: id })} onChanged={() => router.refresh()} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ItemDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        itemId={dialog.itemId}
        entries={entries}
        menus={menus}
        categories={categories}
        defaultMenuId={menuId}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function CategoryRows({
  category,
  rows,
  onEdit,
  onChanged,
}: {
  category: string;
  rows: CatalogEntry[];
  onEdit: (itemId: string) => void;
  onChanged: () => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={5} className="py-1.5 pl-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {category}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <CatalogRow key={r.price_id} row={r} onEdit={onEdit} onChanged={onChanged} />
      ))}
    </>
  );
}

function CatalogRow({ row, onEdit, onChanged }: { row: CatalogEntry; onEdit: (itemId: string) => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(centsToInput(row.price_cents));
  const [pending, start] = useTransition();

  function savePriceValue() {
    const cents = value.trim() === "" ? null : toCents(value);
    if (value.trim() !== "" && cents == null) return void toast.error("Precio inválido");
    start(async () => {
      const res = await savePrice({
        id: row.price_id,
        menu_id: row.menu_id,
        category_id: row.category_id,
        variant_label: row.variant_label,
        description: row.price_description ?? undefined,
        price_cents: cents,
        active: row.active,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Precio actualizado");
      setEditing(false);
      onChanged();
    });
  }

  function toggle(active: boolean) {
    start(async () => {
      const res = await setPriceActive(row.price_id, active);
      if (!res.ok) return void toast.error(res.error);
      onChanged();
    });
  }

  const inactive = !row.active || !row.item_active;

  return (
    <TableRow className={cn(inactive && "opacity-55")}>
      <TableCell className="max-w-0 pl-4 whitespace-normal">
        <div className="flex items-center gap-2 font-medium">
          {row.name}
          {row.needs_review && (
            <span title={row.review_note ?? "Pendiente de revisión"} className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 text-[11px] font-normal text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <CircleAlert className="size-3" /> Revisar
            </span>
          )}
        </div>
        {row.variant_label && <div className="text-sm text-foreground/80">{row.variant_label}</div>}
        {row.description && <div className="line-clamp-2 text-xs text-muted-foreground">{row.description}</div>}
      </TableCell>
      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{row.unit}</TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              autoFocus
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePriceValue();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 w-24 text-right tabular"
              aria-label="Precio en pesos"
            />
            <Button size="icon-xs" onClick={savePriceValue} disabled={pending} aria-label="Guardar precio">
              <Check />
            </Button>
            <Button size="icon-xs" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancelar">
              <X />
            </Button>
          </div>
        ) : (
          <button
            className="rounded px-1.5 py-0.5 tabular hover:bg-muted"
            onClick={() => {
              setValue(centsToInput(row.price_cents));
              setEditing(true);
            }}
            title="Editar precio"
          >
            {row.price_cents == null ? <span className="text-amber-700 dark:text-amber-400">Sin precio</span> : formatMoney(row.price_cents)}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        <Switch checked={row.active} onCheckedChange={toggle} disabled={pending} aria-label="Activo en este menú" />
      </TableCell>
      <TableCell className="pr-2 text-right">
        <Button size="icon-sm" variant="ghost" aria-label="Editar artículo" onClick={() => onEdit(row.item_id)}>
          <Pencil />
        </Button>
      </TableCell>
    </TableRow>
  );
}
