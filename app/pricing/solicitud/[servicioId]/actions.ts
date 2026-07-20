"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { notifyProveedorInvitacion, notifyVendedorCotizacionLista } from "@/lib/notifications";
import type { TipoProveedor } from "@/lib/types";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function subirCotizacionPricing(params: {
  servicioId: string;
  archivoUrl: string;
  monto: number;
  moneda: string;
  vigenciaHasta: string | null;
  notas: string;
}) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  const { error: insertError } = await supabase.from("cotizaciones_pricing").insert({
    solicitud_servicio_id: params.servicioId,
    pricing_user_id: user.id,
    archivo_url: params.archivoUrl,
    monto: params.monto,
    moneda: params.moneda,
    vigencia_hasta: params.vigenciaHasta,
    notas: params.notas || null,
  });

  if (insertError) return { error: "No se pudo guardar la cotización." };

  await supabase
    .from("solicitud_servicios")
    .update({ status: "cotizado_por_pricing", updated_at: new Date().toISOString() })
    .eq("id", params.servicioId);

  await logAuditoria({
    entidadTipo: "solicitud_servicio",
    entidadId: params.servicioId,
    usuarioId: user.id,
    accion: "cotizacion_pricing_subida",
    detalle: { monto: params.monto, moneda: params.moneda },
  });

  const admin = createAdminClient();
  const { data: servicio } = await admin
    .from("solicitud_servicios")
    .select("solicitud_id, solicitudes(vendedor_id)")
    .eq("id", params.servicioId)
    .single();
  const vendedorId = (servicio as any)?.solicitudes?.vendedor_id;
  if (vendedorId) {
    const { data: vendedor } = await admin.from("profiles").select("email").eq("id", vendedorId).single();
    const { data: solicitud } = await admin.from("solicitudes").select("folio").eq("id", (servicio as any).solicitud_id).single();
    if (vendedor) await notifyVendedorCotizacionLista(vendedor.email, solicitud?.folio || "", (servicio as any).solicitud_id);
  }

  revalidatePath(`/pricing/solicitud/${params.servicioId}`);
  return { error: null };
}

export async function invitarProveedor(params: { servicioId: string; tipoProveedor: TipoProveedor; email: string }) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  const { data: proveedor, error: insertError } = await supabase
    .from("proveedores")
    .insert({
      solicitud_servicio_id: params.servicioId,
      tipo_proveedor: params.tipoProveedor,
      email_invitacion: params.email,
      invited_by: user.id,
    })
    .select("id, invite_token")
    .single();

  if (insertError || !proveedor) return { error: "No se pudo invitar al proveedor. ¿Ya existe uno para este servicio?" };

  await supabase
    .from("solicitud_servicios")
    .update({ status: "proveedor_invitado", updated_at: new Date().toISOString() })
    .eq("id", params.servicioId);

  await logAuditoria({
    entidadTipo: "proveedor",
    entidadId: proveedor.id,
    usuarioId: user.id,
    accion: "proveedor_invitado",
    detalle: { email: params.email, tipo_proveedor: params.tipoProveedor },
  });

  const admin = createAdminClient();
  const { data: servicio } = await admin.from("solicitud_servicios").select("solicitud_id").eq("id", params.servicioId).single();
  const { data: solicitud } = await admin.from("solicitudes").select("folio").eq("id", servicio?.solicitud_id).single();

  await notifyProveedorInvitacion(params.email, solicitud?.folio || "", proveedor.invite_token);

  revalidatePath(`/pricing/solicitud/${params.servicioId}`);
  return { error: null };
}
