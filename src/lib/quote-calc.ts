/**
 * Cálculo de importes de una cotización. Debe coincidir con public.recalc_quote() en
 * supabase/migrations: el servidor recalcula siempre y su resultado es el que se guarda.
 *
 *   partida   = round(cantidad × precio unitario)
 *   descuento = % del subtotal o monto fijo (nunca mayor al subtotal)
 *   IVA incluido: impuesto = base − round(base / (1 + tasa)); total = base
 *   IVA añadido:  impuesto = round(base × tasa);             total = base + impuesto
 *
 * Se trabaja con enteros (centavos, centésimas de cantidad y puntos base) para evitar
 * errores de punto flotante.
 */

export type TaxMode = "included" | "added";
export type DiscountType = "none" | "percent" | "amount";

export interface CalcLine {
  quantity: number;
  unitPriceCents: number;
}

export interface CalcInput {
  lines: CalcLine[];
  discountType: DiscountType;
  /** Porcentaje (0–100) o monto en pesos, según discountType. */
  discountValue: number;
  /** Tasa como fracción: 0.16 */
  taxRate: number;
  taxMode: TaxMode;
}

export interface CalcResult {
  lineTotals: number[];
  subtotal: number;
  discount: number;
  base: number;
  tax: number;
  total: number;
}

/** Redondeo "half away from zero" de un cociente entero, igual que round() de PostgreSQL. */
export function roundDiv(numerator: number, denominator: number): number {
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor(n / d);
  const r = n - q * d;
  return sign * (r * 2 >= d ? q + 1 : q);
}

export function lineTotal(quantity: number, unitPriceCents: number): number {
  const qtyHundredths = Math.round(quantity * 100);
  return roundDiv(qtyHundredths * unitPriceCents, 100);
}

export function calculateQuote(input: CalcInput): CalcResult {
  const lineTotals = input.lines.map((l) => lineTotal(l.quantity, l.unitPriceCents));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);

  let discount = 0;
  if (input.discountType === "percent") {
    const pctHundredths = Math.round(Math.min(Math.max(input.discountValue, 0), 100) * 100);
    discount = Math.min(roundDiv(subtotal * pctHundredths, 10000), subtotal);
  } else if (input.discountType === "amount") {
    discount = Math.min(Math.round(Math.max(input.discountValue, 0) * 100), subtotal);
  }

  const base = subtotal - discount;
  const rateBp = Math.round(input.taxRate * 10000);
  let tax: number;
  let total: number;
  if (input.taxMode === "included") {
    tax = base - roundDiv(base * 10000, 10000 + rateBp);
    total = base;
  } else {
    tax = roundDiv(base * rateBp, 10000);
    total = base + tax;
  }
  return { lineTotals, subtotal, discount, base, tax, total };
}
