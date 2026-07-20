const SUCCESS_STATES = new Set(["aprobado", "aprobado_legal", "completado", "aceptado_por_cliente"]);
const DANGER_STATES = new Set(["rechazado", "comentarios_legal"]);
const PENDING_STATES = new Set(["pendiente", "borrador", "invitado"]);

export default function StatusBadge({ status, label }: { status: string; label: string }) {
  let className = "badge-neutral";
  if (SUCCESS_STATES.has(status)) className = "badge-success";
  else if (DANGER_STATES.has(status)) className = "badge-danger";
  else if (PENDING_STATES.has(status)) className = "badge-pending";
  else className = "badge-progress";

  return <span className={className}>{label}</span>;
}
