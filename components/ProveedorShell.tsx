import SignOutButton from "@/components/SignOutButton";

export default function ProveedorShell({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-header">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg tracking-wide">Portal de Pricing SBM — Proveedores</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/70">{nombre}</span>
            <SignOutButton redirectTo="/proveedor/login" />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="text-center text-xs text-muted py-4">Savino del Bene México</footer>
    </div>
  );
}
