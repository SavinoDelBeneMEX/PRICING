export type Role = "vendedor" | "pricing" | "legal" | "finanzas" | "admin";

export type TipoServicio = "maritimo" | "aereo" | "terrestre" | "aduanal" | "seguros";

export type SolicitudServicioStatus =
  | "borrador"
  | "enviado_a_pricing"
  | "cotizado_por_pricing"
  | "cotizado_por_vendedor"
  | "enviado_a_cliente"
  | "aceptado_por_cliente"
  | "confirmado_a_pricing"
  | "proveedor_invitado"
  | "documentos_en_proceso"
  | "en_revision_legal"
  | "comentarios_legal"
  | "aprobado_legal"
  | "alta_finanzas"
  | "completado";

export type TipoProveedor =
  | "agente_aduanal"
  | "transportista_terrestre"
  | "operador_logistico_almacen"
  | "naviera_aerolinea_otro";

export type ProveedorStatus =
  | "invitado"
  | "registrado"
  | "documentos_en_proceso"
  | "en_revision_legal"
  | "comentarios_legal"
  | "aprobado_legal"
  | "alta_finanzas"
  | "completado";

export type DocumentoEstatus = "pendiente" | "subido" | "aprobado" | "rechazado";

export type CategoriaDocumento =
  | "legal_corporativo"
  | "operativo_regulatorio"
  | "seguros"
  | "comercial_bancario";

export const TIPO_SERVICIO_LABELS: Record<TipoServicio, string> = {
  maritimo: "Marítimo",
  aereo: "Aéreo",
  terrestre: "Terrestre",
  aduanal: "Despacho aduanal",
  seguros: "Seguros",
};

export const TIPO_PROVEEDOR_LABELS: Record<TipoProveedor, string> = {
  agente_aduanal: "Agente aduanal",
  transportista_terrestre: "Transportista terrestre",
  operador_logistico_almacen: "Operador logístico / Almacén",
  naviera_aerolinea_otro: "Naviera / Aerolínea / Otro",
};

export const CATEGORIA_DOCUMENTO_LABELS: Record<CategoriaDocumento, string> = {
  legal_corporativo: "Documentación legal y corporativa",
  operativo_regulatorio: "Documentación operativa y regulatoria",
  seguros: "Documentación en materia de seguros",
  comercial_bancario: "Documentación comercial y bancaria",
};

export const SOLICITUD_SERVICIO_STATUS_LABELS: Record<SolicitudServicioStatus, string> = {
  borrador: "Borrador",
  enviado_a_pricing: "Enviado a Pricing",
  cotizado_por_pricing: "Cotizado por Pricing",
  cotizado_por_vendedor: "Cotizado al cliente",
  enviado_a_cliente: "Enviado al cliente",
  aceptado_por_cliente: "Aceptado por el cliente",
  confirmado_a_pricing: "Confirmado a Pricing",
  proveedor_invitado: "Proveedor invitado",
  documentos_en_proceso: "Documentos en proceso",
  en_revision_legal: "En revisión legal",
  comentarios_legal: "Comentarios de Legal",
  aprobado_legal: "Aprobado por Legal",
  alta_finanzas: "En alta con Finanzas",
  completado: "Completado",
};

export const PROVEEDOR_STATUS_LABELS: Record<ProveedorStatus, string> = {
  invitado: "Invitado",
  registrado: "Registrado",
  documentos_en_proceso: "Documentos en proceso",
  en_revision_legal: "En revisión legal",
  comentarios_legal: "Comentarios de Legal",
  aprobado_legal: "Aprobado por Legal",
  alta_finanzas: "En alta con Finanzas",
  completado: "Alta completada",
};

export const DOCUMENTO_ESTATUS_LABELS: Record<DocumentoEstatus, string> = {
  pendiente: "Pendiente",
  subido: "Subido",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const MARKUP_MIN_PCT = 8;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
}
