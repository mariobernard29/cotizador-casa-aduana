import { describe, expect, it } from "vitest";
import { canTransition, reservationActions } from "../quote-status";
import { eventPeriod, rangesOverlap, parseTstzRange, daysBetween, addDaysISO } from "../dates";

describe("transiciones de cotización", () => {
  it("permite el flujo normal", () => {
    expect(canTransition("borrador", "enviada")).toBe(true);
    expect(canTransition("enviada", "aceptada")).toBe(true);
    expect(canTransition("aceptada", "cancelada")).toBe(true);
  });
  it("bloquea saltos inválidos", () => {
    expect(canTransition("borrador", "aceptada")).toBe(false);
    expect(canTransition("cancelada", "borrador")).toBe(false);
    expect(canTransition("aceptada", "borrador")).toBe(false);
  });
});

describe("acciones de reserva", () => {
  it("aceptar no confirma: solo ofrece confirmar", () => {
    expect(reservationActions("aceptada", "sin_reserva")).toEqual(["apartado", "confirmada"]);
  });
  it("una cotización enviada solo puede apartar", () => {
    expect(reservationActions("enviada", "sin_reserva")).toEqual(["apartado"]);
    expect(reservationActions("enviada", "apartado")).toEqual(["liberada"]);
  });
  it("cancelada no puede reservar", () => {
    expect(reservationActions("cancelada", "sin_reserva")).toEqual([]);
  });
});

describe("fechas y horarios", () => {
  it("convierte hora de Mazatlán (UTC-7) a UTC", () => {
    const p = eventPeriod("2026-12-12", "18:00", "23:30", "America/Mazatlan");
    expect(p.start).toBe("2026-12-13T01:00:00.000Z");
    expect(p.end).toBe("2026-12-13T06:30:00.000Z");
  });
  it("si termina antes de empezar, termina al día siguiente", () => {
    const p = eventPeriod("2026-12-12", "20:00", "01:00", "America/Mazatlan");
    expect(p.end).toBe("2026-12-13T08:00:00.000Z");
  });
  it("detecta traslapes y permite eventos consecutivos", () => {
    expect(rangesOverlap("2026-01-01T10:00Z", "2026-01-01T16:00Z", "2026-01-01T15:00Z", "2026-01-01T20:00Z")).toBe(true);
    expect(rangesOverlap("2026-01-01T10:00Z", "2026-01-01T16:00Z", "2026-01-01T16:00Z", "2026-01-01T20:00Z")).toBe(false);
  });
  it("lee rangos tstzrange de Postgres", () => {
    expect(parseTstzRange('["2026-12-13 01:00:00+00","2026-12-13 06:30:00+00")')).toEqual({
      start: "2026-12-13T01:00:00.000Z",
      end: "2026-12-13T06:30:00.000Z",
    });
  });
  it("calcula días entre fechas", () => {
    expect(daysBetween("2026-10-29", "2026-11-05")).toBe(7);
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
  });
});
