-- =============================================================================
-- v6_security.sql — Rôles non modifiables par l'utilisateur
-- =============================================================================
--
-- Corrige une escalade de privilèges :
--   (1) `handle_new_user` lisait le rôle dans `raw_user_meta_data`, donnée
--       fournie par le client à l'inscription → n'importe qui pouvait
--       s'inscrire "manager".
--   (2) La policy UPDATE sur `profiles` autorisait l'utilisateur à modifier
--       TOUTES les colonnes de son profil, dont `role` et `agency_id`.
--
-- Après cette migration :
--   - tout nouveau compte est créé avec le rôle `conseiller` ;
--   - l'utilisateur ne peut plus modifier que son `full_name` ;
--   - un rôle ne se change que par un administrateur (SQL Editor Supabase,
--     qui s'exécute en tant que `postgres` et contourne la RLS) :
--
--       update public.profiles set role = 'manager'
--       where id = (select id from auth.users where email = 'ton@email.com');
--
-- Idempotent : peut être ré-exécuté sans effet de bord.
-- =============================================================================

-- 1. Trigger de création de profil : rôle imposé côté serveur.
--    `name` / `user_name` : champs fournis par GitHub OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    'conseiller'
  );
  RETURN NEW;
END;
$$;

-- 2. Seul `full_name` est modifiable par l'utilisateur lui-même.
--    La policy RLS "Users can update their own profile" reste en place
--    (elle filtre les LIGNES) ; les privilèges de colonne filtrent les COLONNES.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;
