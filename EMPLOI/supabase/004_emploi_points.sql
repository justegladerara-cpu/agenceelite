-- Système de points d'Elite Emploi : un score sur 100 par candidature.
--   70 points : moyenne des meilleurs résultats aux tests demandés par l'offre (test non passé = 0 ;
--               si l'offre ne demande aucun test, moyenne de tous les tests passés par le candidat).
--   20 points : profil complet (CV 10, téléphone 5, ville et pays 5).
--   10 points : message de motivation d'au moins 50 caractères.
-- Niveaux : 80+ Excellent, 60-79 Bon, 40-59 À renforcer, moins de 40 Insuffisant.

create or replace function private.emploi_niveau(p_score int) returns text
language sql immutable set search_path = '' as $$
  select case when p_score >= 80 then 'Excellent' when p_score >= 60 then 'Bon'
              when p_score >= 40 then 'À renforcer' else 'Insuffisant' end
$$;

create or replace function private.emploi_score(p_candidature uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ca public.emploi_candidatures%rowtype;
  v_c public.emploi_candidats%rowtype;
  v_p public.emploi_profils%rowtype;
  v_nb_requis int;
  v_moy numeric;
  v_tests int; v_profil int; v_message int; v_total int;
begin
  select * into v_ca from public.emploi_candidatures where id = p_candidature;
  if not found then return null; end if;
  select * into v_c from public.emploi_candidats where user_id = v_ca.candidat_id;
  select * into v_p from public.emploi_profils where id = v_ca.candidat_id;

  select count(*) into v_nb_requis from public.emploi_offre_tests where offre_id = v_ca.offre_id;
  if v_nb_requis > 0 then
    select avg(coalesce(m.meilleur, 0)) into v_moy
    from public.emploi_offre_tests ot
    left join lateral (select max(r.pourcentage) meilleur from public.emploi_resultats r
                       where r.test_id = ot.test_id and r.candidat_id = v_ca.candidat_id and r.termine_le is not null) m on true
    where ot.offre_id = v_ca.offre_id;
  else
    select avg(m.meilleur) into v_moy from (
      select max(r.pourcentage) meilleur from public.emploi_resultats r
      where r.candidat_id = v_ca.candidat_id and r.termine_le is not null group by r.test_id) m;
  end if;
  v_tests := round(coalesce(v_moy, 0) * 0.7);
  v_profil := (case when v_c.cv_chemin is not null then 10 else 0 end)
            + (case when coalesce(trim(v_p.telephone), '') <> '' then 5 else 0 end)
            + (case when coalesce(trim(v_p.ville), '') <> '' and v_p.pays is not null then 5 else 0 end);
  v_message := case when length(trim(coalesce(v_ca.message, ''))) >= 50 then 10 else 0 end;
  v_total := least(100, v_tests + v_profil + v_message);
  return jsonb_build_object('score', v_total, 'niveau', private.emploi_niveau(v_total),
    'tests', v_tests, 'profil', v_profil, 'message', v_message, 'tests_requis', v_nb_requis);
end $$;
revoke execute on function private.emploi_score(uuid) from public, anon, authenticated;
revoke execute on function private.emploi_niveau(int) from public, anon, authenticated;

-- Scores des candidatures : l'admin voit tout, le candidat voit seulement les siennes.
create or replace function public.emploi_scores()
returns table (candidature_id uuid, score int, niveau text, detail jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  return query
  select ca.id, (s.d->>'score')::int, s.d->>'niveau', s.d
  from public.emploi_candidatures ca
  cross join lateral (select private.emploi_score(ca.id) d) s
  where private.emploi_est_admin() or ca.candidat_id = auth.uid();
end $$;
revoke execute on function public.emploi_scores() from public, anon;
grant execute on function public.emploi_scores() to authenticated;
