import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/lib/types";

const ROLE_HOME: Record<Role, string> = {
  vendedor: "/vendedor",
  pricing: "/pricing",
  legal: "/legal",
  finanzas: "/finanzas",
  admin: "/pricing",
};

const ALL_ROLE_PREFIXES = ["/vendedor", "/pricing", "/legal", "/finanzas"];

const PUBLIC_PATHS = ["/login", "/proveedor/login", "/proveedor/registro", "/api"];

function isRoleAllowed(pathname: string, role: Role) {
  const prefix = "/" + pathname.split("/")[1];
  if (prefix === "/auditoria") return true;
  if (role === "admin") return ALL_ROLE_PREFIXES.includes(prefix);
  return prefix === ROLE_HOME[role];
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/proveedor")) {
    // Provider routes have their own auth/status checks inside the pages.
    return response;
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user) {
    if (isPublic || pathname === "/") return response;
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" || pathname === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) {
      return NextResponse.redirect(new URL(ROLE_HOME[profile.role as Role], request.url));
    }
    return response;
  }

  if (!isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.active) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!isRoleAllowed(pathname, profile.role as Role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[profile.role as Role], request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
