import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/onboarding",
  "/reinitialiser-mot-de-passe",
  "/admin",
  "/parcours",
  "/quiz",
  "/entrainement",
  "/ligue",
  "/quetes",
  "/reviser",
  "/profil",
];
const authPaths = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectWithCookies(request: NextRequest, destination: string, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set({ ...cookie }));
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProtected = matchesPath(request.nextUrl.pathname, protectedPaths);

  if (!url || !key) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/connexion?error=auth-not-configured", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError" && isProtected) {
    return redirectWithCookies(request, "/connexion?error=session-check-failed", response);
  }

  if (isProtected && !user) {
    return redirectWithCookies(request, "/connexion", response);
  }

  if (user && matchesPath(request.nextUrl.pathname, authPaths)) {
    return redirectWithCookies(request, "/dashboard", response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
