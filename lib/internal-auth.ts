import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function requireRole(role: Role) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active")
    .eq("id", user!.id)
    .single();

  if (!profile || !profile.active || profile.role !== role) {
    redirect("/login");
  }

  return { user, profile: profile! };
}

export async function requireAnyInternalRole() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active")
    .eq("id", user!.id)
    .single();

  if (!profile || !profile.active) {
    redirect("/login");
  }

  return { user, profile: profile! };
}
