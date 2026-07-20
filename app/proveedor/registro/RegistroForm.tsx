"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { linkProveedorAccount } from "./actions";

export default function RegistroForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [razonSocial, setRazonSocial] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message || "No se pudo crear la cuenta.");
      return;
    }

    const result = await linkProveedorAccount({
      token,
      userId: data.user.id,
      razonSocial,
      contactoNombre,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/proveedor");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      <div>
        <label className="label">Correo</label>
        <input className="input bg-gray-50" value={email} disabled />
      </div>
      <div>
        <label className="label">Razón social</label>
        <input className="input" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
      </div>
      <div>
        <label className="label">Nombre del contacto</label>
        <input className="input" required value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} />
      </div>
      <div>
        <label className="label">Contraseña</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label">Confirmar contraseña</label>
        <input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creando cuenta…" : "Crear cuenta y continuar"}
      </button>
    </form>
  );
}
