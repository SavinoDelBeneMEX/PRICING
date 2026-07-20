"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { notifyComentariosLegal, notifyFinanzasAltaPendiente } from "@/lib/notifications";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function revisarDocumento(params: {
  documentoProveedorId: string;
  proveedorId: string;
  estatus: "aprobado" | "rechazado";
  comentario: string;
}) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Sesión expirada." };

  await supabase
    .from("documentos_proveedor")
    .update({
      estatus: params.estatus,
      comentario_legal: params.comentario || null,
      revisado_por: user.id,
      revisado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.documentoProveedorId);

  await logAuditoria({
    entidadTipo: "documento_proveedor",
    entidadId: params.documentoProveedorId,
    usuarioId: user.id,
    accion: params.estatus === "aprobado" ? "documento_aprobado" : "documento_rechazado",
    detalle: { comentario: params.comentario },
  });

  await recalcularExpediente(params.proveedorId, user.id);

  revalidatePath(`/legal/proveedor/${params.proveedorId}`);
  return { error: null };
}

async function recalcularExpediente(proveedorId: string, legalUserId: string) {
  const admin = createAdminClient();

  const { data: proveedor } = await admin
    .from("proveedores")
    .select("id, tipo_proveedor, solicitud_servicio_id, email_invitacion")
    .eq("id", proveedorId)
    .single();
  if (!proveedor) return;

  const { data: checklist } = await admin
    .from("documentos_checklist")
    .select("id, obligatorio, tipo_proveedor")
    .or(`tipo_proveedor.is.null,tipo_proveedor.eq.${proveedor.tipo_proveedor}`);

  const { data: documentos } = await admin
    .from("documentos_proveedor")
    .select("id, checklist_item_id, estatus")
    .eq("proveedor_id", proveedorId);

  const docByChecklist = new Map((documentos || []).map((d) => [d.checklist_item_id, d]));

  const obligatorios = (checklist || []).filter((c) => c.obligatorio);
  const hayRechazados = (documentos || []).some((d) => d.estatus === "rechazado");
  const todosObligatoriosAprobados = obligatorios.every((c) => docByChecklist.get(c.id)?.estatus === "aprobado");

  const admin2 = createAdminClient();
  const { data: solicitud } = await admin2
    .from("solicitud_servicios")
    .select("solicitud_id, solicitudes(folio, vendedor_id)")
    .eq("id", proveedor.solicitud_servicio_id)
    .single();
  const folio = (solicitud as any)?.solicitudes?.folio || "";

  if (hayRechazados) {
    await admin.from("proveedores").update({ status: "comentarios_legal" }).eq("id", proveedorId);
    await admin.from("solicitud_servicios").update({ status: "comentarios_legal" }).eq("id", proveedor.solicitud_servicio_id);

    await notifyComentariosLegal(proveedor.email_invitacion, folio, proveedorId, true);
    const { data: pricingUsers } = await admin.from("profiles").select("email").eq("role", "pricing").eq("active", true);
    for (const p of pricingUsers || []) {
      await notifyComentariosLegal(p.email, folio, proveedorId, false);
    }
  } else if (todosObligatoriosAprobados) {
    await admin.from("proveedores").update({ status: "aprobado_legal" }).eq("id", proveedorId);
    await admin.from("solicitud_servicios").update({ status: "aprobado_legal" }).eq("id", proveedor.solicitud_servicio_id);

    await logAuditoria({
      entidadTipo: "proveedor",
      entidadId: proveedorId,
      usuarioId: legalUserId,
      accion: "expediente_aprobado_legal",
    });

    const { data: finanzasUsers } = await admin.from("profiles").select("email").eq("role", "finanzas").eq("active", true);
    for (const f of finanzasUsers || []) {
      await notifyFinanzasAltaPendiente(f.email, folio, proveedorId);
    }
  }
}
