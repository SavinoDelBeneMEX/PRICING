"use client";

import { useState, useTransition } from "react";
import { marcarAltaCompletada } from "./actions";

export default function AltaButton({ proveedorId }: { proveedorId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await marcarAltaCompletada({ proveedorId });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="card">
      {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
      <button className="btn-gold" onClick={handleClick} disabled={isPending}>
        {isPending ? "Marcando…" : "Marcar alta completada"}
      </button>
      <p className="text-xs text-muted mt-2">El alta real en el ERP se realiza fuera de este portal.</p>
    </div>
  );
}
