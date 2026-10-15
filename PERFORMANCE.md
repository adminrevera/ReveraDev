# Performance : pourquoi c'était lent, ce qui a été corrigé, comment vérifier

## Ce qui ralentissait (d'après tes journaux)

| Ligne du journal | Ce que ça veut dire |
|---|---|
| `auth.profile.findUnique: 1,5 à 2,5 s` | Lire le profil demandait 4 allers-retours vers la base (profil, niveau, filière, école), chacun attendant une base lente. |
| `dashboard.prismaQueries: 2,1 à 2,8 s` | Plusieurs requêtes, chacune attendant une base lente à répondre. |
| `auth.middleware.getUser: 500 ms` | À chaque page, un appel réseau vers Supabase pour vérifier la session. |
| `Compiled /parcours/[itemId] in 5s` | Seulement en développement (`next dev`) : chaque page est compilée à la première visite. |
| `SELECT 1` à 600–1 100 ms (ta feuille de route) | La base met déjà ce temps pour répondre à la requête la plus simple : c'est la distance et la connexion, pas le code. |

## Ce qui est corrigé dans le code

1. **Profil, niveau, filière et école en une seule requête SQL** (`relationLoadStrategy: "join"`), au lieu de 4 allers-retours. Même technique sur le tableau de bord, la ligue, les quêtes, l'entraînement, le profil et les révisions.
2. **Profil lu une seule fois par requête** (`lib/auth/access.ts`, `cache()`), même si le menu (layout) et la page le demandent tous les deux.
3. **Menu et en-tête qui ne se rechargent plus** : ils sont dans `app/(student)/layout.tsx`. En changeant d'écran, seul le contenu change et un squelette s'affiche tout de suite.
4. **Écrans déjà visités gardés 30 s dans le navigateur** (`staleTimes` dans `next.config.ts`) : revenir en arrière est instantané. Les actions qui modifient des données (quiz, lecture, révision) vident ce cache.
5. **Session vérifiée sans appel réseau** (`middleware.ts`, `getClaims()`), si ton projet Supabase utilise les clés de signature asymétriques (réglage par défaut des projets récents). Sinon la bibliothèque retombe seule sur l'ancienne vérification.
6. **Réglages lus souvent** (seuil de validation, durée de lecture, règles de ligue) **mis en cache 1 à 2 minutes**, et vidés quand l'administrateur les change.
7. **Quiz** : le quiz démarre dès l'ouverture, une question par écran, une seule correction à la fin.

## Ce que le code ne peut pas corriger : la distance jusqu'à la base

Une base trop loin ralentit chaque requête, quoi qu'on fasse. Fais ces trois vérifications, dans cet ordre.

**1. Région de ton projet Supabase.** Tableau de bord Supabase → Project Settings → General → région. Pour des étudiants à Lomé, la plus proche est l'Europe (Paris, Londres ou Francfort). Si ton projet est en Amérique ou en Asie, crée un nouveau projet en Europe, applique `prisma migrate deploy` puis `supabase-setup.sql`, et relance `npm run db:seed` et `npm run db:import`.

**2. Adresse de connexion.** Supabase → Connect → **Transaction pooler**. Copie l'adresse dans `DATABASE_URL`, ajoute `?pgbouncer=true` à la fin (et `&connection_limit=5` en local, `&connection_limit=1` sur Vercel). Garde l'adresse directe uniquement dans `DIRECT_URL` (migrations).

**3. Région des fonctions sur Vercel.** Project Settings → Functions → Function Region : choisis la même région que Supabase (par exemple Paris `cdg1` si Supabase est à Paris).

## Comment vérifier

```bash
npm run db:ping
```

Il affiche le temps de réponse de ta base et de l'authentification, avec une médiane. Cible : **moins de 80 ms** pour `SELECT 1`. Au-dessus de 400 ms, reprends les points 1 à 3 ci-dessus.

Puis mesure avec la vraie version de l'application, pas `next dev` :

```bash
npm run build
npm start
```

Dans les journaux, les lignes `[perf]` ne s'affichent qu'en développement. En production, regarde Vercel → Logs / Speed Insights. Objectifs raisonnables une fois la base en Europe : profil `< 150 ms`, tableau de bord `< 400 ms`, changement d'écran avec squelette immédiat.

## À surveiller après le déploiement

- **Connexions** : `connection_limit=1` par fonction sur Vercel, avec le pooler. Si tu vois `Timed out fetching a new connection`, augmente `pool_timeout` plutôt que `connection_limit`.
- **`getClaims()`** : un étudiant déconnecté ailleurs garde un accès jusqu'à l'expiration de son jeton (1 h par défaut). Les comptes suspendus restent bloqués immédiatement, car la suspension est vérifiée en base à chaque page.
