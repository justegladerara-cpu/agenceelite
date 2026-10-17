-- Plateforme emploi Agence Elite (recrutement.agence-elite.fr)
-- Toutes les tables commencent par emploi_ pour rester séparées des autres applications de la même base.
-- Les bonnes réponses des tests sont dans le schéma private, jamais exposé par l'API : la note est calculée côté serveur.

create schema if not exists private;

-- ───────────────────────── Tables ─────────────────────────

create table if not exists public.emploi_profils (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('candidat', 'entreprise', 'admin')),
  nom text not null default '',
  telephone text,
  pays text check (pays in ('CG', 'FR')),
  ville text,
  cree_le timestamptz not null default now()
);

create table if not exists public.emploi_candidats (
  user_id uuid primary key references public.emploi_profils(id) on delete cascade,
  titre text,
  resume text,
  metier text,
  competences text[] not null default '{}',
  langues text[] not null default '{}',
  experience_annees int check (experience_annees between 0 and 60),
  niveau_etudes text,
  disponible boolean not null default true,
  cv_chemin text,
  cv_nom text,
  consentement_rgpd boolean not null default false,
  consentement_le timestamptz,
  maj_le timestamptz not null default now()
);

create table if not exists public.emploi_entreprises (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null unique references public.emploi_profils(id) on delete cascade,
  nom text not null,
  secteur text,
  pays text check (pays in ('CG', 'FR')),
  ville text,
  site_web text,
  description text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'validee', 'refusee')),
  cree_le timestamptz not null default now()
);

create table if not exists public.emploi_offres (
  id uuid primary key default gen_random_uuid(),
  -- null : offre gérée directement par Agence Elite (recrutement pour un client)
  entreprise_id uuid references public.emploi_entreprises(id) on delete cascade,
  titre text not null,
  metier text not null,
  description text not null,
  missions text,
  profil text,
  pays text not null check (pays in ('CG', 'FR')),
  ville text not null,
  contrat text not null check (contrat in ('cdi', 'cdd', 'stage', 'interim', 'freelance', 'alternance')),
  teletravail boolean not null default false,
  salaire_min numeric check (salaire_min >= 0),
  salaire_max numeric check (salaire_max >= 0),
  devise text not null default 'XAF' check (devise in ('XAF', 'EUR')),
  confidentielle boolean not null default false,
  statut text not null default 'en_attente' check (statut in ('brouillon', 'en_attente', 'publiee', 'fermee', 'refusee')),
  a_la_une boolean not null default false,
  publiee_le timestamptz,
  expire_le date,
  cree_le timestamptz not null default now()
);
create index if not exists emploi_offres_statut_idx on public.emploi_offres (statut, publiee_le desc);
create index if not exists emploi_offres_entreprise_idx on public.emploi_offres (entreprise_id);

create table if not exists public.emploi_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titre text not null,
  categorie text not null,
  description text not null default '',
  duree_minutes int not null default 10 check (duree_minutes between 1 and 120),
  seuil_reussite int not null default 60 check (seuil_reussite between 0 and 100),
  actif boolean not null default true,
  ordre int not null default 0
);

create table if not exists public.emploi_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.emploi_tests(id) on delete cascade,
  ordre int not null default 0,
  enonce text not null,
  choix text[] not null check (array_length(choix, 1) between 2 and 6)
);
create index if not exists emploi_questions_test_idx on public.emploi_questions (test_id, ordre);

create table if not exists private.emploi_bonnes_reponses (
  question_id uuid primary key references public.emploi_questions(id) on delete cascade,
  bonne int not null check (bonne >= 0)
);

create table if not exists public.emploi_offre_tests (
  offre_id uuid not null references public.emploi_offres(id) on delete cascade,
  test_id uuid not null references public.emploi_tests(id) on delete cascade,
  primary key (offre_id, test_id)
);

create table if not exists public.emploi_resultats (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.emploi_tests(id) on delete cascade,
  candidat_id uuid not null references public.emploi_candidats(user_id) on delete cascade,
  debut_le timestamptz not null default now(),
  termine_le timestamptz,
  score int,
  total int,
  pourcentage int,
  reussi boolean
);
create index if not exists emploi_resultats_candidat_idx on public.emploi_resultats (candidat_id, test_id, debut_le desc);

