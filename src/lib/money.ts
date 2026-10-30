/** Utilidades monetarias. Todos los importes se manejan en centavos enteros. */

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return mxn.format(cents / 100);
}

/** Convierte un texto o número en pesos ("1,250.50") a centavos. Devuelve null si no es válido. */
export function toCents(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Centavos a texto editable en pesos ("1250.50"). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}
