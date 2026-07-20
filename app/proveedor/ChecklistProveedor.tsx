"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import {
  CATEGORIA_DOCUMENTO_LABELS,
  CategoriaDocumento,
  DOCUMENTO_ESTATUS_LABELS,
  DocumentoEstatus,
  PROVEEDOR_STATUS_LABELS,
} from "@/lib/types";
import { enviarARevisionLegal, subirDocumentoProveedor } from "./actions";

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
  estatus: DocumentoEstatus;
  comentario_legal: string | null;
}

export default function ChecklistProveedor({
  proveedorId,
  checklist,
  documentos,
  proveedorStatus,
}: {
  proveedorId: string;
  checklist: ChecklistItem[];
  documentos: DocumentoProveedor[];
  proveedorStatus: keyof typeof PROVEEDOR_STATUS_LABELS;
}) {
  const docByChecklist = new Map(documentos.map((d) => [d.checklist_item_id, d]));
  const categorias = Array.from(new Set(checklist.map((c) => c.categoria)));

  const puedeEnviar = ["registrado", "documentos_en_proceso", "comentarios_legal"].includes(proveedorStatus);
  const enRevision = proveedorStatus === "en_revision_legal" || proveedorStatus === "aprobado_legal" || proveedorStatus === "alta_finanzas" || proveedorStatus === "completado";

  return (
    <div className="space-y-6">
      {categorias.map((cat) => (
        <div key={cat} className="card">
          <h2 className="font-semibold text-navy mb-4">{CATEGORIA_DOCUMENTO_LABELS[cat]}</h2>
          <div className="space-y-4">
            {checklist
              .filter((c) => c.categoria === cat)
              .map((item) => (
                <DocumentoUploadRow
                  key={item.id}
                  proveedorId={proveedorId}
                  item={item}
                  documento={docByChecklist.get(item.id)}
                  disabled={enRevision}
                />
              ))}
          </div>
        </div>
      ))}

      {puedeEnviar && <EnviarButton />}
      {enRevision && (
        <p className="text-sm text-muted">
          Tu expediente está en revisión. Si Legal deja comentarios, podrás corregir los documentos marcados y reenviar.
        </p>
      )}
    </div>
  );
}

function DocumentoUploadRow({
  proveedorId,
  item,
  documento,
  disabled,
}: {
  proveedorId: string;
  item: ChecklistItem;
  documento?: DocumentoProveedor;
  disabled: boolean;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !documento) return;
    setError(null);
    setUploading(true);
    const path = `${proveedorId}/${item.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documentos-proveedor").upload(path, file, { upsert: true });
    setUploading(false);
    if (uploadError) {
      setError("No se pudo subir el archivo.");
      return;
    }
    startTransition(async () => {
      const result = await subirDocumentoProveedor({ documentoProveedorId: documento.id, archivoUrl: path });
      if (result.error) setError(result.error);
    });
  }

  const estatus = documento?.estatus || "pendiente";

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">
          {item.nombre_documento} {!item.obligatorio && <span className="text-xs text-muted">(cuando aplique)</span>}
        </p>
        <StatusBadge status={estatus} label={DOCUMENTO_ESTATUS_LABELS[estatus]} />
      </div>

      {documento?.comentario_legal && estatus === "rechazado" && (
        <p className="text-xs text-red-700 mt-2">Comentario de Legal: {documento.comentario_legal}</p>
      )}

      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}

      {!disabled && (
        <div className="mt-2">
          <input type="file" className="text-sm" onChange={handleFile} disabled={uploading || isPending} />
          {uploading && <p className="text-xs text-muted mt-1">Subiendo…</p>}
        </div>
      )}
    </div>
  );
}

function EnviarButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await enviarARevisionLegal();
      if (result.error) setError(result.error);
      else setOk(true);
    });
  }

  return (
    <div className="card">
      {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
      {ok && <p className="text-sm text-green-700 mb-3">Expediente enviado a revisión legal.</p>}
      <button className="btn-gold" onClick={handleClick} disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar a revisión legal"}
      </button>
    </div>
  );
}
