import { NextResponse } from "next/server";
import { rolloverLeagueWeek } from "@/lib/gamification/league";

// Appelée chaque lundi par Vercel Cron (voir vercel.json). Protégée par CRON_SECRET (Vercel l'envoie en en-tête Authorization).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await rolloverLeagueWeek());
}
