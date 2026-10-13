import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next") ?? "/onboarding";
  const destinationUrl = new URL(destination, request.url);
  const isAllowedDestination =
    destinationUrl.origin === request.nextUrl.origin &&
    (destinationUrl.pathname === "/dashboard" ||
      destinationUrl.pathname === "/reinitialiser-mot-de-passe" ||
      (destinationUrl.pathname === "/onboarding" &&
        (!destinationUrl.searchParams.has("plan") ||
          ["free", "plus", "success"].includes(destinationUrl.searchParams.get("plan") ?? ""))));
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(new URL("/connexion?error=oauth-failed", request.url));
  }
  if (!code || !isAllowedDestination) {
    return NextResponse.redirect(new URL("/connexion?error=invalid-link", request.url));
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL("/connexion?error=auth-not-configured", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/connexion?error=invalid-link", request.url));
  }

  return NextResponse.redirect(destinationUrl);
}
