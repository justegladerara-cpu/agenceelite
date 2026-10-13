-- Plateforme HSE RARA Mercia : tables préfixées hse_ (projet Supabase agence-elite-platform)
-- Accès réservé aux membres de hse_membres (RLS). On devient membre avec un code d'accès (hse_rejoindre).

create table if not exists public.hse_membres (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  role text not null default 'membre' check (role in ('admin','membre','lecture')),
  cree_le timestamptz not null default now()
);

create table if not exists public.hse_codes (
  code text primary key,
  role text not null default 'membre' check (role in ('admin','membre','lecture')),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create or replace function public.hse_est_membre()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hse_membres where user_id = auth.uid());
$$;

create or replace function public.hse_peut_ecrire()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hse_membres where user_id = auth.uid() and role in ('admin','membre'));
$$;

create or replace function public.hse_rejoindre(p_code text, p_nom text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Connectez-vous d''abord'; end if;
  select role into v_role from public.hse_codes where code = upper(btrim(p_code)) and actif;
  if v_role is null then raise exception 'Code d''accès incorrect'; end if;
  insert into public.hse_membres(user_id, nom, role) values (auth.uid(), nullif(btrim(p_nom), ''), v_role)
  on conflict (user_id) do update set nom = coalesce(excluded.nom, public.hse_membres.nom);
  return v_role;
end $$;

create table if not exists public.hse_parametres (
  cle text primary key,
  valeur jsonb not null,
  modifie_le timestamptz not null default now()
);

create table if not exists public.hse_journal (
  jour date primary key,
  personnes int, heures_reelles numeric,
  jsa int, causeries int, permis_chaud int, permis_froid int, inspections int, accueils int,
  visites_infirmerie int,
  presque_accidents int, dangers int, premiers_soins int, soins_medicaux int, travail_limite int,
  accidents_arret int, deces int, degats int, pollutions int,
  formations int, reunions_generales int, reunions_poste int, exercices int, cartes_zero int,
  actions_cloturees int, permis_confine int, evacuations int, evenements_info int,
  dechets_produits_kg numeric, dechets_evacues_kg numeric,
  commentaire text,
  modifie_le timestamptz not null default now(),
  modifie_par uuid default auth.uid()
);

create table if not exists public.hse_incidents (
  id uuid primary key default gen_random_uuid(),
  num bigint generated always as identity,
  date_evt timestamptz not null default now(),
  type text not null,
  gravite text not null default 'faible',
  titre text not null,
  lieu text, description text, personnes text, causes text, actions_immediates text,
  declare_par text,
  statut text not null default 'ouvert',
  photos text[] not null default '{}',
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.hse_actions (
  id uuid primary key default gen_random_uuid(),
  num bigint generated always as identity,
  titre text not null,
  description text,
  origine text not null default 'autre',
  incident_id uuid references public.hse_incidents(id) on delete set null,
  responsable text,
  echeance date,
  priorite text not null default 'normale',
  statut text not null default 'a_faire',
  cloture_le date,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.hse_permis (
  id uuid primary key default gen_random_uuid(),
  num bigint generated always as identity,
  type text not null,
  date_debut date not null default current_date,
  date_fin date,
  zone text, travaux text, entreprise text, demandeur text, autorise_par text,
  statut text not null default 'ouvert',
  remarques text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.hse_inspections (
  id uuid primary key default gen_random_uuid(),
  date_insp date not null default current_date,
  type text not null,
  zone text, inspecteur text,
  resultat text not null default 'conforme',
  points_ok int, points_nok int,
  observations text,
  photos text[] not null default '{}',
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.hse_formations (
  id uuid primary key default gen_random_uuid(),
  date_form date not null default current_date,
  type text not null default 'formation',
  theme text not null,
  formateur text, participants int, duree_h numeric,
  liste_presence text, remarques text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.hse_personnel (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  poste text, entreprise text, telephone text,
  taille_combinaison text, pointure text, taille_casque text,
  date_arrivee date, induction_le date, visite_medicale_le date,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create table if not exists public.hse_epi (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid references public.hse_personnel(id) on delete set null,
  date_remise date not null default current_date,
  article text not null,
  quantite int not null default 1,
  taille text, remarques text,
  cree_le timestamptz not null default now()
);

create table if not exists public.hse_documents (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  categorie text not null default 'autre',
  date_doc date default current_date,
  fichier text, lien text, description text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

-- RLS : membres seulement ; les comptes "lecture" ne peuvent que lire
do $$
declare t text;
begin
  foreach t in array array['hse_parametres','hse_journal','hse_incidents','hse_actions','hse_permis',
                           'hse_inspections','hse_formations','hse_personnel','hse_epi','hse_documents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists hse_lire on public.%I', t);
    execute format('drop policy if exists hse_ecrire on public.%I', t);
    execute format('create policy hse_lire on public.%I for select to authenticated using (public.hse_est_membre())', t);
    execute format('create policy hse_ecrire on public.%I for all to authenticated using (public.hse_peut_ecrire()) with check (public.hse_peut_ecrire())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.hse_membres enable row level security;
alter table public.hse_codes enable row level security;
drop policy if exists hse_membres_lire on public.hse_membres;
create policy hse_membres_lire on public.hse_membres for select to authenticated using (public.hse_est_membre());
revoke all on public.hse_membres from anon;
revoke all on public.hse_codes from anon, authenticated;
grant select on public.hse_membres to authenticated;
revoke all on function public.hse_rejoindre(text, text) from anon, public;
grant execute on function public.hse_rejoindre(text, text) to authenticated;
grant execute on function public.hse_est_membre() to authenticated;
grant execute on function public.hse_peut_ecrire() to authenticated;

-- Fichiers (photos, documents) : seau privé "hse"
insert into storage.buckets (id, name, public) values ('hse', 'hse', false) on conflict (id) do nothing;
drop policy if exists hse_fichiers_lire on storage.objects;
drop policy if exists hse_fichiers_ajouter on storage.objects;
drop policy if exists hse_fichiers_supprimer on storage.objects;
create policy hse_fichiers_lire on storage.objects for select to authenticated
  using (bucket_id = 'hse' and public.hse_est_membre());
create policy hse_fichiers_ajouter on storage.objects for insert to authenticated
  with check (bucket_id = 'hse' and public.hse_peut_ecrire());
create policy hse_fichiers_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'hse' and public.hse_peut_ecrire());

insert into public.hse_parametres(cle, valeur) values
  ('site', '{"nom":"Site de Kundji (MKB II)","client":"Trident OGX","entreprise":"RARA Mercia","heures_par_jour":12,"dernier_arret":"2024-02-28","dernier_incident":"2024-12-28","objectif_trir":0.5}'),
  ('objectifs', '{"inspections":20,"causeries":20,"jsa":20,"formations":2,"reunions_generales":1,"exercices":1}')
on conflict (cle) do nothing;
