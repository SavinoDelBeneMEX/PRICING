import { requireAnyInternalRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

const ACCION_LABELS: Record<string, string> = {
  solicitud_creada: "Solicitud creada",
  cotizacion_pricing_subida: "Pricing subió cotización",
  cotizacion_vendedor_guardada: "Vendedor calculó markup y cotizó al cliente",
  evidencia_aceptacion_subida: "Vendedor subió evidencia de aceptación",
  confirmado_a_pricing: "Vendedor confirmó a Pricing",
  proveedor_invitado: "Pricing invitó a un proveedor",
  proveedor_registrado: "Proveedor completó su registro",
  documento_subido: "Proveedor subió un documento",
  enviado_a_revision_legal: "Expediente enviado a revisión legal",
  documento_aprobado: "Legal aprobó un documento",
  documento_rechazado: "Legal rechazó un documento",
  expediente_aprobado_legal: "Legal aprobó el expediente completo",
  alta_completada: "Finanzas completó el alta",
};

export default async function AuditoriaPage() {
  const { profile } = await requireAnyInternalRole();
  const supabase = createClient();

  const { data: registros } = await supabase
    .from("auditoria")
    .select("id, entidad_tipo, entidad_id, accion, detalle, created_at, actor_label, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <h1 className="text-2xl font-bold text-navy mb-6">Bitácora de auditoría</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Acción</th>
              <th className="py-2 pr-4">Entidad</th>
              <th className="py-2 pr-4">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {registros?.map((r: any) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                <td className="py-2 pr-4">{ACCION_LABELS[r.accion] || r.accion}</td>
                <td className="py-2 pr-4 text-muted">
                  {r.entidad_tipo} · {r.entidad_id.slice(0, 8)}
                </td>
                <td className="py-2 pr-4">{r.profiles?.full_name || r.actor_label || "Sistema"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!registros || registros.length === 0) && <p className="text-center text-muted py-6">Sin actividad registrada.</p>}
      </div>
    </AppShell>
  );
}
