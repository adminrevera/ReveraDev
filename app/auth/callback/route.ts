import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedDestinations = new Set([
  "/onboarding",
  "/dashboard",
  "/reinitialiser-mot-de-passe",
]);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next") ?? "/onboarding";
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(new URL("/connexion?error=oauth-failed", request.url));
  }
  if (!code || !allowedDestinations.has(destination)) {
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

  return NextResponse.redirect(new URL(destination, request.url));
}