create table if not exists public.emploi_candidatures (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references public.emploi_offres(id) on delete cascade,
  candidat_id uuid not null references public.emploi_candidats(user_id) on delete cascade,
  message text,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'a_appeler', 'entretien', 'qualifiee', 'retenue', 'refusee')),
  note_admin text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (offre_id, candidat_id)
);
create index if not exists emploi_candidatures_candidat_idx on public.emploi_candidatures (candidat_id);

-- Un CV qualifié transmis à une entreprise : c'est ce que l'entreprise paie.
create table if not exists public.emploi_envois (
  id uuid primary key default gen_random_uuid(),
  candidature_id uuid not null unique references public.emploi_candidatures(id) on delete cascade,
  entreprise_id uuid not null references public.emploi_entreprises(id) on delete cascade,
  prix numeric not null default 2500 check (prix >= 0),
  devise text not null default 'XAF' check (devise in ('XAF', 'EUR')),
  statut_paiement text not null default 'a_facturer' check (statut_paiement in ('a_facturer', 'facture', 'paye')),
  decision_entreprise text not null default 'en_attente' check (decision_entreprise in ('en_attente', 'entretien', 'retenu', 'refuse')),
  commentaire_admin text,
  envoye_le timestamptz not null default now()
);
create index if not exists emploi_envois_entreprise_idx on public.emploi_envois (entreprise_id);

-- ───────────────────────── Fonctions d'aide ─────────────────────────

create or replace function private.emploi_est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.emploi_profils p where p.id = auth.uid() and p.role = 'admin')
$$;

create or replace function private.emploi_mon_entreprise() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.emploi_entreprises e where e.proprietaire_id = auth.uid()
$$;

-- Le candidat a-t-il été transmis à mon entreprise ?
create or replace function private.emploi_candidat_transmis(p_candidat uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.emploi_envois v
    join public.emploi_candidatures c on c.id = v.candidature_id
    join public.emploi_entreprises e on e.id = v.entreprise_id
    where c.candidat_id = p_candidat and e.proprietaire_id = auth.uid()
  )
$$;

-- Même chose à partir du nom de dossier d'un CV (texte : jamais d'erreur de conversion sur les autres dossiers du stockage).
create or replace function private.emploi_cv_transmis(p_dossier text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.emploi_envois v
    join public.emploi_candidatures c on c.id = v.candidature_id
    join public.emploi_entreprises e on e.id = v.entreprise_id
    where c.candidat_id::text = p_dossier and e.proprietaire_id = auth.uid()
  )
$$;

grant usage on schema private to authenticated, anon;
grant execute on function private.emploi_cv_transmis(text) to authenticated;
grant execute on function private.emploi_est_admin() to authenticated, anon;
grant execute on function private.emploi_mon_entreprise() to authenticated;
grant execute on function private.emploi_candidat_transmis(uuid) to authenticated;

