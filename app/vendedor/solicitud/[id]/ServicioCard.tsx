"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { calcularMarkup, formatCurrency } from "@/lib/markup";
import {
  MARKUP_MIN_PCT,
  PROVEEDOR_STATUS_LABELS,
  SOLICITUD_SERVICIO_STATUS_LABELS,
  TIPO_PROVEEDOR_LABELS,
  TIPO_SERVICIO_LABELS,
} from "@/lib/types";
import { confirmarAPricing, guardarCotizacionVendedor, subirEvidenciaAceptacion } from "./actions";

interface Servicio {
  id: string;
  tipo_servicio: keyof typeof TIPO_SERVICIO_LABELS;
  detalle_servicio: string;
  status: keyof typeof SOLICITUD_SERVICIO_STATUS_LABELS;
  cotizaciones_pricing: { id: string; archivo_url: string; monto: number; moneda: string; vigencia_hasta: string | null; notas: string | null }[];
  cotizaciones_vendedor: { id: string; markup_pct: number; precio_cliente: number; moneda: string; alerta_markup_bajo: boolean; evidencia_aceptacion_url: string | null }[];
  proveedores: { id: string; tipo_proveedor: keyof typeof TIPO_PROVEEDOR_LABELS; status: keyof typeof PROVEEDOR_STATUS_LABELS; email_invitacion: string }[];
}

export default function ServicioCard({ servicio, solicitudId }: { servicio: Servicio; solicitudId: string }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [markupPct, setMarkupPct] = useState(10);
  const [uploading, setUploading] = useState(false);

  const cotizacionPricing = servicio.cotizaciones_pricing?.[0];
  const cotizacionVendedor = servicio.cotizaciones_vendedor?.[servicio.cotizaciones_vendedor.length - 1];
  const proveedor = servicio.proveedores?.[0];

  const preview = useMemo(() => {
    if (!cotizacionPricing) return null;
    return calcularMarkup(cotizacionPricing.monto, markupPct);
  }, [cotizacionPricing, markupPct]);

  function handleGuardarCotizacion() {
    setError(null);
    startTransition(async () => {
      const result = await guardarCotizacionVendedor({ servicioId: servicio.id, markupPct, solicitudId });
      if (result.error) setError(result.error);
    });
  }

  async function handleSubirEvidencia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const path = `${servicio.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("evidencia-cliente").upload(path, file);
    setUploading(false);
    if (uploadError) {
      setError("No se pudo subir el archivo.");
      return;
    }
    startTransition(async () => {
      const result = await subirEvidenciaAceptacion({ servicioId: servicio.id, archivoUrl: path, solicitudId });
      if (result.error) setError(result.error);
    });
  }

  function handleConfirmar() {
    setError(null);
    startTransition(async () => {
      const result = await confirmarAPricing({ servicioId: servicio.id, solicitudId });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-navy">{TIPO_SERVICIO_LABELS[servicio.tipo_servicio]}</h3>
        <StatusBadge status={servicio.status} label={SOLICITUD_SERVICIO_STATUS_LABELS[servicio.status]} />
      </div>
      <p className="text-sm text-muted mb-4">{servicio.detalle_servicio}</p>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</p>}

      {!cotizacionPricing && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Esperando la cotización de Pricing.
        </p>
      )}

      {cotizacionPricing && !cotizacionVendedor && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm">
            Costo de Pricing: <strong>{formatCurrency(cotizacionPricing.monto, cotizacionPricing.moneda)}</strong>
            {cotizacionPricing.vigencia_hasta && ` · vigente hasta ${new Date(cotizacionPricing.vigencia_hasta).toLocaleDateString("es-MX")}`}
          </p>
          <div>
            <label className="label">Calculadora de markup</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.5"
                className="input w-28"
                value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
              />
              <span className="text-sm">%</span>
              {preview && (
                <span className="text-sm">
                  Precio al cliente: <strong>{formatCurrency(preview.precioCliente, cotizacionPricing.moneda)}</strong>
                </span>
              )}
            </div>
            {preview?.alertaMarkupBajo && (
              <p className="text-sm text-red-700 mt-2">
                ⚠️ El markup está por debajo del {MARKUP_MIN_PCT}%. Puedes continuar, pero verifica con tu gerente si aplica.
              </p>
            )}
          </div>
          <button className="btn-primary" onClick={handleGuardarCotizacion} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cotización al cliente"}
          </button>
        </div>
      )}

      {cotizacionVendedor && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm">
            Markup aplicado: <strong>{cotizacionVendedor.markup_pct}%</strong> · Precio al cliente:{" "}
            <strong>{formatCurrency(cotizacionVendedor.precio_cliente, cotizacionVendedor.moneda)}</strong>
            {cotizacionVendedor.alerta_markup_bajo && <span className="text-red-700"> (bajo el {MARKUP_MIN_PCT}%)</span>}
          </p>

          {!cotizacionVendedor.evidencia_aceptacion_url && (
            <div>
              <label className="label">Evidencia de aceptación del cliente</label>
              <input type="file" className="text-sm" onChange={handleSubirEvidencia} disabled={uploading || isPending} />
              {uploading && <p className="text-xs text-muted mt-1">Subiendo…</p>}
            </div>
          )}

          {cotizacionVendedor.evidencia_aceptacion_url && servicio.status === "aceptado_por_cliente" && (
            <button className="btn-gold" onClick={handleConfirmar} disabled={isPending}>
              {isPending ? "Confirmando…" : "Confirmar a Pricing"}
            </button>
          )}

          {servicio.status === "confirmado_a_pricing" && !proveedor && (
            <p className="text-sm text-green-700">Confirmado. Pricing invitará al proveedor operador.</p>
          )}
        </div>
      )}

      {proveedor && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-1">Proveedor: {TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor]}</p>
          <StatusBadge status={proveedor.status} label={PROVEEDOR_STATUS_LABELS[proveedor.status]} />
        </div>
      )}
    </div>
  );
}
