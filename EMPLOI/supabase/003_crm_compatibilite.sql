-- Elite Emploi partage la base (et les comptes) du CRM Agence Elite. Accord de Juste le 2026-10-17.
-- Le CRM ferme les inscriptions (liste blanche) et crée un espace CRM pour chaque nouveau compte.
-- Ce fichier laisse passer les comptes créés depuis Elite Emploi (métadonnées app = 'emploi',
-- rôle candidat ou entreprise), sans leur donner d'espace CRM : ils n'ont aucun accès aux données du CRM.
-- L'adresse e-mail est validée d'office, comme pour les comptes du CRM (pas de serveur d'e-mail configuré).

create or replace function public.crm_single_owner()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if exists (select 1 from auth.users u where lower(u.email) = lower(new.email)) then
    raise exception 'Inscriptions fermées';
  end if;
  if not exists (select 1 from private.inscriptions_autorisees a where a.email = lower(new.email))
     and not (coalesce(new.raw_user_meta_data->>'app', '') = 'emploi'
              and coalesce(new.raw_user_meta_data->>'role', '') in ('candidat', 'entreprise')) then
    raise exception 'Inscriptions fermées';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$function$;

create or replace function public.crm_nouvel_espace()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare w uuid;
begin
  -- Compte Elite Emploi hors liste blanche du CRM : pas d'espace CRM.
  if coalesce(new.raw_user_meta_data->>'app', '') = 'emploi'
     and not exists (select 1 from private.inscriptions_autorisees a where a.email = lower(new.email)) then
    return new;
  end if;
  insert into public.workspaces (nom, owner_id) values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'Mon espace'), new.id) returning id into w;
  insert into public.workspace_members (workspace_id, user_id, role) values (w, new.id, 'proprietaire');
  insert into public.workspace_members (workspace_id, user_id, role)
  select i.workspace_id, new.id, i.role from private.invitations i where i.email = lower(new.email) and i.acceptee_le is null
  on conflict do nothing;
  update private.invitations set acceptee_le = now() where email = lower(new.email) and acceptee_le is null;
  return new;
end;
$function$;
