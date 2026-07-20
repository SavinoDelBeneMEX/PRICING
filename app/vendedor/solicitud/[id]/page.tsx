import { notFound } from "next/navigation";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ServicioCard from "./ServicioCard";

export default async function SolicitudDetallePage({ params }: { params: { id: string } }) {
  const { profile } = await requireRole("vendedor");
  const supabase = createClient();

  const { data: solicitud } = await supabase
    .from("solicitudes")
    .select("id, folio, cliente_nombre, cliente_rfc, descripcion_general, vendedor_id, created_at")
    .eq("id", params.id)
    .single();

  if (!solicitud || (solicitud.vendedor_id !== profile.id && profile.role !== "admin")) notFound();

  const { data: servicios } = await supabase
    .from("solicitud_servicios")
    .select(
      `id, tipo_servicio, detalle_servicio, status,
       cotizaciones_pricing(id, archivo_url, monto, moneda, vigencia_hasta, notas, created_at),
       cotizaciones_vendedor(id, markup_pct, precio_cliente, moneda, alerta_markup_bajo, evidencia_aceptacion_url, created_at),
       proveedores(id, tipo_proveedor, status, email_invitacion)`
    )
    .eq("solicitud_id", solicitud.id)
    .order("created_at", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">{solicitud.folio}</h1>
        <p className="text-muted">
          {solicitud.cliente_nombre} {solicitud.cliente_rfc ? `· ${solicitud.cliente_rfc}` : ""}
        </p>
        {solicitud.descripcion_general && <p className="text-sm mt-2">{solicitud.descripcion_general}</p>}
      </div>

      <div className="space-y-6">
        {servicios?.map((s) => (
          <ServicioCard key={s.id} servicio={s as any} solicitudId={solicitud.id} />
        ))}
      </div>
    </AppShell>
  );
}
