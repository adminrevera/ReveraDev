// Mesure la vitesse de réponse de la base et de l'authentification Supabase depuis cette machine.
// Usage : npm run db:ping   (lit le fichier .env)
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";

const prisma = new PrismaClient();

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}
const ms = (value) => `${Math.round(value)} ms`;

async function time(label, runs, task) {
  const durations = [];
  for (let i = 0; i < runs; i++) {
    const startedAt = performance.now();
    await task();
    durations.push(performance.now() - startedAt);
  }
  const { min, median, max } = stats(durations);
  console.log(`${label.padEnd(46)} min ${ms(min).padStart(7)} · médiane ${ms(median).padStart(7)} · max ${ms(max).padStart(7)}`);
  return median;
}

function host(urlValue) {
  try {
    const url = new URL(urlValue);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "(URL illisible)";
  }
}

const databaseUrl = process.env.DATABASE_URL ?? "";
console.log(`\nBase de données : ${host(databaseUrl)}`);
if (/db\.[a-z0-9]+\.supabase\.co/.test(databaseUrl)) {
  console.log("⚠  DATABASE_URL pointe sur l'hôte direct. Utilise l'adresse « Transaction pooler » (port 6543, ?pgbouncer=true).");
}
if (!/pgbouncer=true/.test(databaseUrl) && /:6543/.test(databaseUrl)) {
  console.log("⚠  Le port 6543 est utilisé sans « ?pgbouncer=true » : ajoute ce paramètre à DATABASE_URL.");
}

try {
  const connectStartedAt = performance.now();
  await prisma.$connect();
  console.log(`\nPremière connexion (une seule fois, ensuite réutilisée) : ${ms(performance.now() - connectStartedAt)}\n`);

  const oneQuery = await time("1 requête simple (SELECT 1)", 10, () => prisma.$queryRaw`SELECT 1`);
  await time("Niveau + filière + école, 3 requêtes (ancien)", 5, () =>
    prisma.level.findFirst({ select: { name: true, track: { select: { name: true, institution: { select: { name: true } } } } } }),
  );
  await time("Niveau + filière + école, 1 requête (JOIN)", 5, () =>
    prisma.level.findFirst({
      relationLoadStrategy: "join",
      select: { name: true, track: { select: { name: true, institution: { select: { name: true } } } } },
    }),
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    await time("Service d'authentification Supabase (réseau)", 5, async () => {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: anonKey } });
      await response.text();
    });
  }

  console.log("\nComment lire ces chiffres :");
  console.log("  • moins de 80 ms  : excellent, les écrans s'afficheront presque instantanément ;");
  console.log("  • 80 à 200 ms     : correct ;");
  console.log("  • plus de 400 ms  : trop lent. La base est trop loin de toi ou du serveur (voir PERFORMANCE.md) ;");
  console.log(`  Ta médiane actuelle pour une requête simple : ${ms(oneQuery)}.\n`);
} catch (error) {
  console.error("\nImpossible de joindre la base :", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