-- ───────────────────────── Garde-fous (seul l'admin change rôles et statuts) ─────────────────────────

create or replace function private.emploi_garde_profil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not private.emploi_est_admin() and auth.uid() is not null then
    raise exception 'Seul un administrateur peut changer un rôle.';
  end if;
  return new;
end $$;
create or replace trigger emploi_garde_profil before update on public.emploi_profils
  for each row execute function private.emploi_garde_profil();

create or replace function private.emploi_garde_entreprise() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.emploi_est_admin() then
    if tg_op = 'INSERT' then
      new.statut := 'en_attente';
    elsif new.statut is distinct from old.statut then
      raise exception 'Seul un administrateur peut valider une entreprise.';
    end if;
  end if;
  return new;
end $$;
create or replace trigger emploi_garde_entreprise before insert or update on public.emploi_entreprises
  for each row execute function private.emploi_garde_entreprise();

create or replace function private.emploi_garde_offre() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.emploi_est_admin() then
    -- Une entreprise propose, l'admin publie.
    if new.statut not in ('brouillon', 'en_attente', 'fermee') then
      if tg_op = 'UPDATE' and new.statut = old.statut then
        null; -- offre déjà publiée : modification des textes autorisée, elle repasse en validation plus bas
      else
        raise exception 'Seul un administrateur peut publier une offre.';
      end if;
    end if;
    if tg_op = 'INSERT' then
      new.a_la_une := false;
      new.publiee_le := null;
    else
      new.a_la_une := old.a_la_une;
      if old.statut = 'publiee' and new.statut = 'publiee'
         and (new.titre, new.description, coalesce(new.missions, ''), coalesce(new.profil, ''))
             is distinct from (old.titre, old.description, coalesce(old.missions, ''), coalesce(old.profil, '')) then
        new.statut := 'en_attente';
      end if;
    end if;
  end if;
  if new.statut = 'publiee' and new.publiee_le is null then
    new.publiee_le := now();
  end if;
  return new;
end $$;
create or replace trigger emploi_garde_offre before insert or update on public.emploi_offres
  for each row execute function private.emploi_garde_offre();

create or replace function private.emploi_maj_candidature() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.maj_le := now();
  return new;
end $$;
create or replace trigger emploi_maj_candidature before update on public.emploi_candidatures
  for each row execute function private.emploi_maj_candidature();

-- Création automatique du profil à l'inscription.
-- Ne concerne que les comptes créés depuis la plateforme emploi (app = 'emploi') : les autres applications de la base ne sont pas touchées.
create or replace function private.emploi_nouveau_compte() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'emploi' then
    return new;
  end if;
  if coalesce(v_role, '') not in ('candidat', 'entreprise') then
    v_role := 'candidat';
  end if;
  insert into public.emploi_profils (id, role, nom, telephone, pays)
  values (
    new.id, v_role,
    left(coalesce(new.raw_user_meta_data ->> 'nom', ''), 120),
    left(new.raw_user_meta_data ->> 'telephone', 40),
    case when new.raw_user_meta_data ->> 'pays' in ('CG', 'FR') then new.raw_user_meta_data ->> 'pays' end
  )
  on conflict (id) do nothing;
  if v_role = 'candidat' then
    insert into public.emploi_candidats (user_id, consentement_rgpd, consentement_le)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'consentement', '') = 'true',
            case when (new.raw_user_meta_data ->> 'consentement') = 'true' then now() end)
    on conflict do nothing;
  end if;
  return new;
end $$;
create or replace trigger emploi_nouveau_compte after insert on auth.users
  for each row execute function private.emploi_nouveau_compte();

-- ───────────────────────── Sécurité (RLS) ─────────────────────────

alter table public.emploi_profils enable row level security;
alter table public.emploi_candidats enable row level security;
alter table public.emploi_entreprises enable row level security;
alter table public.emploi_offres enable row level security;
alter table public.emploi_tests enable row level security;
alter table public.emploi_questions enable row level security;
alter table private.emploi_bonnes_reponses enable row level security;
alter table public.emploi_offre_tests enable row level security;
alter table public.emploi_resultats enable row level security;
alter table public.emploi_candidatures enable row level security;
alter table public.emploi_envois enable row level security;

-- Profils
create policy "emploi profils lecture" on public.emploi_profils for select to authenticated
  using (id = (select auth.uid()) or (select private.emploi_est_admin()) or (select private.emploi_candidat_transmis(id)));
create policy "emploi profils modification" on public.emploi_profils for update to authenticated
  using (id = (select auth.uid()) or (select private.emploi_est_admin()));

-- Candidats
create policy "emploi candidats lecture" on public.emploi_candidats for select to authenticated
  using (user_id = (select auth.uid()) or (select private.emploi_est_admin()) or (select private.emploi_candidat_transmis(user_id)));
create policy "emploi candidats ajout" on public.emploi_candidats for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "emploi candidats modification" on public.emploi_candidats for update to authenticated
  using (user_id = (select auth.uid()) or (select private.emploi_est_admin()));

-- Entreprises : les entreprises validées sont visibles de tous (nom et présentation)
create policy "emploi entreprises lecture" on public.emploi_entreprises for select to anon, authenticated
  using (statut = 'validee' or proprietaire_id = (select auth.uid()) or (select private.emploi_est_admin()));
