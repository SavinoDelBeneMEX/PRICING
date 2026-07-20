import Link from "next/link";
import { requireRole } from "@/lib/internal-auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { SOLICITUD_SERVICIO_STATUS_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/types";

export default async function VendedorDashboard() {
  const { profile } = await requireRole("vendedor");
  const supabase = createClient();

  let query = supabase
    .from("solicitudes")
    .select("id, folio, cliente_nombre, created_at, solicitud_servicios(id, tipo_servicio, status)")
    .order("created_at", { ascending: false });

  if (profile.role !== "admin") {
    query = query.eq("vendedor_id", profile.id);
  }

  const { data: solicitudes } = await query;

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{profile.role === "admin" ? "Todas las solicitudes" : "Mis solicitudes"}</h1>
        <Link href="/vendedor/nueva-solicitud" className="btn-gold">
          + Nueva solicitud
        </Link>
      </div>

      {(!solicitudes || solicitudes.length === 0) && (
        <div className="card text-center text-muted">Aún no has creado solicitudes.</div>
      )}

      <div className="space-y-4">
        {solicitudes?.map((s) => (
          <Link key={s.id} href={`/vendedor/solicitud/${s.id}`} className="card block hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-navy">{s.folio}</span>
              <span className="text-xs text-muted">{new Date(s.created_at).toLocaleDateString("es-MX")}</span>
            </div>
            <p className="text-sm mb-3">{s.cliente_nombre}</p>
            <div className="flex flex-wrap gap-2">
              {(s.solicitud_servicios as any[])?.map((ss) => (
                <span key={ss.id} className="flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs">
                  {TIPO_SERVICIO_LABELS[ss.tipo_servicio as keyof typeof TIPO_SERVICIO_LABELS]}
                  <StatusBadge status={ss.status} label={SOLICITUD_SERVICIO_STATUS_LABELS[ss.status as keyof typeof SOLICITUD_SERVICIO_STATUS_LABELS]} />
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
