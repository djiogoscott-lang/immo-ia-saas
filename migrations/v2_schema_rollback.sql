-- =============================================================================
-- Nestenn IA V2 — Rollback du schéma multi-agents
-- =============================================================================
-- ⚠️  À exécuter UNIQUEMENT sur le projet Supabase où `v2_schema.sql` a été
--    appliqué par erreur (et qui n'est PAS le projet Nestenn IA).
--
-- Ce script :
--   • supprime les 3 tables (profiles, conversations, messages) avec leurs
--     RLS policies (supprimées automatiquement avec les tables)
--   • supprime le trigger qui tournait sur auth.users (handle_new_user)
--   • supprime les fonctions associées
--
-- ⚠️  DESTRUCTIF : toutes les données dans ces 3 tables seront perdues.
--    Sur le mauvais projet, c'est normalement OK (ces tables n'étaient pas
--    censées exister). Si jamais l'autre projet avait des données réelles
--    dans une table portant l'un de ces noms AVANT le SQL erroné, faire
--    un backup `pg_dump --table=...` avant de lancer ce rollback.
--
-- Procédure :
--   1. Supabase Dashboard > VÉRIFIER en haut à gauche que tu es sur le BON
--      projet (le projet où le SQL a été appliqué PAR ERREUR).
--   2. SQL Editor > New query > coller ce script > Run.
--   3. Vérifier dans Table Editor que les 3 tables ont bien disparu.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Désactiver le trigger sur auth.users
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- -----------------------------------------------------------------------------
-- 2. Supprimer les fonctions
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Supprimer les tables (CASCADE pour propager FK + policies + triggers
--    locaux aux tables)
-- -----------------------------------------------------------------------------

-- Ordre important : messages dépend de conversations, qui dépend de profiles
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- Fin du rollback. Les utilisateurs Supabase Auth (auth.users) ne sont PAS
-- supprimés — ils sont gérés par Supabase indépendamment de notre schéma.
-- =============================================================================
