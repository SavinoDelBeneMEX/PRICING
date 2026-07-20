"use client";

import { useState, useTransition } from "react";
import { TIPO_SERVICIO_LABELS, TipoServicio } from "@/lib/types";
import { crearSolicitud, ServicioInput } from "./actions";

const TIPOS = Object.keys(TIPO_SERVICIO_LABELS) as TipoServicio[];

export default function NuevaSolicitudForm() {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteRfc, setClienteRfc] = useState("");
  const [descripcionGeneral, setDescripcionGeneral] = useState("");
  const [seleccionados, setSeleccionados] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleServicio(tipo: TipoServicio) {
    setSeleccionados((prev) => {
      const next = { ...prev };
      if (tipo in next) delete next[tipo];
      else next[tipo] = "";
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const servicios: ServicioInput[] = Object.entries(seleccionados).map(([tipo_servicio, detalle_servicio]) => ({
      tipo_servicio: tipo_servicio as TipoServicio,
      detalle_servicio,
    }));

    if (servicios.length === 0) {
      setError("Selecciona al menos un servicio.");
      return;
    }
    if (servicios.some((s) => !s.detalle_servicio.trim())) {
      setError("Describe qué necesitas cotizar en cada servicio seleccionado.");
      return;
    }

    startTransition(async () => {
      const result = await crearSolicitud({ clienteNombre, clienteRfc, descripcionGeneral, servicios });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="card space-y-4">
        <h2 className="font-semibold text-navy">Datos del cliente</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre del cliente</label>
            <input className="input" required value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          </div>
          <div>
            <label className="label">RFC (opcional)</label>
            <input className="input" value={clienteRfc} onChange={(e) => setClienteRfc(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Descripción general (opcional)</label>
          <textarea className="input" rows={3} value={descripcionGeneral} onChange={(e) => setDescripcionGeneral(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-navy">Servicios a cotizar</h2>
        <p className="text-sm text-muted">Selecciona uno o varios y describe qué necesitas cotizar en cada uno.</p>
        <div className="space-y-3">
          {TIPOS.map((tipo) => {
            const checked = tipo in seleccionados;
            return (
              <div key={tipo} className="border rounded-md p-3">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={checked} onChange={() => toggleServicio(tipo)} />
                  {TIPO_SERVICIO_LABELS[tipo]}
                </label>
                {checked && (
                  <textarea
                    className="input mt-2"
                    rows={2}
                    placeholder="¿Qué necesitas cotizar exactamente?"
                    value={seleccionados[tipo]}
                    onChange={(e) => setSeleccionados((prev) => ({ ...prev, [tipo]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar a Pricing"}
      </button>
    </form>
  );
}
