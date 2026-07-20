import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Escribe en la bitácora de auditoría. Usa el cliente con service role porque
 * `auditoria` no tiene política de insert para usuarios normales — solo
 * server actions (código de confianza) pueden escribir aquí.
 */
export async function logAuditoria(params: {
  entidadTipo: string;
  entidadId: string;
  usuarioId?: string | null;
  actorLabel?: string | null;
  accion: string;
  detalle?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("auditoria").insert({
    entidad_tipo: params.entidadTipo,
    entidad_id: params.entidadId,
    usuario_id: params.usuarioId ?? null,
    actor_label: params.actorLabel ?? null,
    accion: params.accion,
    detalle: params.detalle ?? {},
  });
}
