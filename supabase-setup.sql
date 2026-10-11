-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase, APRÈS la première migration Prisma.

-- 1. Créer automatiquement un profil à chaque nouveau compte
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public."Profile" (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Verrouiller toutes les tables : personne ne les lit directement depuis le navigateur.
--    Le site y accède uniquement côté serveur (Prisma), qui contourne ces règles.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not like '\_prisma%' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 3. Donner le rôle administrateur (à faire à la main pour toi et ton ami, après votre première connexion).
--    Remplace l'adresse e-mail, puis décommente la ligne.
-- update public."Profile" set role = 'ADMIN' where email = 'ton-adresse@exemple.com';

-- Les nouvelles tables (ligue, quêtes, événements, jeux, annonces, offres…) sont verrouillées
-- automatiquement par la boucle de l'étape 2 : relance simplement cette étape après chaque migration.