create policy "emploi entreprises ajout" on public.emploi_entreprises for insert to authenticated
  with check (proprietaire_id = (select auth.uid())
    and exists (select 1 from public.emploi_profils p where p.id = (select auth.uid()) and p.role = 'entreprise'));
create policy "emploi entreprises modification" on public.emploi_entreprises for update to authenticated
  using (proprietaire_id = (select auth.uid()) or (select private.emploi_est_admin()));
create policy "emploi entreprises suppression" on public.emploi_entreprises for delete to authenticated
  using ((select private.emploi_est_admin()));

-- Offres
create policy "emploi offres lecture" on public.emploi_offres for select to anon, authenticated
  using (statut = 'publiee' or entreprise_id = (select private.emploi_mon_entreprise()) or (select private.emploi_est_admin()));
create policy "emploi offres ajout" on public.emploi_offres for insert to authenticated
  with check ((select private.emploi_est_admin())
    or (entreprise_id = (select private.emploi_mon_entreprise())
        and exists (select 1 from public.emploi_entreprises e where e.id = entreprise_id and e.statut = 'validee')));
create policy "emploi offres modification" on public.emploi_offres for update to authenticated
  using ((select private.emploi_est_admin()) or entreprise_id = (select private.emploi_mon_entreprise()))
  with check ((select private.emploi_est_admin()) or entreprise_id = (select private.emploi_mon_entreprise()));
create policy "emploi offres suppression" on public.emploi_offres for delete to authenticated
  using ((select private.emploi_est_admin()) or (entreprise_id = (select private.emploi_mon_entreprise()) and statut <> 'publiee'));

-- Tests : catalogue public, questions visibles une fois connecté, réponses jamais lisibles
create policy "emploi tests lecture" on public.emploi_tests for select to anon, authenticated
  using (actif or (select private.emploi_est_admin()));
create policy "emploi tests gestion" on public.emploi_tests for all to authenticated
  using ((select private.emploi_est_admin())) with check ((select private.emploi_est_admin()));
create policy "emploi questions lecture" on public.emploi_questions for select to authenticated using (true);
create policy "emploi questions gestion" on public.emploi_questions for all to authenticated
  using ((select private.emploi_est_admin())) with check ((select private.emploi_est_admin()));

create policy "emploi offre_tests lecture" on public.emploi_offre_tests for select to anon, authenticated using (true);
create policy "emploi offre_tests gestion" on public.emploi_offre_tests for all to authenticated
  using ((select private.emploi_est_admin()) or exists (
    select 1 from public.emploi_offres o where o.id = offre_id and o.entreprise_id = (select private.emploi_mon_entreprise())))
  with check ((select private.emploi_est_admin()) or exists (
    select 1 from public.emploi_offres o where o.id = offre_id and o.entreprise_id = (select private.emploi_mon_entreprise())));

-- Résultats : écrits uniquement par les fonctions emploi_commencer_test / emploi_soumettre_test
create policy "emploi resultats lecture" on public.emploi_resultats for select to authenticated
  using (candidat_id = (select auth.uid()) or (select private.emploi_est_admin()) or (select private.emploi_candidat_transmis(candidat_id)));

-- Candidatures : l'entreprise ne les voit pas, Agence Elite trie d'abord
create policy "emploi candidatures lecture" on public.emploi_candidatures for select to authenticated
  using (candidat_id = (select auth.uid()) or (select private.emploi_est_admin()));
create policy "emploi candidatures ajout" on public.emploi_candidatures for insert to authenticated
  with check (candidat_id = (select auth.uid()) and statut = 'nouvelle' and note_admin is null
    and exists (select 1 from public.emploi_offres o where o.id = offre_id and o.statut = 'publiee'));
create policy "emploi candidatures gestion" on public.emploi_candidatures for update to authenticated
  using ((select private.emploi_est_admin()));
create policy "emploi candidatures retrait" on public.emploi_candidatures for delete to authenticated
  using ((candidat_id = (select auth.uid()) and statut = 'nouvelle') or (select private.emploi_est_admin()));

