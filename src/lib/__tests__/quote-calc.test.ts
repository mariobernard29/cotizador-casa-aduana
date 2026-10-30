import { describe, expect, it } from "vitest";
import { calculateQuote, lineTotal, roundDiv } from "../quote-calc";

describe("roundDiv", () => {
  it("redondea mitades alejándose de cero (como round() de Postgres)", () => {
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(-5, 2)).toBe(-3);
    expect(roundDiv(4, 3)).toBe(1);
    expect(roundDiv(5, 3)).toBe(2);
  });
});

describe("lineTotal", () => {
  it("multiplica cantidad por precio en centavos", () => {
    expect(lineTotal(3, 21000)).toBe(63000);
    expect(lineTotal(1.5, 7500)).toBe(11250);
  });
  it("redondea cantidades decimales al centavo", () => {
    expect(lineTotal(0.33, 1001)).toBe(330); // 330.33 → 330
    expect(lineTotal(2.5, 3)).toBe(8); // 7.5 → 8
  });
  it("evita errores de punto flotante", () => {
    expect(lineTotal(0.1 + 0.2, 10000)).toBe(3000);
  });
});

describe("calculateQuote", () => {
  const lines = [
    { quantity: 50, unitPriceCents: 34000 }, // 17,000.00
    { quantity: 50, unitPriceCents: 18500 }, // 9,250.00
  ];

  it("IVA incluido: el total no cambia y se desglosa el impuesto", () => {
    const r = calculateQuote({ lines, discountType: "none", discountValue: 0, taxRate: 0.16, taxMode: "included" });
    expect(r.subtotal).toBe(2625000);
    expect(r.total).toBe(2625000);
    // 26,250 / 1.16 = 22,629.31 → IVA 3,620.69
    expect(r.tax).toBe(362069);
  });

  it("IVA añadido: se suma al subtotal", () => {
    const r = calculateQuote({ lines, discountType: "none", discountValue: 0, taxRate: 0.16, taxMode: "added" });
    expect(r.tax).toBe(420000);
    expect(r.total).toBe(3045000);
  });

  it("descuento porcentual antes de impuestos", () => {
    const r = calculateQuote({ lines, discountType: "percent", discountValue: 10, taxRate: 0.16, taxMode: "added" });
    expect(r.discount).toBe(262500);
    expect(r.base).toBe(2362500);
    expect(r.tax).toBe(378000);
    expect(r.total).toBe(2740500);
  });

  it("descuento de monto fijo nunca supera el subtotal", () => {
    const r = calculateQuote({ lines: [{ quantity: 1, unitPriceCents: 10000 }], discountType: "amount", discountValue: 500, taxRate: 0.16, taxMode: "included" });
    expect(r.discount).toBe(10000);
    expect(r.total).toBe(0);
    expect(r.tax).toBe(0);
  });

  it("porcentaje mayor a 100 se limita", () => {
    const r = calculateQuote({ lines: [{ quantity: 1, unitPriceCents: 10000 }], discountType: "percent", discountValue: 150, taxRate: 0, taxMode: "added" });
    expect(r.discount).toBe(10000);
  });

  it("sin partidas todo es cero", () => {
    const r = calculateQuote({ lines: [], discountType: "none", discountValue: 0, taxRate: 0.16, taxMode: "included" });
    expect(r).toMatchObject({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  });
});
