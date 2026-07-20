"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { notifyLegalExpedienteListo, notifyPricingDocumentosSubidos } from "@/lib/notifications";

async function currentProveedor() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, proveedor: null };

  const { data: proveedor } = await supabase.from("proveedores").select("id, status, solicitud_servicio_id, razon_social").eq("user_id", user.id).single();
  return { supabase, user, proveedor };
}

export async function subirDocumentoProveedor(params: { documentoProveedorId: string; archivoUrl: string }) {
  const { supabase, user, proveedor } = await currentProveedor();
  if (!user || !proveedor) return { error: "Sesión expirada." };

  await supabase
    .from("documentos_proveedor")
    .update({ archivo_url: params.archivoUrl, estatus: "subido", comentario_legal: null, updated_at: new Date().toISOString() })
    .eq("id", params.documentoProveedorId);

  await logAuditoria({
    entidadTipo: "documento_proveedor",
    entidadId: params.documentoProveedorId,
    actorLabel: proveedor.razon_social,
    accion: "documento_subido",
  });

  revalidatePath("/proveedor");
  return { error: null };
}

export async function enviarARevisionLegal() {
  const { supabase, user, proveedor } = await currentProveedor();
  if (!user || !proveedor) return { error: "Sesión expirada." };

  const { data: documentos } = await supabase
    .from("documentos_proveedor")
    .select("estatus, documentos_checklist(obligatorio)")
    .eq("proveedor_id", proveedor.id);

  const faltantes = (documentos || []).filter(
    (d: any) => d.documentos_checklist?.obligatorio && d.estatus === "pendiente"
  );
  if (faltantes.length > 0) {
    return { error: `Faltan ${faltantes.length} documento(s) obligatorio(s) por subir.` };
  }

  await supabase.from("proveedores").update({ status: "en_revision_legal" }).eq("id", proveedor.id);
  await supabase
    .from("solicitud_servicios")
    .update({ status: "en_revision_legal", updated_at: new Date().toISOString() })
    .eq("id", proveedor.solicitud_servicio_id);

  await logAuditoria({
    entidadTipo: "proveedor",
    entidadId: proveedor.id,
    actorLabel: proveedor.razon_social,
    accion: "enviado_a_revision_legal",
  });

  const admin = createAdminClient();
  const { data: servicio } = await admin
    .from("solicitud_servicios")
    .select("solicitudes(folio)")
    .eq("id", proveedor.solicitud_servicio_id)
    .single();
  const folio = (servicio as any)?.solicitudes?.folio || "";

  const { data: pricingUsers } = await admin.from("profiles").select("email").eq("role", "pricing").eq("active", true);
  for (const p of pricingUsers || []) {
    await notifyPricingDocumentosSubidos(p.email, folio, proveedor.id);
  }
  const { data: legalUsers } = await admin.from("profiles").select("email").eq("role", "legal").eq("active", true);
  for (const l of legalUsers || []) {
    await notifyLegalExpedienteListo(l.email, folio, proveedor.id);
  }

  revalidatePath("/proveedor");
  return { error: null };
}
