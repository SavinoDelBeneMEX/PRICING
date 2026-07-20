"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { calcularMarkup } from "@/lib/markup";
import { notifyPricingConfirmacionVendedor } from "@/lib/notifications";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function guardarCotizacionVendedor(params: { servicioId: string; markupPct: number; solicitudId: string }) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  const { data: cotizacionPricing } = await supabase
    .from("cotizaciones_pricing")
    .select("monto, moneda")
    .eq("solicitud_servicio_id", params.servicioId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!cotizacionPricing) {
    return { error: "Pricing todavía no ha subido una cotización para este servicio." };
  }

  const { precioCliente, alertaMarkupBajo } = calcularMarkup(cotizacionPricing.monto, params.markupPct);

  const { error: insertError } = await supabase.from("cotizaciones_vendedor").insert({
    solicitud_servicio_id: params.servicioId,
    vendedor_id: user.id,
    costo_pricing: cotizacionPricing.monto,
    markup_pct: params.markupPct,
    precio_cliente: precioCliente,
    moneda: cotizacionPricing.moneda,
    alerta_markup_bajo: alertaMarkupBajo,
  });

  if (insertError) return { error: "No se pudo guardar la cotización." };

  await supabase.from("solicitud_servicios").update({ status: "cotizado_por_vendedor", updated_at: new Date().toISOString() }).eq("id", params.servicioId);

  await logAuditoria({
    entidadTipo: "solicitud_servicio",
    entidadId: params.servicioId,
    usuarioId: user.id,
    accion: "cotizacion_vendedor_guardada",
    detalle: { markup_pct: params.markupPct, precio_cliente: precioCliente, alerta_markup_bajo: alertaMarkupBajo },
  });

  revalidatePath(`/vendedor/solicitud/${params.solicitudId}`);
  return { error: null, alertaMarkupBajo };
}

export async function subirEvidenciaAceptacion(params: { servicioId: string; archivoUrl: string; solicitudId: string }) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  const { data: cotizacion } = await supabase
    .from("cotizaciones_vendedor")
    .select("id")
    .eq("solicitud_servicio_id", params.servicioId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!cotizacion) return { error: "Primero calcula el markup y guarda la cotización." };

  await supabase.from("cotizaciones_vendedor").update({ evidencia_aceptacion_url: params.archivoUrl }).eq("id", cotizacion.id);
  await supabase.from("solicitud_servicios").update({ status: "aceptado_por_cliente", updated_at: new Date().toISOString() }).eq("id", params.servicioId);

  await logAuditoria({
    entidadTipo: "solicitud_servicio",
    entidadId: params.servicioId,
    usuarioId: user.id,
    accion: "evidencia_aceptacion_subida",
  });

  revalidatePath(`/vendedor/solicitud/${params.solicitudId}`);
  return { error: null };
}

export async function confirmarAPricing(params: { servicioId: string; solicitudId: string; notas?: string }) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  await supabase.from("confirmaciones").insert({
    solicitud_servicio_id: params.servicioId,
    vendedor_id: user.id,
    notas: params.notas || null,
  });

  await supabase.from("solicitud_servicios").update({ status: "confirmado_a_pricing", updated_at: new Date().toISOString() }).eq("id", params.servicioId);

  await logAuditoria({
    entidadTipo: "solicitud_servicio",
    entidadId: params.servicioId,
    usuarioId: user.id,
    accion: "confirmado_a_pricing",
  });

  const admin = createAdminClient();
  const { data: solicitud } = await admin.from("solicitudes").select("folio").eq("id", params.solicitudId).single();
  const { data: pricingUsers } = await admin.from("profiles").select("email").eq("role", "pricing").eq("active", true);
  for (const p of pricingUsers || []) {
    await notifyPricingConfirmacionVendedor(p.email, solicitud?.folio || "", params.servicioId);
  }

  revalidatePath(`/vendedor/solicitud/${params.solicitudId}`);
  return { error: null };
}
