"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form";
import { formatMoney } from "@/lib/money";
import { normalizeSearch } from "@/lib/slug";
import type { CatalogEntry, Menu } from "@/lib/types";

/** Buscador de artículos del catálogo: por nombre o categoría, filtrable por menú. Ctrl+K enfoca. */
export function ItemPicker({
  entries,
  menus,
  menuId,
  onMenuChange,
  onPick,
}: {
  entries: CatalogEntry[];
  menus: Menu[];
  menuId: string;
  onMenuChange: (id: string) => void;
  onPick: (entry: CatalogEntry) => void;
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const results = useMemo(() => {
    const q = normalizeSearch(term.trim());
    const words = q.split(/\s+/).filter(Boolean);
    return entries
      .filter((e) => !menuId || e.menu_id === menuId)
      .filter((e) => {
        if (!words.length) return true;
        const hay = normalizeSearch(`${e.name} ${e.variant_label} ${e.category_name ?? ""} ${e.description ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 60);
  }, [entries, menuId, term]);

  function pick(e: CatalogEntry) {
    onPick(e);
    setTerm("");
    setActive(0);
    inputRef.current?.focus();
  }

  let lastCategory = "";
  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[active]) pick(results[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Buscar artículo por nombre o categoría…"
            className="h-9 pl-8"
            role="combobox"
            aria-expanded={open}
            aria-controls="item-results"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">
            Ctrl K
          </kbd>
        </div>
        <NativeSelect className="sm:w-48" value={menuId} onChange={(e) => onMenuChange(e.target.value)} aria-label="Filtrar por menú">
          <option value="">Todos los menús</option>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {open && (
        <ul id="item-results" role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">Sin coincidencias. Puedes agregar una partida personalizada.</li>}
          {results.map((e, i) => {
            const header = `${menuId ? "" : `${e.menu_name} · `}${e.category_name ?? ""}`;
            const showHeader = header !== lastCategory;
            lastCategory = header;
            return (
              <li key={e.price_id} role="none">
                {showHeader && <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{header}</p>}
                <div
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    pick(e);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm ${i === active ? "bg-accent" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="font-medium">{e.name}</span>
                    {e.variant_label && <span className="text-muted-foreground"> — {e.variant_label}</span>}
                    <span className="ml-2 text-xs text-muted-foreground">{e.unit}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 tabular">
                    {e.price_cents == null ? <span className="text-xs text-amber-700">Sin precio</span> : formatMoney(e.price_cents)}
                    <Plus className="size-3.5 text-muted-foreground" />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
