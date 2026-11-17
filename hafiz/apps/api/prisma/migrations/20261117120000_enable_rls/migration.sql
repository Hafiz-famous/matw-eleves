-- Sécurité Supabase : les tables sont exposées par l'API REST automatique
-- (PostgREST) du projet. On active Row Level Security SANS politique :
-- les rôles `anon` et `authenticated` (clé publique du frontend) n'ont donc
-- aucun accès direct. Seule l'API HAFIZ, connectée avec le rôle propriétaire
-- des tables, lit et écrit les données, toujours filtrées par utilisateur.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
