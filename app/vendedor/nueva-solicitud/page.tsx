import { requireRole } from "@/lib/internal-auth";
import AppShell from "@/components/AppShell";
import NuevaSolicitudForm from "./NuevaSolicitudForm";

export default async function NuevaSolicitudPage() {
  const { profile } = await requireRole("vendedor");

  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      <h1 className="text-2xl font-bold text-navy mb-6">Nueva solicitud de pricing</h1>
      <NuevaSolicitudForm />
    </AppShell>
  );
}
