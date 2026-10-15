import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { VERIFIED_USER_ID_HEADER } from "@/lib/auth/request-context";
import { measureServerOperation } from "@/lib/server-performance";

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
  "/erreurs",
  "/badges",
  "/jeux",
  "/entraide",
  "/aide",
  "/abonnement",
  "/paiement",
  "/seance",
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
  const needsAuthCheck = isProtected || matchesPath(request.nextUrl.pathname, authPaths);

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete(VERIFIED_USER_ID_HEADER);

  if (!needsAuthCheck) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  if (!url || !key) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/connexion?error=auth-not-configured", request.url));
    }
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  let verifiedUserId: string | null = null;
  const nextResponse = () => {
    const headers = new Headers(request.headers);
    headers.delete(VERIFIED_USER_ID_HEADER);
    if (verifiedUserId) headers.set(VERIFIED_USER_ID_HEADER, verifiedUserId);
    return NextResponse.next({ request: { headers } });
  };

  let response = nextResponse();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = nextResponse();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getClaims() vérifie la signature du jeton localement quand le projet Supabase utilise des clés de signature
  // asymétriques (réglage par défaut des projets récents) : plus d'appel réseau à chaque page. Sinon, la
  // bibliothèque retombe toute seule sur la vérification serveur (comportement précédent).
  const { data, error } = await measureServerOperation(
    "auth.middleware.getClaims",
    () => supabase.auth.getClaims(),
  );
  const subject = data?.claims?.sub;
  verifiedUserId = typeof subject === "string" ? subject : null;
  const refreshedCookies = response.cookies.getAll();
  response = nextResponse();
  refreshedCookies.forEach((cookie) => response.cookies.set({ ...cookie }));

  if (error && error.name !== "AuthSessionMissingError" && isProtected) {
    return redirectWithCookies(request, "/connexion?error=session-check-failed", response);
  }

  if (isProtected && !verifiedUserId) {
    return redirectWithCookies(request, "/connexion", response);
  }

  if (verifiedUserId && matchesPath(request.nextUrl.pathname, authPaths)) {
    return redirectWithCookies(request, "/dashboard", response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
