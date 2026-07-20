"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/markup";
import { PROVEEDOR_STATUS_LABELS, TIPO_PROVEEDOR_LABELS, TipoProveedor } from "@/lib/types";
import { invitarProveedor, subirCotizacionPricing } from "./actions";

const TIPOS_PROVEEDOR = Object.keys(TIPO_PROVEEDOR_LABELS) as TipoProveedor[];

interface Servicio {
  id: string;
  status: string;
  cotizaciones_pricing: { id: string; archivo_url: string; monto: number; moneda: string; vigencia_hasta: string | null; notas: string | null }[];
  proveedores: { id: string; tipo_proveedor: TipoProveedor; status: keyof typeof PROVEEDOR_STATUS_LABELS; email_invitacion: string }[];
}

export default function PricingPanel({ servicio }: { servicio: Servicio }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("MXN");
  const [vigencia, setVigencia] = useState("");
  const [notas, setNotas] = useState("");
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);

  const [tipoProveedor, setTipoProveedor] = useState<TipoProveedor>("agente_aduanal");
  const [emailProveedor, setEmailProveedor] = useState("");

  const cotizacion = servicio.cotizaciones_pricing?.[servicio.cotizaciones_pricing.length - 1];
  const proveedor = servicio.proveedores?.[0];

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const path = `${servicio.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("cotizaciones-pricing").upload(path, file);
    setUploading(false);
    if (uploadError) {
      setError("No se pudo subir el archivo.");
      return;
    }
    setArchivoUrl(path);
  }

  function handleSubirCotizacion() {
    setError(null);
    if (!archivoUrl) {
      setError("Sube el PDF de la cotización.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setError("Captura un monto válido.");
      return;
    }
    startTransition(async () => {
      const result = await subirCotizacionPricing({
        servicioId: servicio.id,
        archivoUrl,
        monto: Number(monto),
        moneda,
        vigenciaHasta: vigencia || null,
        notas,
      });
      if (result.error) setError(result.error);
    });
  }

  function handleInvitar() {
    setError(null);
    if (!emailProveedor.trim()) {
      setError("Captura el correo del proveedor.");
      return;
    }
    startTransition(async () => {
      const result = await invitarProveedor({ servicioId: servicio.id, tipoProveedor, email: emailProveedor });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {!cotizacion && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-navy">Subir cotización</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Monto</label>
              <input type="number" className="input" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="label">Vigencia hasta</label>
              <input type="date" className="input" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <div>
            <label className="label">PDF de la cotización</label>
            <input type="file" accept="application/pdf" onChange={handleArchivo} disabled={uploading} />
            {archivoUrl && <p className="text-xs text-green-700 mt-1">Archivo listo para guardar.</p>}
          </div>
          <button className="btn-primary" onClick={handleSubirCotizacion} disabled={isPending || uploading}>
            {isPending ? "Guardando…" : "Enviar cotización al vendedor"}
          </button>
        </div>
      )}

      {cotizacion && (
        <div className="card">
          <h2 className="font-semibold text-navy mb-2">Cotización enviada</h2>
          <p className="text-sm">
            {formatCurrency(cotizacion.monto, cotizacion.moneda)}
            {cotizacion.vigencia_hasta && ` · vigente hasta ${new Date(cotizacion.vigencia_hasta).toLocaleDateString("es-MX")}`}
          </p>
          {cotizacion.notas && <p className="text-sm text-muted mt-1">{cotizacion.notas}</p>}
        </div>
      )}

      {servicio.status === "confirmado_a_pricing" && !proveedor && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-navy">Invitar proveedor operador</h2>
          <p className="text-sm text-muted">El cliente aceptó. Invita al proveedor que operará este servicio.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de proveedor</label>
              <select className="input" value={tipoProveedor} onChange={(e) => setTipoProveedor(e.target.value as TipoProveedor)}>
                {TIPOS_PROVEEDOR.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PROVEEDOR_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Correo del proveedor</label>
              <input type="email" className="input" value={emailProveedor} onChange={(e) => setEmailProveedor(e.target.value)} />
            </div>
          </div>
          <button className="btn-gold" onClick={handleInvitar} disabled={isPending}>
            {isPending ? "Invitando…" : "Enviar invitación"}
          </button>
        </div>
      )}

      {proveedor && (
        <div className="card">
          <h2 className="font-semibold text-navy mb-2">Proveedor</h2>
          <p className="text-sm mb-2">
            {TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor]} · {proveedor.email_invitacion}
          </p>
          <StatusBadge status={proveedor.status} label={PROVEEDOR_STATUS_LABELS[proveedor.status]} />
        </div>
      )}
    </div>
  );
}
