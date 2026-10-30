/** Estados de cotización y reserva. Las reglas se validan también en la base de datos. */

export const QUOTE_STATUSES = ["borrador", "enviada", "aceptada", "rechazada", "vencida", "cancelada"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const RESERVATION_STATUSES = ["sin_reserva", "apartado", "confirmada", "liberada"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  sin_reserva: "Sin reserva",
  apartado: "Apartado",
  confirmada: "Confirmada",
  liberada: "Liberada",
};

/** Debe coincidir con public.quote_transition_allowed(). */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  borrador: ["enviada", "cancelada"],
  enviada: ["aceptada", "rechazada", "vencida", "cancelada", "borrador"],
  aceptada: ["cancelada"],
  rechazada: ["borrador"],
  vencida: ["borrador"],
  cancelada: [],
};

export const TRANSITION_ACTION_LABEL: Record<QuoteStatus, string> = {
  enviada: "Marcar como enviada",
  aceptada: "Marcar como aceptada",
  rechazada: "Marcar como rechazada",
  vencida: "Marcar como vencida",
  cancelada: "Cancelar cotización",
  borrador: "Reabrir para editar",
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_TRANSITIONS[from].includes(to);
}

/** Acciones de reserva disponibles. Debe coincidir con public.set_reservation(). */
export function reservationActions(status: QuoteStatus, reservation: ReservationStatus): ReservationStatus[] {
  const actions: ReservationStatus[] = [];
  const open = status === "borrador" || status === "enviada" || status === "aceptada";
  const free = reservation === "sin_reserva" || reservation === "liberada";
  if (open && free) actions.push("apartado");
  if (status === "aceptada" && (free || reservation === "apartado")) actions.push("confirmada");
  if (reservation === "apartado" || reservation === "confirmada") actions.push("liberada");
  return actions;
}

export const RESERVATION_ACTION_LABEL: Record<ReservationStatus, string> = {
  apartado: "Apartar fecha",
  confirmada: "Confirmar reserva",
  liberada: "Liberar fecha",
  sin_reserva: "",
};
