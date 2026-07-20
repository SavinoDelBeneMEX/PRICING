"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
      className="text-white/80 hover:text-gold text-sm"
    >
      Cerrar sesión
    </button>
  );
}
