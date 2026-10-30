import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, FilePlus2, MapPin, Users } from "lucide-react";
import { getDashboard, type QuoteListRow } from "@/server/queries";
import { getCurrentUser } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge, ReservationBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function Kpi({ label, value, href, tone }: { label: string; value: number; href: string; tone?: string }) {
  return (
    <Link href={href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-heading text-4xl leading-none tabular", tone)}>{value}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Ver <ArrowRight className="size-3" />
      </p>
    </Link>
  );
}

function EventList({ rows, empty, showTotal }: { rows: QuoteListRow[]; empty: string; showTotal?: boolean }) {
  if (!rows.length) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/cotizaciones/${r.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50">
            <div className="w-12 shrink-0 text-center">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{formatDate(r.event_date, "MMM")}</p>
              <p className="font-heading text-2xl leading-none">{formatDate(r.event_date, "d")}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.event_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.client_name}
                {r.start_time ? ` · ${formatTime(r.start_time)}–${formatTime(r.end_time)}` : ""} · {r.folio}
              </p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              <ReservationBadge status={r.reservation_status} />
              {showTotal ? <span className="text-xs tabular text-muted-foreground">{formatMoney(Number(r.total_cents))}</span> : <QuoteStatusBadge status={r.status} />}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const [data, user] = await Promise.all([getDashboard(), getCurrentUser()]);
  const firstName = (user.profile?.full_name ?? "").split(" ")[0];
  const isEmpty = data.createdThisMonth + data.pending + data.accepted + data.expired === 0 && data.upcoming.length === 0;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{firstName ? `Hola, ${firstName}` : "Dashboard"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumen de cotizaciones y eventos de Casa Aduana.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/calendario" />}>
            <CalendarDays /> Calendario
          </Button>
          <Button nativeButton={false} render={<Link href="/cotizaciones/nueva" />}>
            <FilePlus2 /> Nueva cotización
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Creadas este mes" value={data.createdThisMonth} href="/cotizaciones" />
        <Kpi label="Pendientes de respuesta" value={data.pending} href="/cotizaciones?estado=enviada" tone="text-sky-800 dark:text-sky-300" />
        <Kpi label="Aceptadas" value={data.accepted} href="/cotizaciones?estado=aceptada" tone="text-emerald-800 dark:text-emerald-300" />
        <Kpi label="Vencidas" value={data.expired} href="/cotizaciones?estado=vencida" tone="text-amber-800 dark:text-amber-300" />
      </div>

      {isEmpty ? (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="font-heading text-2xl">Primeros pasos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aún no hay cotizaciones. Así puedes empezar:</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/configuracion", icon: BookOpen, title: "Revisa la configuración", text: "Completa razón social, RFC y confirma el correo de contacto." },
              { href: "/espacios", icon: MapPin, title: "Revisa los espacios", text: "Captura la capacidad de la terraza y agrega otros espacios." },
              { href: "/catalogo", icon: BookOpen, title: "Revisa el catálogo", text: "Asigna precio a los servicios marcados como pendientes." },
              { href: "/cotizaciones/nueva", icon: Users, title: "Crea tu primera cotización", text: "Registra al cliente directamente desde el formulario." },
            ].map((s, i) => (
              <li key={s.href}>
                <Link href={s.href} className="flex h-full gap-3 rounded-md border p-3 hover:bg-muted/50">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="block text-xs text-muted-foreground">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Próximos eventos · 60 días</h2>
              <Link href="/cotizaciones?orden=event_asc" className="text-xs text-muted-foreground hover:text-foreground">
                Ver todos
              </Link>
            </div>
            <EventList rows={data.upcoming} empty="No hay eventos próximos." showTotal />
          </section>
          <div className="grid content-start gap-6">
            <section className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Fechas apartadas por confirmar</h2>
              </div>
              <EventList rows={data.holds} empty="No hay apartados pendientes." />
            </section>
            <section className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Próximas fechas ocupadas</h2>
              </div>
              <EventList rows={data.confirmed} empty="No hay reservas confirmadas próximas." />
            </section>
          </div>
        </div>
      )}
    </>
  );
}
