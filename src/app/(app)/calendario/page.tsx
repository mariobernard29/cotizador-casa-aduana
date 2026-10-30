import { getSettings, getSpaces } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { EventCalendar } from "./event-calendar";

export const metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const [spaces, settings] = await Promise.all([getSpaces(), getSettings()]);
  return (
    <>
      <PageHeader title="Calendario" description="Reservas confirmadas, fechas apartadas, cotizaciones en curso y bloqueos." />
      <EventCalendar
        spaces={spaces}
        timezone={settings?.timezone ?? "America/Mazatlan"}
        slotMin={settings?.event_start_time ?? "08:00:00"}
        slotMax={settings?.event_end_time ?? "24:00:00"}
      />
    </>
  );
}
