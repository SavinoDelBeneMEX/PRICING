import { notFound } from "next/navigation";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { SOLICITUD_SERVICIO_STATUS_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/types";
import PricingPanel from "./PricingPanel";

export default async function PricingServicioPage({ params }: { params: { servicioId: string } }) {
  const { profile } = await requireRole("pricing");
  const supabase = createClient();

  const { data: servicio } = await supabase
    .from("solicitud_servicios")
    .select(
      `id, tipo_servicio, detalle_servicio, status, solicitud_id,
       solicitudes(folio, cliente_nombre, cliente_rfc),
       cotizaciones_pricing(id, archivo_url, monto, moneda, vigencia_hasta, notas, created_at),
       proveedores(id, tipo_proveedor, status, email_invitacion)`
    )
    .eq("id", params.servicioId)
    .single();

  if (!servicio) notFound();

  return (
    <AppShell role="pricing" userName={profile.full_name}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">
          {(servicio as any).solicitudes?.folio} · {TIPO_SERVICIO_LABELS[servicio.tipo_servicio as keyof typeof TIPO_SERVICIO_LABELS]}
        </h1>
        <p className="text-muted">{(servicio as any).solicitudes?.cliente_nombre}</p>
        <div className="mt-2">
          <StatusBadge status={servicio.status} label={SOLICITUD_SERVICIO_STATUS_LABELS[servicio.status as keyof typeof SOLICITUD_SERVICIO_STATUS_LABELS]} />
        </div>
        <p className="text-sm mt-3">{servicio.detalle_servicio}</p>
      </div>

      <PricingPanel servicio={servicio as any} />
    </AppShell>
  );
}