-- Envois de CV qualifiés
create policy "emploi envois lecture" on public.emploi_envois for select to authenticated
  using ((select private.emploi_est_admin()) or entreprise_id = (select private.emploi_mon_entreprise()));
create policy "emploi envois gestion" on public.emploi_envois for all to authenticated
  using ((select private.emploi_est_admin())) with check ((select private.emploi_est_admin()));

-- ───────────────────────── Fonctions appelées par le site ─────────────────────────

-- Offres publiées, avec le nom de l'entreprise masqué si l'offre est confidentielle.
create or replace function public.emploi_offres_publiees()
returns table (
  id uuid, titre text, metier text, description text, missions text, profil text, pays text, ville text,
  contrat text, teletravail boolean, salaire_min numeric, salaire_max numeric, devise text,
  a_la_une boolean, publiee_le timestamptz, expire_le date, entreprise_nom text, entreprise_secteur text,
  tests jsonb
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.titre, o.metier, o.description, o.missions, o.profil, o.pays, o.ville,
         o.contrat, o.teletravail, o.salaire_min, o.salaire_max, o.devise,
         o.a_la_une, o.publiee_le, o.expire_le,
         case when o.confidentielle then null
              when o.entreprise_id is null then 'Agence Elite'
              else e.nom end,
         case when o.confidentielle then null else e.secteur end,
         coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'titre', t.titre) order by t.ordre)
                   from public.emploi_offre_tests ot join public.emploi_tests t on t.id = ot.test_id
                   where ot.offre_id = o.id and t.actif), '[]'::jsonb)
  from public.emploi_offres o
  left join public.emploi_entreprises e on e.id = o.entreprise_id
  where o.statut = 'publiee' and (o.expire_le is null or o.expire_le >= current_date)
  order by o.a_la_une desc, o.publiee_le desc nulls last
$$;
grant execute on function public.emploi_offres_publiees() to anon, authenticated;

-- Démarre un test (ou reprend celui en cours). Un test réussi ou raté se repasse après 30 jours.
create or replace function public.emploi_commencer_test(p_test uuid)
returns table (resultat_id uuid, debut_le timestamptz, duree_minutes int)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_test public.emploi_tests%rowtype;
  v_res public.emploi_resultats%rowtype;
begin
  if v_uid is null or not exists (select 1 from public.emploi_candidats c where c.user_id = v_uid) then
    raise exception 'Connectez-vous avec un compte candidat pour passer un test.';
  end if;
  select * into v_test from public.emploi_tests t where t.id = p_test and t.actif;
  if not found then raise exception 'Ce test n''existe pas.'; end if;

  select * into v_res from public.emploi_resultats r
  where r.candidat_id = v_uid and r.test_id = p_test order by r.debut_le desc limit 1;

  if found and v_res.termine_le is null
     and v_res.debut_le + make_interval(mins => v_test.duree_minutes + 2) > now() then
    return query select v_res.id, v_res.debut_le, v_test.duree_minutes;
    return;
  end if;
  if found and coalesce(v_res.termine_le, v_res.debut_le) > now() - interval '30 days' then
    raise exception 'Vous avez déjà passé ce test. Vous pourrez le repasser à partir du %.',
      to_char(coalesce(v_res.termine_le, v_res.debut_le) + interval '30 days', 'DD/MM/YYYY');
  end if;

  insert into public.emploi_resultats (test_id, candidat_id) values (p_test, v_uid) returning * into v_res;
  return query select v_res.id, v_res.debut_le, v_test.duree_minutes;
end $$;
grant execute on function public.emploi_commencer_test(uuid) to authenticated;

