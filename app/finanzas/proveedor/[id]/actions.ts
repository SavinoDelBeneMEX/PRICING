"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { notifyAltaCompletada } from "@/lib/notifications";

export async function marcarAltaCompletada(params: { proveedorId: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const { data: proveedor } = await supabase
    .from("proveedores")
    .select("id, solicitud_servicio_id, razon_social, email_invitacion")
    .eq("id", params.proveedorId)
    .single();
  if (!proveedor) return { error: "Proveedor no encontrado." };

  await supabase.from("proveedores").update({ status: "completado" }).eq("id", proveedor.id);
  await supabase
    .from("solicitud_servicios")
    .update({ status: "completado", updated_at: new Date().toISOString() })
    .eq("id", proveedor.solicitud_servicio_id);

  await logAuditoria({
    entidadTipo: "proveedor",
    entidadId: proveedor.id,
    usuarioId: user.id,
    accion: "alta_completada",
  });

  const admin = createAdminClient();
  const { data: servicio } = await admin
    .from("solicitud_servicios")
    .select("solicitudes(folio)")
    .eq("id", proveedor.solicitud_servicio_id)
    .single();
  const folio = (servicio as any)?.solicitudes?.folio || "";
  await notifyAltaCompletada(proveedor.email_invitacion, folio);

  revalidatePath(`/finanzas/proveedor/${proveedor.id}`);
  return { error: null };
}
