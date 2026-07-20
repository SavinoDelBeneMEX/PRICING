import { MARKUP_MIN_PCT } from "@/lib/types";

export interface MarkupResult {
  precioCliente: number;
  alertaMarkupBajo: boolean;
}

/**
 * precio_cliente = costo_pricing * (1 + markup_pct / 100)
 * La alerta dispara cuando el markup cae por debajo de MARKUP_MIN_PCT (8%),
 * pero es solo informativa: el vendedor puede seguir adelante.
 */
export function calcularMarkup(costoPricing: number, markupPct: number): MarkupResult {
  const precioCliente = round2(costoPricing * (1 + markupPct / 100));
  return {
    precioCliente,
    alertaMarkupBajo: markupPct < MARKUP_MIN_PCT,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number, moneda = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda }).format(value);
}
