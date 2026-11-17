-- ============================================================================
-- MATW-PROJECT — Ajout des espaces Direction et Enseignant / Formateur
-- ============================================================================
-- À exécuter dans Supabase : Dashboard → SQL Editor → coller tout → Run.
--
-- ⚠️ AVANT D'EXÉCUTER : vérifie le type de la colonne eleves.id avec :
--   select column_name, data_type from information_schema.columns
--   where table_name = 'eleves' and column_name = 'id';
-- Ce script suppose que c'est un "uuid" (par défaut sur Supabase). Si c'est
-- un "bigint", remplace "uuid" par "bigint" dans la définition de
-- public.presences ci-dessous (colonne eleve_id).
--
-- ⚠️ ÉTAPE OBLIGATOIRE : remplace 'TON_EMAIL_ADMIN' par ton vrai email
-- administrateur un peu plus bas (section ÉTAPE 1), sinon tu perdras l'accès
-- à ta propre application une fois la sécurité activée.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nom text,
  prenom text,
  role text check (role in ('admin', 'direction', 'enseignant')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.enseignant_classes (
  id bigint generated always as identity primary key,
  enseignant_id uuid not null references public.profils(id) on delete cascade,
  classe text not null,
  unique (enseignant_id, classe)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  utilisateur_id uuid,
  action text not null,
  details jsonb,
  cree_le timestamptz not null default now()
);

create table if not exists public.presences (
  id bigint generated always as identity primary key,
  eleve_id uuid not null references public.eleves(id) on delete cascade,
  classe text not null,
  date date not null,
  annee_scolaire text,
  statut text not null check (statut in ('present', 'absent', 'retard')),
  remarque text,
  enregistre_par uuid references public.profils(id),
  cree_le timestamptz not null default now(),
  unique (eleve_id, date)
);

-- ----------------------------------------------------------------------------
-- FONCTIONS UTILITAIRES (security definer : court-circuitent la RLS en
-- interne pour éviter les boucles infinies de policies qui s'auto-vérifient)
-- ----------------------------------------------------------------------------

create or replace function public.mon_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profils where id = auth.uid()
$$;

create or replace function public.je_suis_actif()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select actif from public.profils where id = auth.uid()), false)
$$;

create or replace function public.mes_classes()
returns setof text
language sql stable security definer set search_path = public
as $$
  select classe from public.enseignant_classes where enseignant_id = auth.uid()
$$;

