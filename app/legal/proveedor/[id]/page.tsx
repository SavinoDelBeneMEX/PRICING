import { notFound } from "next/navigation";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { PROVEEDOR_STATUS_LABELS, TIPO_PROVEEDOR_LABELS } from "@/lib/types";
import DocumentoRevisionList from "./DocumentoRevisionList";

export default async function LegalProveedorPage({ params }: { params: { id: string } }) {
  const { profile } = await requireRole("legal");
  const supabase = createClient();

  const { data: proveedor } = await supabase
    .from("proveedores")
    .select(
      "id, tipo_proveedor, status, razon_social, contacto_nombre, email_invitacion, solicitud_servicios(tipo_servicio, solicitudes(folio, cliente_nombre))"
    )
    .eq("id", params.id)
    .single();

  if (!proveedor) notFound();

  const { data: checklist } = await supabase
    .from("documentos_checklist")
    .select("id, nombre_documento, categoria, obligatorio, orden")
    .or(`tipo_proveedor.is.null,tipo_proveedor.eq.${proveedor.tipo_proveedor}`)
    .order("orden", { ascending: true });

  const { data: documentos } = await supabase
    .from("documentos_proveedor")
    .select("id, checklist_item_id, archivo_url, estatus, comentario_legal")
    .eq("proveedor_id", proveedor.id);

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">{proveedor.razon_social || proveedor.email_invitacion}</h1>
        <p className="text-muted">
          {TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor as keyof typeof TIPO_PROVEEDOR_LABELS]} ·{" "}
          {(proveedor as any).solicitud_servicios?.solicitudes?.folio} · {(proveedor as any).solicitud_servicios?.solicitudes?.cliente_nombre}
        </p>
        <div className="mt-2">
          <StatusBadge status={proveedor.status} label={PROVEEDOR_STATUS_LABELS[proveedor.status as keyof typeof PROVEEDOR_STATUS_LABELS]} />
        </div>
      </div>

      <DocumentoRevisionList proveedorId={proveedor.id} checklist={checklist || []} documentos={documentos || []} />
    </AppShell>
  );
}
