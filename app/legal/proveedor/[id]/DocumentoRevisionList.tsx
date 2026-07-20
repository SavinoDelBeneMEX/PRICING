"use client";

import { useState, useTransition } from "react";
import StatusBadge from "@/components/StatusBadge";
import { CATEGORIA_DOCUMENTO_LABELS, CategoriaDocumento, DOCUMENTO_ESTATUS_LABELS } from "@/lib/types";
import { revisarDocumento } from "./actions";

interface ChecklistItem {
  id: string;
  nombre_documento: string;
  categoria: CategoriaDocumento;
  obligatorio: boolean;
  orden: number;
}

interface DocumentoProveedor {
  id: string;
  checklist_item_id: string;
  archivo_url: string | null;
  estatus: keyof typeof DOCUMENTO_ESTATUS_LABELS;
  comentario_legal: string | null;
}

export default function DocumentoRevisionList({
  proveedorId,
  checklist,
  documentos,
}: {
  proveedorId: string;
  checklist: ChecklistItem[];
  documentos: DocumentoProveedor[];
}) {
  const docByChecklist = new Map(documentos.map((d) => [d.checklist_item_id, d]));
  const categorias = Array.from(new Set(checklist.map((c) => c.categoria)));

  return (
    <div className="space-y-6">
      {categorias.map((cat) => (
        <div key={cat} className="card">
          <h2 className="font-semibold text-navy mb-4">{CATEGORIA_DOCUMENTO_LABELS[cat]}</h2>
          <div className="space-y-4">
            {checklist
              .filter((c) => c.categoria === cat)
              .map((item) => (
                <DocumentoRow key={item.id} proveedorId={proveedorId} item={item} documento={docByChecklist.get(item.id)} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentoRow({
  proveedorId,
  item,
  documento,
}: {
  proveedorId: string;
  item: ChecklistItem;
  documento?: DocumentoProveedor;
}) {
  const [comentario, setComentario] = useState(documento?.comentario_legal || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revisar(estatus: "aprobado" | "rechazado") {
    if (!documento) return;
    setError(null);
    if (estatus === "rechazado" && !comentario.trim()) {
      setError("Agrega un comentario para explicar el rechazo.");
      return;
    }
    startTransition(async () => {
      const result = await revisarDocumento({ documentoProveedorId: documento.id, proveedorId, estatus, comentario });
      if (result.error) setError(result.error);
    });
  }

  const estatus = documento?.estatus || "pendiente";

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {item.nombre_documento} {!item.obligatorio && <span className="text-xs text-muted">(cuando aplique)</span>}
          </p>
          <StatusBadge status={estatus} label={DOCUMENTO_ESTATUS_LABELS[estatus]} />
        </div>
        {documento?.archivo_url && (
          <span className="text-xs text-navy underline whitespace-nowrap">Archivo subido</span>
        )}
      </div>

      {documento?.archivo_url && estatus === "subido" && (
        <div className="mt-3 space-y-2">
          <textarea
            className="input"
            rows={2}
            placeholder="Comentario (obligatorio si rechazas)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          {error && <p className="text-xs text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => revisar("aprobado")} disabled={isPending}>
              Aprobar
            </button>
            <button className="btn-secondary" onClick={() => revisar("rechazado")} disabled={isPending}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {documento?.comentario_legal && estatus === "rechazado" && (
        <p className="text-xs text-red-700 mt-2">Comentario: {documento.comentario_legal}</p>
      )}

      {!documento?.archivo_url && <p className="text-xs text-muted mt-2">El proveedor aún no sube este documento.</p>}
    </div>
  );
}
