import Link from "next/link";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { PROVEEDOR_STATUS_LABELS, TIPO_PROVEEDOR_LABELS } from "@/lib/types";

export default async function FinanzasDashboard() {
  const { profile } = await requireRole("finanzas");
  const supabase = createClient();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select(
      "id, tipo_proveedor, status, razon_social, email_invitacion, solicitud_servicios(tipo_servicio, solicitudes(folio, cliente_nombre))"
    )
    .eq("status", "aprobado_legal")
    .order("invited_at", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <h1 className="text-2xl font-bold text-navy mb-6">Altas pendientes</h1>

      {(!proveedores || proveedores.length === 0) && <div className="card text-center text-muted">No hay altas pendientes.</div>}

      <div className="space-y-3">
        {proveedores?.map((p: any) => (
          <Link key={p.id} href={`/finanzas/proveedor/${p.id}`} className="card flex items-center justify-between hover:shadow-lg transition-shadow">
            <div>
              <p className="font-semibold text-navy">{p.razon_social || p.email_invitacion}</p>
              <p className="text-sm text-muted">
                {TIPO_PROVEEDOR_LABELS[p.tipo_proveedor as keyof typeof TIPO_PROVEEDOR_LABELS]} · {p.solicitud_servicios?.solicitudes?.folio}
              </p>
            </div>
            <StatusBadge status={p.status} label={PROVEEDOR_STATUS_LABELS[p.status as keyof typeof PROVEEDOR_STATUS_LABELS]} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