-- Journal d'audit : seule une fonction interne peut y écrire (jamais directement
-- un utilisateur), pour garantir que les actions sensibles sont bien tracées.
create or replace function public.journaliser(p_action text, p_details jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (utilisateur_id, action, details)
  values (auth.uid(), p_action, p_details);
end;
$$;
grant execute on function public.journaliser(text, jsonb) to authenticated;

-- Liste restreinte pour la Direction : uniquement les colonnes non confidentielles
-- (pas d'allergies, d'infos médicales, de téléphone ni d'adresse).
create or replace function public.effectifs_direction()
returns table (
  id uuid, matricule text, nom text, prenom text, classe text,
  statut text, date_naissance date, sexe text, annee_scolaire text
)
language sql security definer set search_path = public
as $$
  select e.id, e.matricule, e.nom, e.prenom, e.classe, e.statut, e.date_naissance, e.sexe, e.annee_scolaire
  from public.eleves e
  where public.mon_role() in ('direction', 'admin') and public.je_suis_actif()
$$;
grant execute on function public.effectifs_direction() to authenticated;

-- ----------------------------------------------------------------------------
-- PROVISIONNEMENT AUTOMATIQUE D'UN PROFIL À CHAQUE NOUVEAU COMPTE
-- (rôle = NULL par défaut ; l'administrateur l'attribue ensuite dans l'appli)
-- ----------------------------------------------------------------------------

create or replace function public.creer_profil_utilisateur()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profils (id, email, nom, prenom)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nom',
    new.raw_user_meta_data ->> 'prenom'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil_utilisateur();

-- ----------------------------------------------------------------------------
-- JOURNAL D'AUDIT AUTOMATIQUE (actions sensibles)
-- ----------------------------------------------------------------------------

create or replace function public.trg_audit_profils()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (old.role is distinct from new.role) or (old.actif is distinct from new.actif) then
    perform public.journaliser(
      'modification_compte',
      jsonb_build_object(
        'cible', new.id, 'email', new.email,
        'ancien_role', old.role, 'nouveau_role', new.role,
        'ancien_actif', old.actif, 'nouveau_actif', new.actif
      )
    );
  end if;
  return new;
end;
$$;
drop trigger if exists audit_profils on public.profils;
create trigger audit_profils
  after update on public.profils
  for each row execute function public.trg_audit_profils();

create or replace function public.trg_audit_eleves_suppression()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.journaliser(
    'suppression_eleve',
    jsonb_build_object('eleve_id', old.id, 'nom', old.nom, 'prenom', old.prenom)
  );
  return old;
end;
$$;
drop trigger if exists audit_eleves_suppression on public.eleves;
create trigger audit_eleves_suppression
  after delete on public.eleves
  for each row execute function public.trg_audit_eleves_suppression();

-- ============================================================================
-- ÉTAPE 1 — OBLIGATOIRE : te donner le rôle admin AVANT d'activer la sécurité
-- Remplace 'TON_EMAIL_ADMIN' par ton vrai email, puis exécute tout le script.
-- ============================================================================

insert into public.profils (id, email, role, actif)
select id, email, 'admin', true
from auth.users
where email = 'TON_EMAIL_ADMIN'
on conflict (id) do update set role = 'admin', actif = true;

-- ----------------------------------------------------------------------------
-- SÉCURITÉ (RLS) — tout est verrouillé par défaut, puis on autorise précisément
-- ----------------------------------------------------------------------------

alter table public.profils enable row level security;
alter table public.enseignant_classes enable row level security;
alter table public.audit_log enable row level security;
alter table public.presences enable row level security;
alter table public.eleves enable row level security;
alter table public.tuteurs enable row level security;
alter table public.contacts_urgence enable row level security;
alter table public.notes enable row level security;
alter table public.matieres enable row level security;

revoke insert, update, delete on public.audit_log from authenticated;

-- profils : chacun voit/modifie son propre profil (sans changer son rôle/statut,
-- protégé par le trigger ci-dessus qui ne fait que journaliser — la vraie
-- protection est que seule la policy "admin" autorise le changement de role/actif) ;
-- l'admin voit et gère tout le monde.
drop policy if exists "soi-meme" on public.profils;
create policy "soi-meme" on public.profils for select
  using (id = auth.uid() or public.mon_role() = 'admin');

drop policy if exists "admin gere les comptes" on public.profils;
create policy "admin gere les comptes" on public.profils for update
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

drop policy if exists "admin supprime les comptes" on public.profils;
create policy "admin supprime les comptes" on public.profils for delete
  using (public.mon_role() = 'admin');

-- enseignant_classes : l'admin gère les attributions, l'enseignant consulte les siennes.
drop policy if exists "admin gere les classes" on public.enseignant_classes;
create policy "admin gere les classes" on public.enseignant_classes for all
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

drop policy if exists "enseignant voit ses classes" on public.enseignant_classes;
create policy "enseignant voit ses classes" on public.enseignant_classes for select
  using (enseignant_id = auth.uid());

-- audit_log : lecture réservée à l'admin.
drop policy if exists "admin lit le journal" on public.audit_log;
create policy "admin lit le journal" on public.audit_log for select
  using (public.mon_role() = 'admin');

-- eleves : admin tout ; enseignant lecture seule sur ses classes.
drop policy if exists "admin tout sur eleves" on public.eleves;
create policy "admin tout sur eleves" on public.eleves for all
  using (public.mon_role() = 'admin' and public.je_suis_actif())
  with check (public.mon_role() = 'admin' and public.je_suis_actif());

drop policy if exists "enseignant lit ses eleves" on public.eleves;
create policy "enseignant lit ses eleves" on public.eleves for select
  using (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and classe in (select public.mes_classes())
  );

-- tuteurs / contacts_urgence : réservés à l'admin (données confidentielles).
drop policy if exists "admin tout sur tuteurs" on public.tuteurs;
create policy "admin tout sur tuteurs" on public.tuteurs for all
  using (public.mon_role() = 'admin' and public.je_suis_actif())
  with check (public.mon_role() = 'admin' and public.je_suis_actif());

drop policy if exists "admin tout sur contacts" on public.contacts_urgence;
create policy "admin tout sur contacts" on public.contacts_urgence for all
  using (public.mon_role() = 'admin' and public.je_suis_actif())
  with check (public.mon_role() = 'admin' and public.je_suis_actif());

-- matieres : lecture pour tous les actifs, écriture réservée à l'admin.
drop policy if exists "lecture matieres" on public.matieres;
create policy "lecture matieres" on public.matieres for select
  using (public.je_suis_actif());

drop policy if exists "admin modifie matieres" on public.matieres;
create policy "admin modifie matieres" on public.matieres for all
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

-- notes : admin tout ; direction lecture seule (résultats scolaires) ;
-- enseignant lecture + écriture uniquement pour ses classes.
drop policy if exists "admin tout sur notes" on public.notes;
create policy "admin tout sur notes" on public.notes for all
  using (public.mon_role() = 'admin' and public.je_suis_actif())
  with check (public.mon_role() = 'admin' and public.je_suis_actif());

drop policy if exists "direction lit les notes" on public.notes;
create policy "direction lit les notes" on public.notes for select
  using (public.mon_role() = 'direction' and public.je_suis_actif());

drop policy if exists "enseignant lit notes de ses classes" on public.notes;
create policy "enseignant lit notes de ses classes" on public.notes for select
  using (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and eleve_id in (select id from public.eleves where classe in (select public.mes_classes()))
  );

drop policy if exists "enseignant ecrit notes de ses classes" on public.notes;
create policy "enseignant ecrit notes de ses classes" on public.notes for all
  using (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and eleve_id in (select id from public.eleves where classe in (select public.mes_classes()))
  )
  with check (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and eleve_id in (select id from public.eleves where classe in (select public.mes_classes()))
  );

-- presences : admin tout ; enseignant lecture + écriture sur ses classes.
drop policy if exists "admin tout sur presences" on public.presences;
create policy "admin tout sur presences" on public.presences for all
  using (public.mon_role() = 'admin' and public.je_suis_actif())
  with check (public.mon_role() = 'admin' and public.je_suis_actif());

drop policy if exists "enseignant gere presences de ses classes" on public.presences;
create policy "enseignant gere presences de ses classes" on public.presences for all
  using (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and classe in (select public.mes_classes())
  )
  with check (
    public.mon_role() = 'enseignant' and public.je_suis_actif()
    and classe in (select public.mes_classes())
  );

-- ============================================================================
-- FIN DU SCRIPT.
-- Vérifie ensuite : select * from public.profils; → ton compte doit apparaître
-- avec role = 'admin' et actif = true.
-- ============================================================================
