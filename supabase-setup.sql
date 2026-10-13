-- À exécuter une FOIS après chaque migration Prisma, dans l'éditeur SQL Supabase.

-- ────────────────────────────────────────────────────────────
-- 1. Créer automatiquement un profil à chaque nouveau compte
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public."Profile" (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. Verrouiller toutes les tables : aucune lecture directe
--    depuis le navigateur (le serveur passe par Prisma).
--    À RELANCER après chaque migration qui crée une table.
-- ────────────────────────────────────────────────────────────
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like '\_prisma%'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
    -- Aucune policy = personne ne lit. Le service_role et le owner Postgres ne sont
    -- pas concernés par RLS, donc Prisma (côté serveur) continue de fonctionner.
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- 3. Index partiel : empêcher plusieurs Templates "globaux"
--    (levelId NULL) avec le même (kind, version).
--    PostgreSQL ne considère pas NULL = NULL, d'où l'index partiel.
-- ────────────────────────────────────────────────────────────
create unique index if not exists "Template_global_unique"
  on public."Template" (kind, version)
  where "levelId" is null;

-- ────────────────────────────────────────────────────────────
-- 4. Donner le rôle ADMIN (à faire à la main après 1ère connexion)
-- ────────────────────────────────────────────────────────────
-- update public."Profile" set role = 'ADMIN' where email = 'ton-adresse@exemple.com';