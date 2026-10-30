"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form";
import { Section } from "@/components/page-header";
import { updateSettings } from "@/server/actions/settings";
import type { BusinessSettings } from "@/lib/types";

export function SettingsForm({ settings, readOnly }: { settings: BusinessSettings; readOnly: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: settings.name,
    tagline: settings.tagline ?? "",
    legal_name: settings.legal_name ?? "",
    tax_id: settings.tax_id ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    email_verified: settings.email_verified,
    website: settings.website ?? "",
    instagram: settings.instagram ?? "",
    facebook: settings.facebook ?? "",
    tax_rate: String(+(settings.tax_rate * 100).toFixed(2)),
    tax_mode: settings.tax_mode,
    default_validity_days: String(settings.default_validity_days),
    default_terms: settings.default_terms ?? "",
    event_start_time: settings.event_start_time.slice(0, 5),
    event_end_time: settings.event_end_time.slice(0, 5),
    min_lead_days: String(settings.min_lead_days),
    folio_prefix: settings.folio_prefix,
  });

  const text = (k: keyof typeof f) => ({
    value: f[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }),
    disabled: readOnly,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateSettings({
        ...f,
        tax_rate: Number(f.tax_rate) / 100,
        default_validity_days: Number(f.default_validity_days),
        min_lead_days: Number(f.min_lead_days),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Configuración guardada");
      router.refresh();
    });
  }

  const pendingFields = [
    !f.legal_name && "razón social",
    !f.tax_id && "RFC",
    !f.email_verified && "correo verificado",
  ].filter(Boolean);

  return (
    <form onSubmit={submit} className="grid gap-6">
      {pendingFields.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Datos pendientes de completar: {pendingFields.join(", ")}. El correo de contacto aparece escrito de dos formas distintas en
            los recursos del hotel (<em>casadelaadana@</em> y <em>casadelaaduana@</em>); confírmalo antes de enviar cotizaciones.
          </p>
        </div>
      )}

      <Section title="Datos del negocio">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial" required><Input {...text("name")} required /></Field>
          <Field label="Subtítulo"><Input {...text("tagline")} /></Field>
          <Field label="Razón social" hint="Aparece en el PDF si se captura."><Input {...text("legal_name")} placeholder="Pendiente" /></Field>
          <Field label="RFC"><Input {...text("tax_id")} placeholder="Pendiente" /></Field>
          <Field label="Dirección" className="md:col-span-2"><Input {...text("address")} /></Field>
          <Field label="Teléfono"><Input {...text("phone")} /></Field>
          <Field label="Correo electrónico">
            <div className="flex items-center gap-3">
              <Input {...text("email")} type="email" className="flex-1" />
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={f.email_verified} onCheckedChange={(v) => setF({ ...f, email_verified: v })} disabled={readOnly} />
                Verificado
              </label>
            </div>
          </Field>
          <Field label="Sitio web"><Input {...text("website")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instagram"><Input {...text("instagram")} /></Field>
            <Field label="Facebook"><Input {...text("facebook")} /></Field>
          </div>
        </div>
      </Section>

      <Section title="Cotizaciones e impuestos">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Tasa de IVA (%)"><Input {...text("tax_rate")} type="number" min={0} max={99} step={0.01} /></Field>
          <Field label="Los precios" hint="Se aplica a cotizaciones nuevas.">
            <NativeSelect {...text("tax_mode")}>
              <option value="included">Ya incluyen IVA</option>
              <option value="added">No incluyen IVA (se suma)</option>
            </NativeSelect>
          </Field>
          <Field label="Vigencia por defecto (días)"><Input {...text("default_validity_days")} type="number" min={1} max={365} /></Field>
          <Field label="Prefijo de folio" hint="Ej. CA-2026-0001"><Input {...text("folio_prefix")} maxLength={6} /></Field>
          <Field label="Condiciones comerciales" className="md:col-span-4" hint="Una condición por línea. Se copian a cada cotización nueva y se pueden editar en ella.">
            <Textarea {...text("default_terms")} rows={6} />
          </Field>
        </div>
      </Section>

      <Section title="Eventos y disponibilidad">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Horario de eventos desde"><Input {...text("event_start_time")} type="time" /></Field>
          <Field label="hasta"><Input {...text("event_end_time")} type="time" /></Field>
          <Field label="Anticipación mínima (días)" hint="Se avisa si el evento es antes."><Input {...text("min_lead_days")} type="number" min={0} /></Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Zona horaria: {settings.timezone} · Moneda: {settings.currency}</p>
      </Section>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Guardar configuración
          </Button>
        </div>
      )}
    </form>
  );
}
