import { notFound } from "next/navigation";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { PROVEEDOR_STATUS_LABELS, TIPO_PROVEEDOR_LABELS } from "@/lib/types";
import AltaButton from "./AltaButton";

export default async function FinanzasProveedorPage({ params }: { params: { id: string } }) {
  const { profile } = await requireRole("finanzas");
  const supabase = createClient();

  const { data: proveedor } = await supabase
    .from("proveedores")
    .select(
      "id, tipo_proveedor, status, razon_social, contacto_nombre, email_invitacion, solicitud_servicios(tipo_servicio, solicitudes(folio, cliente_nombre))"
    )
    .eq("id", params.id)
    .single();

  if (!proveedor) notFound();

  const { data: documentos } = await supabase
    .from("documentos_proveedor")
    .select("id, archivo_url, estatus, documentos_checklist(nombre_documento, categoria)")
    .eq("proveedor_id", proveedor.id)
    .eq("estatus", "aprobado");

  return (
    <AppShell role="finanzas" userName={profile.full_name}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">{proveedor.razon_social || proveedor.email_invitacion}</h1>
        <p className="text-muted">
          {TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor as keyof typeof TIPO_PROVEEDOR_LABELS]} ·{" "}
          {(proveedor as any).solicitud_servicios?.solicitudes?.folio} · {(proveedor as any).solicitud_servicios?.solicitudes?.cliente_nombre}
        </p>
        <p className="text-sm mt-1">Contacto: {proveedor.contacto_nombre}</p>
        <div className="mt-2">
          <StatusBadge status={proveedor.status} label={PROVEEDOR_STATUS_LABELS[proveedor.status as keyof typeof PROVEEDOR_STATUS_LABELS]} />
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-navy mb-3">Documentos aprobados por Legal ({documentos?.length || 0})</h2>
        <ul className="text-sm space-y-1">
          {documentos?.map((d: any) => (
            <li key={d.id}>✅ {d.documentos_checklist?.nombre_documento}</li>
          ))}
        </ul>
      </div>

      {proveedor.status === "aprobado_legal" ? (
        <AltaButton proveedorId={proveedor.id} />
      ) : (
        <p className="text-sm text-green-700">Alta ya completada.</p>
      )}
    </AppShell>
  );
}
