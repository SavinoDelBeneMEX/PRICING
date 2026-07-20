import Link from "next/link";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { SOLICITUD_SERVICIO_STATUS_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/types";

export default async function PricingDashboard() {
  const { profile } = await requireRole("pricing");
  const supabase = createClient();

  const { data: servicios } = await supabase
    .from("solicitud_servicios")
    .select("id, tipo_servicio, detalle_servicio, status, created_at, solicitudes(folio, cliente_nombre)")
    .in("status", ["enviado_a_pricing", "confirmado_a_pricing"])
    .order("created_at", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <h1 className="text-2xl font-bold text-navy mb-6">Cola de cotización</h1>

      {(!servicios || servicios.length === 0) && <div className="card text-center text-muted">No hay solicitudes pendientes.</div>}

      <div className="space-y-3">
        {servicios?.map((s: any) => (
          <Link key={s.id} href={`/pricing/solicitud/${s.id}`} className="card flex items-center justify-between hover:shadow-lg transition-shadow">
            <div>
              <p className="font-semibold text-navy">
                {s.solicitudes?.folio} · {TIPO_SERVICIO_LABELS[s.tipo_servicio as keyof typeof TIPO_SERVICIO_LABELS]}
              </p>
              <p className="text-sm text-muted">{s.solicitudes?.cliente_nombre}</p>
              <p className="text-sm mt-1">{s.detalle_servicio}</p>
            </div>
            <StatusBadge status={s.status} label={SOLICITUD_SERVICIO_STATUS_LABELS[s.status as keyof typeof SOLICITUD_SERVICIO_STATUS_LABELS]} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