-- Corrige le test côté serveur. p_reponses : {"<question_id>": <index du choix>}
create or replace function public.emploi_soumettre_test(p_resultat uuid, p_reponses jsonb)
returns table (score int, total int, pourcentage int, reussi boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_res public.emploi_resultats%rowtype;
  v_test public.emploi_tests%rowtype;
  v_score int;
  v_total int;
  v_pct int;
begin
  select * into v_res from public.emploi_resultats r where r.id = p_resultat and r.candidat_id = auth.uid() for update;
  if not found then raise exception 'Test introuvable.'; end if;
  if v_res.termine_le is not null then raise exception 'Ce test est déjà terminé.'; end if;
  select * into v_test from public.emploi_tests t where t.id = v_res.test_id;

  select count(*), count(*) filter (where (p_reponses ->> q.id::text) ~ '^\d+$' and (p_reponses ->> q.id::text)::int = b.bonne)
    into v_total, v_score
  from public.emploi_questions q
  join private.emploi_bonnes_reponses b on b.question_id = q.id
  where q.test_id = v_res.test_id;

  -- Temps dépassé (marge de 2 minutes) : les réponses ne comptent pas.
  if now() > v_res.debut_le + make_interval(mins => v_test.duree_minutes + 2) then
    v_score := 0;
  end if;

  v_pct := case when v_total > 0 then round(100.0 * v_score / v_total) else 0 end;
  update public.emploi_resultats r
     set termine_le = now(), score = v_score, total = v_total, pourcentage = v_pct, reussi = v_pct >= v_test.seuil_reussite
   where r.id = p_resultat;
  return query select v_score, v_total, v_pct, v_pct >= v_test.seuil_reussite;
end $$;
grant execute on function public.emploi_soumettre_test(uuid, jsonb) to authenticated;

-- Profils transmis à mon entreprise (avec les résultats de tests).
create or replace function public.emploi_profils_recus()
returns table (
  envoi_id uuid, envoye_le timestamptz, decision_entreprise text, prix numeric, devise text, statut_paiement text,
  commentaire_admin text, offre_titre text, candidat_id uuid, nom text, telephone text, email text, ville text, pays text,
  titre text, resume text, competences text[], langues text[], experience_annees int, niveau_etudes text,
  cv_chemin text, cv_nom text, tests jsonb
)
language sql stable security definer set search_path = '' as $$
  select v.id, v.envoye_le, v.decision_entreprise, v.prix, v.devise, v.statut_paiement, v.commentaire_admin,
         o.titre, c.user_id, p.nom, p.telephone, u.email::text, p.ville, p.pays,
         c.titre, c.resume, c.competences, c.langues, c.experience_annees, c.niveau_etudes, c.cv_chemin, c.cv_nom,
         coalesce((select jsonb_agg(jsonb_build_object('titre', t.titre, 'pourcentage', r.pourcentage, 'reussi', r.reussi, 'le', r.termine_le) order by r.termine_le desc)
                   from public.emploi_resultats r join public.emploi_tests t on t.id = r.test_id
                   where r.candidat_id = c.user_id and r.termine_le is not null), '[]'::jsonb)
  from public.emploi_envois v
  join public.emploi_candidatures ca on ca.id = v.candidature_id
  join public.emploi_offres o on o.id = ca.offre_id
  join public.emploi_candidats c on c.user_id = ca.candidat_id
  join public.emploi_profils p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where v.entreprise_id = private.emploi_mon_entreprise()
  order by v.envoye_le desc
$$;
grant execute on function public.emploi_profils_recus() to authenticated;

-- L'entreprise donne sa décision sur un profil reçu.
create or replace function public.emploi_decision(p_envoi uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_decision not in ('en_attente', 'entretien', 'retenu', 'refuse') then raise exception 'Décision inconnue.'; end if;
  update public.emploi_envois v set decision_entreprise = p_decision
   where v.id = p_envoi and v.entreprise_id = private.emploi_mon_entreprise();
  if not found then raise exception 'Profil introuvable.'; end if;
end $$;
grant execute on function public.emploi_decision(uuid, text) to authenticated;

-- Admin : liste des candidatures avec tout ce qu'il faut pour trier.
create or replace function public.emploi_admin_candidatures()
returns table (
  id uuid, cree_le timestamptz, statut text, note_admin text, message text,
  offre_id uuid, offre_titre text, entreprise_id uuid, entreprise_nom text,
  candidat_id uuid, nom text, email text, telephone text, ville text, pays text,
  titre text, experience_annees int, competences text[], cv_chemin text, cv_nom text,
  tests jsonb, envoi_id uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.emploi_est_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  return query
  select ca.id, ca.cree_le, ca.statut, ca.note_admin, ca.message,
         o.id, o.titre, o.entreprise_id, e.nom,
         c.user_id, p.nom, u.email::text, p.telephone, p.ville, p.pays,
         c.titre, c.experience_annees, c.competences, c.cv_chemin, c.cv_nom,
         coalesce((select jsonb_agg(jsonb_build_object('titre', t.titre, 'pourcentage', r.pourcentage, 'reussi', r.reussi) order by r.termine_le desc)
                   from public.emploi_resultats r join public.emploi_tests t on t.id = r.test_id
                   where r.candidat_id = c.user_id and r.termine_le is not null), '[]'::jsonb),
         v.id
  from public.emploi_candidatures ca
  join public.emploi_offres o on o.id = ca.offre_id
  left join public.emploi_entreprises e on e.id = o.entreprise_id
  join public.emploi_candidats c on c.user_id = ca.candidat_id
  join public.emploi_profils p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  left join public.emploi_envois v on v.candidature_id = ca.id
  order by ca.cree_le desc;
end $$;
grant execute on function public.emploi_admin_candidatures() to authenticated;

-- Admin : ajoute ou modifie une question avec sa bonne réponse.
create or replace function public.emploi_admin_question(p_test uuid, p_enonce text, p_choix text[], p_bonne int, p_question uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.emploi_est_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if p_bonne < 0 or p_bonne >= coalesce(array_length(p_choix, 1), 0) then raise exception 'La bonne réponse doit être un des choix.'; end if;
  if p_question is null then
    insert into public.emploi_questions (test_id, ordre, enonce, choix)
    values (p_test, coalesce((select max(q.ordre) + 1 from public.emploi_questions q where q.test_id = p_test), 1), p_enonce, p_choix)
    returning id into v_id;
  else
    update public.emploi_questions q set enonce = p_enonce, choix = p_choix where q.id = p_question returning q.id into v_id;
  end if;
  insert into private.emploi_bonnes_reponses (question_id, bonne) values (v_id, p_bonne)
  on conflict (question_id) do update set bonne = excluded.bonne;
  return v_id;
end $$;
grant execute on function public.emploi_admin_question(uuid, text, text[], int, uuid) to authenticated;

-- Admin : lit la bonne réponse d'un test (pour la page de gestion des tests).
create or replace function public.emploi_admin_reponses(p_test uuid)
returns table (question_id uuid, bonne int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.emploi_est_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  return query select b.question_id, b.bonne from private.emploi_bonnes_reponses b
    join public.emploi_questions q on q.id = b.question_id where q.test_id = p_test;
end $$;
grant execute on function public.emploi_admin_reponses(uuid) to authenticated;

-- Les fonctions internes ne sont pas appelables depuis l'API publique.
revoke execute on function private.emploi_garde_profil() from public, anon, authenticated;
revoke execute on function private.emploi_garde_entreprise() from public, anon, authenticated;
revoke execute on function private.emploi_garde_offre() from public, anon, authenticated;
revoke execute on function private.emploi_maj_candidature() from public, anon, authenticated;
revoke execute on function private.emploi_nouveau_compte() from public, anon, authenticated;

-- ───────────────────────── Stockage des CV ─────────────────────────
-- Dossier privé : emploi-cv/<id du candidat>/<fichier>. PDF ou Word, 5 Mo au plus.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('emploi-cv', 'emploi-cv', false, 5242880,
        array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "emploi cv lecture" on storage.objects for select to authenticated
  using (bucket_id = 'emploi-cv' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.emploi_est_admin())
    or (select private.emploi_cv_transmis((storage.foldername(name))[1]))));
create policy "emploi cv ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'emploi-cv' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "emploi cv modification" on storage.objects for update to authenticated
  using (bucket_id = 'emploi-cv' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "emploi cv suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'emploi-cv' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- La note interne d'Agence Elite sur une candidature n'est jamais lisible par le candidat :
-- lecture colonne par colonne, sans note_admin (l'administration la lit par emploi_admin_candidatures).
revoke select on public.emploi_candidatures from anon, authenticated;
grant select (id, offre_id, candidat_id, message, statut, cree_le, maj_le) on public.emploi_candidatures to authenticated;
