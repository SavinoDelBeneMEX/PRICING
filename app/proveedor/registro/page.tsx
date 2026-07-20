import { createAdminClient } from "@/lib/supabase/admin";
import { TIPO_PROVEEDOR_LABELS } from "@/lib/types";
import RegistroForm from "./RegistroForm";

export default async function RegistroProveedorPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return <MensajeInvalido texto="Falta el enlace de invitación. Solicita a Pricing que te reenvíe el correo." />;
  }

  const admin = createAdminClient();
  const { data: proveedor } = await admin
    .from("proveedores")
    .select(
      "id, email_invitacion, tipo_proveedor, registered_at, solicitud_servicios(tipo_servicio, solicitudes(folio, cliente_nombre))"
    )
    .eq("invite_token", token)
    .single();

  if (!proveedor) {
    return <MensajeInvalido texto="Este enlace de invitación no es válido." />;
  }

  if (proveedor.registered_at) {
    return <MensajeInvalido texto="Esta cuenta ya fue registrada. Inicia sesión desde /proveedor/login." isInfo />;
  }

  const solicitudServicio = Array.isArray(proveedor.solicitud_servicios)
    ? proveedor.solicitud_servicios[0]
    : proveedor.solicitud_servicios;
  const solicitud = solicitudServicio
    ? Array.isArray((solicitudServicio as any).solicitudes)
      ? (solicitudServicio as any).solicitudes[0]
      : (solicitudServicio as any).solicitudes
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="app-header rounded-t-card px-6 py-5 text-center">
          <h1 className="text-lg font-bold">Portal de Pricing SBM</h1>
          <p className="text-white/70 text-sm mt-1">Registro de proveedor</p>
        </div>
        <div className="card rounded-t-none space-y-4">
          <p className="text-sm text-muted">
            Fuiste invitado a subir tu documentación para el folio{" "}
            <strong>{solicitud?.folio ?? "—"}</strong> ({solicitud?.cliente_nombre ?? "—"}) como{" "}
            <strong>{TIPO_PROVEEDOR_LABELS[proveedor.tipo_proveedor as keyof typeof TIPO_PROVEEDOR_LABELS]}</strong>.
          </p>
          <RegistroForm token={token} email={proveedor.email_invitacion} />
        </div>
      </div>
    </div>
  );
}

function MensajeInvalido({ texto, isInfo }: { texto: string; isInfo?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="card max-w-md text-center">
        <p className={isInfo ? "text-navy" : "text-red-700"}>{texto}</p>
      </div>
    </div>
  );
}
