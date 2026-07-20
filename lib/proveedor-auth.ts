import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireProveedor() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/proveedor/login");
  }

  const { data: proveedor } = await supabase
    .from("proveedores")
    .select(
      "id, razon_social, contacto_nombre, tipo_proveedor, status, solicitud_servicio_id, solicitud_servicios(tipo_servicio, solicitudes(folio, cliente_nombre))"
    )
    .eq("user_id", user!.id)
    .single();

  if (!proveedor) {
    redirect("/proveedor/login");
  }

  return { user, proveedor };
}
