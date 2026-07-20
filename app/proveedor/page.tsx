import { requireProveedor } from "@/lib/proveedor-auth";
import { createClient } from "@/lib/supabase/server";
import ProveedorShell from "@/components/ProveedorShell";
import StatusBadge from "@/components/StatusBadge";
import { PROVEEDOR_STATUS_LABELS, TIPO_PROVEEDOR_LABELS } from "@/lib/types";
import ChecklistProveedor from "./ChecklistProveedor";

export default async function ProveedorPage() {
  const { proveedor } = await requireProveedor();
  const supabase = createClient();

  const { data: checklist } = await supabase
    .from("documentos_checklist")
    .select("id, nombre_documento, categoria, obligatorio, orden")
    .or(`tipo_proveedor.is.null,tipo_proveedor.eq.${proveedor.tipo_proveedor}`)
    .order("orden", { ascending: true });

  const { data: existentes } = await supabase
    .from("documentos_proveedor")
    .select("checklist_item_id")
    .eq("proveedor_id", proveedor.id);

  const existentesIds = new Set((existentes || []).map((d) => d.checklist_item_id));
  const faltantes = (checklist || []).filter((c) => !existentesIds.has(c.id));

  if (faltantes.length > 0) {
    await supabase.from("documentos_proveedor").insert(
      faltantes.map((c) => ({ proveedor_id: proveedor.id, checklist_item_id: c.id, estatus: "pendiente" as const }))
    );
  }

  const { data: documentos } = await supabase
    .from("documentos_proveedor")
    .select("id, checklist_item_id, archivo_url, estatus, comentario_legal")
    .eq("proveedor_id", proveedor.id);

  const solicitudServicio = Array.isArray(proveedor.solicitud_servicios) ? proveedor.solicitud_servicios[0] : (proveedor as any).solicitud_servicios;
  const solicitud = solicitudServicio
    ? Array.isArray(solicitudServicio.solicitudes)
      ? solicitudServicio.solicitudes[0]
      : solicitudServicio.solicitudes
    : null;

  return (
    <ProveedorShell nombre={proveedor.razon_social || proveedor.contacto_nombre || ""}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">{proveedor.razon_social}</h1>
        <p className="text-muted">
          {TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor as keyof typeof TIPO_PROVEEDOR_LABELS]} · Folio {solicitud?.folio ?? "—"} ·{" "}
          {solicitud?.cliente_nombre ?? ""}
        </p>
        <div className="mt-2">
          <StatusBadge status={proveedor.status} label={PROVEEDOR_STATUS_LABELS[proveedor.status as keyof typeof PROVEEDOR_STATUS_LABELS]} />
        </div>
      </div>

      <ChecklistProveedor
        proveedorId={proveedor.id}
        checklist={checklist || []}
        documentos={documentos || []}
        proveedorStatus={proveedor.status as keyof typeof PROVEEDOR_STATUS_LABELS}
      />
    </ProveedorShell>
  );
}
