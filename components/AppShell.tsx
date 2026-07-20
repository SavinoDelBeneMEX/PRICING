import Link from "next/link";
import { Role } from "@/lib/types";
import SignOutButton from "@/components/SignOutButton";

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  vendedor: [
    { href: "/vendedor", label: "Mis solicitudes" },
    { href: "/vendedor/nueva-solicitud", label: "Nueva solicitud" },
    { href: "/auditoria", label: "Auditoría" },
  ],
  pricing: [
    { href: "/pricing", label: "Cola de cotización" },
    { href: "/auditoria", label: "Auditoría" },
  ],
  legal: [
    { href: "/legal", label: "Expedientes" },
    { href: "/auditoria", label: "Auditoría" },
  ],
  finanzas: [
    { href: "/finanzas", label: "Altas pendientes" },
    { href: "/auditoria", label: "Auditoría" },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  vendedor: "Vendedor",
  pricing: "Pricing",
  legal: "Legal",
  finanzas: "Finanzas",
};

export default function AppShell({
  role,
  userName,
  children,
}: {
  role: Role;
  userName: string;
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[role];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-wide">Portal de Pricing SBM</span>
            <span className="badge bg-gold text-navy-dark font-semibold">{ROLE_LABELS[role]}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-gold transition-colors">
                {item.label}
              </Link>
            ))}
            <span className="text-white/70">{userName}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="text-center text-xs text-muted py-4">
        Savino del Bene México — Portal de Pricing
      </footer>
    </div>
  );
}
