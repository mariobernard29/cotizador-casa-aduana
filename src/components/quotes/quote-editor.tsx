"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Loader2, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form";
import { Section } from "@/components/page-header";
import { ClientPicker } from "./client-picker";
import { ItemPicker } from "./item-picker";
import { AvailabilityPanel } from "./availability-panel";
import { SaveToCatalogDialog, type CustomLineDraft } from "./save-to-catalog-dialog";
import { saveQuote } from "@/server/actions/quotes";
import { calculateQuote, type DiscountType } from "@/lib/quote-calc";
import { centsToInput, formatMoney, toCents } from "@/lib/money";
import { addDaysISO, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPES,
  type BusinessSettings,
  type CatalogEntry,
  type Category,
  type Client,
  type Menu,
  type Quote,
  type QuoteLine,
  type Space,
} from "@/lib/types";

interface LineState {
  key: string;
  item_id: string | null;
  menu_id: string | null;
  description: string;
  detail: string;
  unit: string;
  quantity: string;
  price: string;
}

export interface QuoteEditorProps {
  settings: BusinessSettings;
  catalog: CatalogEntry[];
  menus: Menu[];
  categories: Category[];
  spaces: Space[];
  initial?: { quote: Quote; lines: QuoteLine[]; spaceIds: string[]; client: Client | null };
  presetClient?: Client | null;
  presetDate?: string;
}

let keySeq = 0;
const newKey = () => `l${Date.now().toString(36)}${(keySeq++).toString(36)}`;

