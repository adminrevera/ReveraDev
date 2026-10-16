This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Prisma + Supabase pooler (voir aussi `PERFORMANCE.md` et `npm run db:ping`)

DATABASE_URL doit utiliser le port 6543 (transaction pooler) avec ?pgbouncer=true.

connection_limit=5 en local, connection_limit=1 sur Vercel (serverless).

Si erreur Timed out fetching a new connection, augmenter connection_limit ou pool_timeout.

## Authentification

Les pages de connexion, d’inscription, de récupération du mot de passe et l’espace étudiant
utilisent Supabase Auth. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`DATABASE_URL` et `DIRECT_URL` dans `.env`. Dans Supabase Auth, ajoute `/auth/callback` aux
Redirect URLs autorisées pour `http://localhost:3000` et pour le domaine de production.
Le script `supabase-setup.sql` doit avoir été appliqué afin que les nouveaux comptes aient un
profil associé dans la base.

Pour activer l’inscription et la connexion Google, active le fournisseur Google dans
**Supabase → Authentication → Sign In / Providers**, puis renseigne le Client ID et le Client
Secret OAuth créés dans Google Cloud Console. Dans Google Cloud, ajoute comme URI de redirection
autorisée l’URL de callback affichée par Supabase (habituellement
`https://<project-ref>.supabase.co/auth/v1/callback`). Garde `/auth/callback` de l’application
dans les Redirect URLs autorisées par Supabase pour les environnements local et de production.

## Interface et wireframes

L’interface utilise Tailwind CSS v4 et shadcn/ui. Les primitives et leur configuration se trouvent
dans `components/ui/` et `components.json`; les couleurs du thème Revera restent définies dans
`app/globals.css`. Pour ajouter un composant, utilise `npx shadcn@latest add <composant>`.

Les maquettes de référence sont conservées dans `wireframes/`. L’inscription suit ces étapes :
méthode, identifiants, prénom, objectifs, niveau (si disponible), puis rappels. Après validation,
`/onboarding/bienvenue` affiche un écran persistant qui mène au premier cours. Le lecteur suit la
maquette de lecture continue : le quiz ne s’ouvre qu’après le défilement complet et le délai de
lecture configuré.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
