"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";

/**
 * Vincula la cuenta recién creada (por el propio proveedor, vía signUp en el
 * cliente) con su fila en `proveedores`. Se hace en el servidor con service
 * role para no depender de una policy de update que el proveedor aún no
 * cumple (user_id todavía es null en ese momento).
 */
export async function linkProveedorAccount(params: {
  token: string;
  userId: string;
  razonSocial: string;
  contactoNombre: string;
}) {
  const admin = createAdminClient();

  const { data: proveedor, error: findError } = await admin
    .from("proveedores")
    .select("id, registered_at, invite_token")
    .eq("invite_token", params.token)
    .single();

  if (findError || !proveedor) {
    return { error: "Invitación no válida." };
  }
  if (proveedor.registered_at) {
    return { error: "Esta invitación ya fue utilizada." };
  }

  const { error: updateError } = await admin
    .from("proveedores")
    .update({
      user_id: params.userId,
      razon_social: params.razonSocial,
      contacto_nombre: params.contactoNombre,
      registered_at: new Date().toISOString(),
      status: "registrado",
    })
    .eq("id", proveedor.id);

  if (updateError) {
    return { error: "No se pudo completar el registro." };
  }

  await logAuditoria({
    entidadTipo: "proveedor",
    entidadId: proveedor.id,
    actorLabel: params.razonSocial,
    accion: "proveedor_registrado",
  });

  return { error: null };
}