function parseQty(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function QuoteEditor({ settings, catalog, menus, categories, spaces, initial, presetClient, presetDate }: QuoteEditorProps) {
  const router = useRouter();
  const q = initial?.quote;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [client, setClient] = useState<Client | null>(initial?.client ?? presetClient ?? null);
  const [ev, setEv] = useState({
    event_name: q?.event_name ?? "",
    event_type: q?.event_type ?? "",
    event_date: q?.event_date ?? presetDate ?? "",
    start_time: q?.start_time?.slice(0, 5) ?? "",
    end_time: q?.end_time?.slice(0, 5) ?? "",
    guests: q?.guests?.toString() ?? "",
    menu_id: q?.menu_id ?? "",
    valid_until: q?.valid_until ?? addDaysISO(todayISO(), settings.default_validity_days),
    notes: q?.notes ?? "",
    terms: q?.terms ?? settings.default_terms ?? "",
  });
  const [spaceIds, setSpaceIds] = useState<string[]>(initial?.spaceIds ?? (spaces.length === 1 ? [spaces[0].id] : []));
  const [lines, setLines] = useState<LineState[]>(
    (initial?.lines ?? []).map((l) => ({
      key: newKey(),
      item_id: l.item_id,
      menu_id: l.menu_id,
      description: l.description,
      detail: l.detail ?? "",
      unit: l.unit ?? "",
      quantity: String(l.quantity),
      price: centsToInput(l.unit_price_cents),
    })),
  );
  const [discountType, setDiscountType] = useState<DiscountType>(q?.discount_type ?? "none");
  const [discountValue, setDiscountValue] = useState(q?.discount_value ? String(q.discount_value) : "");
  const [pickerMenu, setPickerMenu] = useState(q?.menu_id ?? "");
  const [catalogDialog, setCatalogDialog] = useState<{ open: boolean; key: string | null }>({ open: false, key: null });

  const taxRate = q?.tax_rate ?? settings.tax_rate;
  const taxMode = q?.tax_mode ?? settings.tax_mode;

  const calc = useMemo(
    () =>
      calculateQuote({
        lines: lines.map((l) => ({ quantity: parseQty(l.quantity), unitPriceCents: toCents(l.price) ?? 0 })),
        discountType,
        discountValue: Number(discountValue) || 0,
        taxRate,
        taxMode,
      }),
    [lines, discountType, discountValue, taxRate, taxMode],
  );

  const setField = (k: keyof typeof ev) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEv((s) => ({ ...s, [k]: e.target.value }));

  const updateLine = (key: string, patch: Partial<LineState>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function addFromCatalog(e: CatalogEntry) {
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        item_id: e.item_id,
        menu_id: e.menu_id,
        description: e.variant_label ? `${e.name} — ${e.variant_label}` : e.name,
        detail: e.description ?? "",
        unit: e.unit,
        quantity: ev.guests && e.kind !== "service" ? ev.guests : "1",
        price: centsToInput(e.price_cents),
      },
    ]);
    if (e.price_cents == null) toast.warning(`“${e.name}” no tiene precio en el catálogo. Captúralo en la partida.`);
  }

  function addCustom() {
    const key = newKey();
    setLines((ls) => [...ls, { key, item_id: null, menu_id: null, description: "", detail: "", unit: "servicio", quantity: "1", price: "" }]);
    setTimeout(() => document.getElementById(`desc-${key}`)?.focus(), 0);
  }

  function move(key: string, dir: -1 | 1) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.key === key);
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!client) return setError("Selecciona o registra un cliente.");
    for (const [i, l] of lines.entries()) {
      if (!l.description.trim()) return setError(`La partida ${i + 1} no tiene descripción.`);
      if (parseQty(l.quantity) <= 0) return setError(`La partida ${i + 1} necesita una cantidad mayor a cero.`);
      if (toCents(l.price) == null) return setError(`La partida ${i + 1} necesita un precio válido.`);
    }
    start(async () => {
      const res = await saveQuote({
        id: q?.id,
        client_id: client.id,
        event_name: ev.event_name,
        event_type: ev.event_type || undefined,
        event_date: ev.event_date,
        start_time: ev.start_time,
        end_time: ev.end_time,
        guests: ev.guests ? Number(ev.guests) : null,
        menu_id: ev.menu_id || null,
        valid_until: ev.valid_until,
        discount_type: discountType,
        discount_value: discountType === "none" ? 0 : Number(discountValue) || 0,
        notes: ev.notes,
        terms: ev.terms,
        space_ids: spaceIds,
        lines: lines.map((l) => ({
          item_id: l.item_id,
          menu_id: l.menu_id,
          description: l.description,
          detail: l.detail || null,
          unit: l.unit || null,
          quantity: parseQty(l.quantity),
          unit_price_cents: toCents(l.price) ?? 0,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(q ? "Cotización actualizada" : "Cotización creada");
      router.push(`/cotizaciones/${res.data.id}`);
      router.refresh();
    });
  }

  const catalogLine = lines.find((l) => l.key === catalogDialog.key);
  const catalogDraft: CustomLineDraft | null = catalogLine
    ? { description: catalogLine.description, detail: catalogLine.detail, unit: catalogLine.unit, priceCents: toCents(catalogLine.price) ?? 0 }
    : null;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 content-start gap-6">
        <Section title="Cliente">
          <ClientPicker value={client} onChange={setClient} />
        </Section>

        <Section title="Evento">
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Nombre del evento" className="sm:col-span-4" required>
              <Input value={ev.event_name} onChange={setField("event_name")} placeholder="Ej. Boda de Ana y Luis" required />
            </Field>
            <Field label="Tipo" className="sm:col-span-2">
              <NativeSelect value={ev.event_type} onChange={setField("event_type")}>
                <option value="">—</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Fecha del evento" className="sm:col-span-2" required>
              <Input type="date" value={ev.event_date} onChange={setField("event_date")} required />
            </Field>
            <Field label="Inicio" className="sm:col-span-1">
              <Input type="time" value={ev.start_time} onChange={setField("start_time")} step={900} />
            </Field>
            <Field label="Fin" className="sm:col-span-1">
              <Input type="time" value={ev.end_time} onChange={setField("end_time")} step={900} />
            </Field>
            <Field label="Invitados" className="sm:col-span-2">
              <Input type="number" min={1} inputMode="numeric" value={ev.guests} onChange={setField("guests")} />
            </Field>
            <Field label="Espacios" className="sm:col-span-6">
              {spaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay espacios activos. <Link className="underline" href="/espacios">Regístralos aquí</Link>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {spaces.map((s) => {
                    const on = spaceIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        aria-pressed={on}
                        onClick={() => setSpaceIds((ids) => (on ? ids.filter((i) => i !== s.id) : [...ids, s.id]))}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        <span className="size-2 rounded-full" style={{ background: on ? "currentColor" : s.color }} />
                        {s.name}
                        {s.capacity ? <span className="text-xs opacity-70">· {s.capacity}</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
            <div className="sm:col-span-6">
              <AvailabilityPanel
                date={ev.event_date}
                start={ev.start_time}
                end={ev.end_time}
                spaceIds={spaceIds}
                spaces={spaces}
                guests={ev.guests ? Number(ev.guests) : null}
                settings={settings}
                excludeQuoteId={q?.id}
              />
            </div>
            <Field label="Menú del servicio" className="sm:col-span-3" hint="Filtra el buscador de artículos y aparece en el PDF.">
              <NativeSelect
                value={ev.menu_id}
                onChange={(e) => {
                  setField("menu_id")(e);
                  setPickerMenu(e.target.value);
                }}
              >
                <option value="">Sin menú específico</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Vigencia de la cotización" className="sm:col-span-3" required>
              <Input type="date" value={ev.valid_until} min={q?.issued_on ?? todayISO()} onChange={setField("valid_until")} required />
            </Field>
          </div>
        </Section>

        <Section
          title={`Partidas${lines.length ? ` (${lines.length})` : ""}`}
          actions={
            <Button type="button" size="sm" variant="outline" onClick={addCustom}>
              <PenLine /> Partida personalizada
            </Button>
          }
        >
          <ItemPicker entries={catalog} menus={menus} menuId={pickerMenu} onMenuChange={setPickerMenu} onPick={addFromCatalog} />

          {lines.length === 0 ? (
            <p className="mt-6 rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Busca artículos del catálogo o agrega una partida personalizada.
            </p>
          ) : (
            <div className="mt-4 -mx-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pl-4 font-medium">Concepto</th>
                    <th className="w-20 py-2 text-right font-medium">Cant.</th>
                    <th className="w-24 py-2 pl-2 font-medium">Unidad</th>
                    <th className="w-28 py-2 text-right font-medium">P. unitario</th>
                    <th className="w-28 py-2 text-right font-medium">Importe</th>
                    <th className="w-24 py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.key} className="border-b align-top last:border-0">
                      <td className="py-2 pl-4">
                        <Input
                          id={`desc-${l.key}`}
                          value={l.description}
                          onChange={(e) => updateLine(l.key, { description: e.target.value })}
                          placeholder="Descripción"
                          className="h-8 font-medium"
                          aria-label={`Descripción de la partida ${i + 1}`}
                        />
                        <Input
                          value={l.detail}
                          onChange={(e) => updateLine(l.key, { detail: e.target.value })}
                          placeholder="Detalle (opcional)"
                          className="mt-1 h-7 border-transparent px-2.5 text-xs text-muted-foreground hover:border-input focus-visible:border-ring"
                          aria-label={`Detalle de la partida ${i + 1}`}
                        />
                        {!l.item_id && (
                          <span className="mt-1 inline-flex items-center gap-1 pl-2.5 text-[11px] text-muted-foreground">
                            Personalizada ·
                            <button
                              type="button"
                              className="underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                              disabled={!l.description.trim() || toCents(l.price) == null}
                              onClick={() => setCatalogDialog({ open: true, key: l.key })}
                            >
                              <BookmarkPlus className="mr-0.5 inline size-3" />
                              Guardar en catálogo
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <Input
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                          inputMode="decimal"
                          className="h-8 text-right tabular"
                          aria-label={`Cantidad de la partida ${i + 1}`}
                        />
                      </td>
                      <td className="py-2 pl-2">
                        <Input value={l.unit} onChange={(e) => updateLine(l.key, { unit: e.target.value })} className="h-8" aria-label={`Unidad de la partida ${i + 1}`} />
                      </td>
                      <td className="py-2">
                        <Input
                          value={l.price}
                          onChange={(e) => updateLine(l.key, { price: e.target.value })}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={cn("h-8 text-right tabular", l.price !== "" && toCents(l.price) == null && "border-destructive")}
                          aria-label={`Precio unitario de la partida ${i + 1}`}
                        />
                      </td>
                      <td className="py-2 pt-3.5 text-right font-medium tabular">{formatMoney(calc.lineTotals[i])}</td>
                      <td className="py-2 pr-4">
                        <div className="flex justify-end">
                          <Button type="button" size="icon-sm" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => move(l.key, -1)}>
                            <ArrowUp />
                          </Button>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label="Bajar" disabled={i === lines.length - 1} onClick={() => move(l.key, 1)}>
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Eliminar partida"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Notas y condiciones">
          <div className="grid gap-4">
            <Field label="Notas para el cliente">
              <Textarea value={ev.notes} onChange={setField("notes")} rows={3} placeholder="Detalles del montaje, peticiones especiales…" />
            </Field>
            <Field label="Condiciones comerciales" hint="Una por línea. Se copian de Configuración y se pueden ajustar para esta cotización.">
              <Textarea value={ev.terms} onChange={setField("terms")} rows={5} />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-xs text-muted-foreground">{q ? `Editando ${q.folio}${q.version > 1 ? ` · v${q.version}` : ""}` : "Nueva cotización"}</p>
            <p className="font-heading text-2xl">Resumen</p>
          </div>
          <dl className="grid gap-2 px-4 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular">{formatMoney(calc.subtotal)}</dd>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Descuento</dt>
                <NativeSelect className="w-32" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} aria-label="Tipo de descuento">
                  <option value="none">Sin descuento</option>
                  <option value="percent">Porcentaje</option>
                  <option value="amount">Monto fijo</option>
                </NativeSelect>
              </div>
              {discountType !== "none" && (
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    inputMode="decimal"
                    className="h-8 w-28 text-right tabular"
                    placeholder={discountType === "percent" ? "%" : "$"}
                    aria-label="Valor del descuento"
                  />
                  <dd className="tabular text-destructive">−{formatMoney(calc.discount)}</dd>
                </div>
              )}
            </div>
            {taxMode === "added" && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA {+(taxRate * 100).toFixed(2)} %</dt>
                <dd className="tabular">{formatMoney(calc.tax)}</dd>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="text-2xl font-semibold tabular">{formatMoney(calc.total)}</dd>
            </div>
            {taxMode === "included" && taxRate > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Incluye IVA {+(taxRate * 100).toFixed(2)} %: {formatMoney(calc.tax)}
              </p>
            )}
          </dl>
          <div className="grid gap-2 border-t p-4">
            {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="h-10" disabled={pending || lines.length === 0}>
              {pending && <Loader2 className="animate-spin" />}
              {q ? "Guardar cambios" : "Guardar borrador"}
            </Button>
            <Button type="button" variant="ghost" nativeButton={false} render={<Link href={q ? `/cotizaciones/${q.id}` : "/cotizaciones"} />}>
              Cancelar
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Los importes se verifican de nuevo en el servidor al guardar.</p>
          </div>
        </div>
      </aside>

      <SaveToCatalogDialog
        open={catalogDialog.open}
        onOpenChange={(o) => setCatalogDialog((d) => ({ ...d, open: o }))}
        line={catalogDraft}
        menus={menus}
        categories={categories}
        defaultMenuId={ev.menu_id}
        onSaved={({ item_id, menu_id }) => {
          if (catalogDialog.key) updateLine(catalogDialog.key, { item_id, menu_id });
          router.refresh();
        }}
      />
    </form>
  );
}
