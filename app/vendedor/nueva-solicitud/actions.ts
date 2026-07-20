"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditoria } from "@/lib/audit";
import { notifyPricingNuevaSolicitud } from "@/lib/notifications";
import type { TipoServicio } from "@/lib/types";

export interface ServicioInput {
  tipo_servicio: TipoServicio;
  detalle_servicio: string;
}

export async function crearSolicitud(params: {
  clienteNombre: string;
  clienteRfc: string;
  descripcionGeneral: string;
  servicios: ServicioInput[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  if (params.servicios.length === 0) {
    return { error: "Selecciona al menos un servicio." };
  }

  const { data: solicitud, error: solicitudError } = await supabase
    .from("solicitudes")
    .insert({
      vendedor_id: user.id,
      cliente_nombre: params.clienteNombre,
      cliente_rfc: params.clienteRfc || null,
      descripcion_general: params.descripcionGeneral || null,
    })
    .select("id, folio")
    .single();

  if (solicitudError || !solicitud) {
    return { error: "No se pudo crear la solicitud." };
  }

  const { data: servicios, error: serviciosError } = await supabase
    .from("solicitud_servicios")
    .insert(
      params.servicios.map((s) => ({
        solicitud_id: solicitud.id,
        tipo_servicio: s.tipo_servicio,
        detalle_servicio: s.detalle_servicio,
        status: "enviado_a_pricing" as const,
      }))
    )
    .select("id");

  if (serviciosError) {
    return { error: "La solicitud se creó pero los servicios fallaron. Contacta a soporte." };
  }

  await logAuditoria({
    entidadTipo: "solicitud",
    entidadId: solicitud.id,
    usuarioId: user.id,
    accion: "solicitud_creada",
    detalle: { folio: solicitud.folio, servicios: params.servicios.length },
  });

  const admin = createAdminClient();
  const { data: pricingUsers } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "pricing")
    .eq("active", true);

  for (const svc of servicios || []) {
    for (const p of pricingUsers || []) {
      await notifyPricingNuevaSolicitud(p.email, solicitud.folio, svc.id);
    }
  }

  redirect(`/vendedor/solicitud/${solicitud.id}`);
}
