"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { Ban, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form";
import { createBlock, deleteBlock, loadCalendarEvents } from "@/server/actions/calendar";
import type { CalendarEvent } from "@/server/queries";
import type { Space } from "@/lib/types";
import { todayISO } from "@/lib/dates";

/** Convierte un instante a "hora de pared" del negocio sin zona, para que FullCalendar lo muestre tal cual. */
function wall(iso: string, tz: string) {
  if (!iso.includes("T")) return iso;
  return format(new TZDate(new Date(iso).getTime(), tz), "yyyy-MM-dd'T'HH:mm:ss");
}

const STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  confirmed: { bg: "#1f4e6e", border: "#1f4e6e", text: "#ffffff", label: "Reserva confirmada" },
  hold: { bg: "#fdf3dc", border: "#d9a441", text: "#6b4a0e", label: "Fecha apartada" },
  quote: { bg: "#ffffff", border: "#9aa8b1", text: "#3d4b55", label: "Cotización sin reserva" },
  block: { bg: "#f3e4e4", border: "#b85c5c", text: "#6e2a2a", label: "Bloqueo" },
};

export function EventCalendar({ spaces, timezone, slotMin, slotMax }: { spaces: Space[]; timezone: string; slotMin: string; slotMax: string }) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState("");
  const [showQuotes, setShowQuotes] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ space_id: "", date: todayISO(), start_time: "09:00", end_time: "23:30", reason: "" });
  const [selectedBlock, setSelectedBlock] = useState<CalendarEvent | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    calRef.current?.getApi().changeView(isMobile ? "listMonth" : "dayGridMonth");
  }, [isMobile]);

  const load = useCallback(async (r: { from: string; to: string }) => {
    setLoading(true);
    const res = await loadCalendarEvents(r.from, r.to);
    setLoading(false);
    if (!res.ok) return void toast.error(res.error);
    setEvents(res.data);
  }, []);

  useEffect(() => {
    if (range) load(range);
  }, [range, load]);

  function onDatesSet(arg: DatesSetArg) {
    // Se amplía un día por lado para cubrir la diferencia de zona horaria.
    const from = new Date(arg.start.getTime() - 86400000).toISOString();
    const to = new Date(arg.end.getTime() + 86400000).toISOString();
    setRange((r) => (r?.from === from && r?.to === to ? r : { from, to }));
  }

  const fcEvents: EventInput[] = useMemo(
    () =>
      events
        .filter((e) => showQuotes || e.kind !== "quote")
        .filter((e) => !spaceFilter || e.kind === "quote" || e.spaceId === spaceFilter || (e.kind === "block" && !e.spaceId))
        .map((e) => {
          const key = e.kind === "booking" ? e.status : e.kind;
          const st = STYLE[key] ?? STYLE.quote;
          const allDay = !e.start.includes("T");
          return {
            id: e.id,
            title: e.kind === "quote" ? `${e.title} (${e.folio})` : e.title,
            start: wall(e.start, timezone),
            end: allDay ? undefined : wall(e.end, timezone),
            allDay,
            backgroundColor: st.bg,
            borderColor: st.border,
            textColor: st.text,
            extendedProps: e,
          };
        }),
    [events, showQuotes, spaceFilter, timezone],
  );

  function onEventClick(arg: EventClickArg) {
    const e = arg.event.extendedProps as CalendarEvent;
    if (e.quoteId) router.push(`/cotizaciones/${e.quoteId}`);
    else if (e.kind === "block") setSelectedBlock(e);
  }

  function saveBlock() {
    start(async () => {
      const res = await createBlock({ ...blockForm, space_id: blockForm.space_id || null });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Bloqueo creado");
      setBlockDialog(false);
      if (range) load(range);
    });
  }

  function removeBlock() {
    if (!selectedBlock) return;
    start(async () => {
      const res = await deleteBlock(selectedBlock.id.replace(/^k-/, ""));
      if (!res.ok) return void toast.error(res.error);
      toast.success("Bloqueo eliminado");
      setSelectedBlock(null);
      if (range) load(range);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect className="w-52" value={spaceFilter} onChange={(e) => setSpaceFilter(e.target.value)} aria-label="Filtrar por espacio">
          <option value="">Todos los espacios</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={showQuotes} onChange={(e) => setShowQuotes(e.target.checked)} />
          Mostrar cotizaciones sin reserva
        </label>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setBlockDialog(true)}>
          <Ban /> Bloquear fecha
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.values(STYLE).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border" style={{ background: s.bg, borderColor: s.border }} /> {s.label}
          </span>
        ))}
      </div>

      <div className="fc-casa rounded-lg border bg-card p-2 sm:p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={esLocale}
          timeZone="local"
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listMonth" }}
          buttonText={{ list: "Lista" }}
          height="auto"
          events={fcEvents}
          datesSet={onDatesSet}
          eventClick={onEventClick}
          dateClick={(arg) => router.push(`/cotizaciones/nueva?fecha=${arg.dateStr.slice(0, 10)}`)}
          dayMaxEvents={3}
          slotMinTime={slotMin.slice(0, 5)}
          slotMaxTime={slotMax.slice(0, 5) >= "23:00" ? "24:00" : slotMax.slice(0, 5)}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          nowIndicator
          eventDisplay="block"
          noEventsText="Sin eventos en este periodo"
        />
      </div>
      <p className="text-xs text-muted-foreground">Horarios en la zona del negocio ({timezone}). Haz clic en un día para cotizar esa fecha.</p>

      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear fecha</DialogTitle>
            <DialogDescription>Impide confirmar reservas en ese horario (mantenimiento, evento privado, cierre…).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Espacio">
              <NativeSelect value={blockForm.space_id} onChange={(e) => setBlockForm({ ...blockForm, space_id: e.target.value })}>
                <option value="">Todo el lugar</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Fecha">
                <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
              </Field>
              <Field label="Desde">
                <Input type="time" value={blockForm.start_time} onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })} />
              </Field>
              <Field label="Hasta">
                <Input type="time" value={blockForm.end_time} onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })} />
              </Field>
            </div>
            <Field label="Motivo" required>
              <Input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} placeholder="Ej. Mantenimiento de terraza" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveBlock} disabled={pending || blockForm.reason.trim().length < 3}>
              {pending && <Loader2 className="animate-spin" />} Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBlock} onOpenChange={(o) => !o && setSelectedBlock(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedBlock?.title}</DialogTitle>
            <DialogDescription>{selectedBlock?.spaceName}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={removeBlock} disabled={pending}>
              <Trash2 /> Quitar bloqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
