-- ============================================================
-- RestOps · 12 · Auditoria automatica + custom access token hook
-- ============================================================

create or replace function restops.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_loc uuid;
  v_before jsonb;
  v_after  jsonb;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null;
    v_org := (v_before->>'organization_id')::uuid;
    v_loc := (v_before->>'location_id')::uuid;
  elsif tg_op = 'INSERT' then
    v_before := null; v_after := to_jsonb(new);
    v_org := (v_after->>'organization_id')::uuid;
    v_loc := (v_after->>'location_id')::uuid;
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    v_org := (v_after->>'organization_id')::uuid;
    v_loc := (v_after->>'location_id')::uuid;
    if v_before = v_after then
      return coalesce(new, old);
    end if;
  end if;

  insert into public.audit_log (
    organization_id, location_id, actor_membership_id, actor_user_id, actor_type,
    action, entity_type, entity_id, before, after, request_id
  ) values (
    v_org, v_loc,
    restops.current_membership_id(),
    restops.current_user_id(),
    case when restops.current_user_id() is null
         then 'system'::public.actor_type
         else 'user'::public.actor_type end,
    lower(tg_op), tg_table_name,
    coalesce((v_after->>'id')::uuid, (v_before->>'id')::uuid),
    v_before, v_after,
    restops.jwt_claim('request_id')
  );

  return coalesce(new, old);
end;
$$;

-- Aplicar auditoria a las entidades que importan
do $$
declare t text;
begin
  foreach t in array array[
    'organization','location','membership','membership_location','device',
    'checklist_template','checklist_item_template','recurrence_rule',
    'checklist_run','exception','corrective_action','incident',
    'temperature_point','asset','document','shift_handoff'
  ]
  loop
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
       for each row execute function restops.audit_trigger()', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Custom access token hook
-- Inyecta org_id / membership_id / org_role / location_ids en el JWT.
-- Sin esto, cada politica RLS tendria que hacer subquery a membership.
-- ------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id    uuid;
  v_org_id     uuid;
  v_membership public.membership%rowtype;
  v_locations  jsonb;
  v_orgs       jsonb;
  v_claims     jsonb;
begin
  v_user_id := (event->>'user_id')::uuid;
  v_claims  := coalesce(event->'claims', '{}'::jsonb);

  select active_organization_id into v_org_id
    from public.user_profile where id = v_user_id;

  -- Membresia de la organizacion activa, o la primera disponible
  select m.* into v_membership
    from public.membership m
   where m.user_id = v_user_id
     and m.status = 'active'::public.entity_status
     and m.deleted_at is null
     and (v_org_id is null or m.organization_id = v_org_id)
   order by (m.organization_id = v_org_id) desc,
            array_position(
              array['owner','gm','manager','maintenance','auditor','employee']::public.org_role[],
              m.role
            ),
            m.created_at
   limit 1;

  if v_membership.id is null then
    -- Usuario sin organizacion todavia (post signup): claims vacios, RLS niega todo
    v_claims := jsonb_set(v_claims, '{org_id}',        'null'::jsonb);
    v_claims := jsonb_set(v_claims, '{membership_id}', 'null'::jsonb);
    v_claims := jsonb_set(v_claims, '{org_role}',      'null'::jsonb);
    v_claims := jsonb_set(v_claims, '{location_ids}',  '[]'::jsonb);
    v_claims := jsonb_set(v_claims, '{orgs}',          '[]'::jsonb);
    return jsonb_set(event, '{claims}', v_claims);
  end if;

  -- Owner y GM: todos los locales de la organizacion
  if v_membership.role in ('owner'::public.org_role, 'gm'::public.org_role) then
    select coalesce(jsonb_agg(l.id), '[]'::jsonb) into v_locations
      from public.location l
     where l.organization_id = v_membership.organization_id
       and l.deleted_at is null;
  else
    select coalesce(jsonb_agg(ml.location_id), '[]'::jsonb) into v_locations
      from public.membership_location ml
      join public.location l on l.id = ml.location_id and l.deleted_at is null
     where ml.membership_id = v_membership.id;
  end if;

  -- Todas las organizaciones del usuario, para el selector de la UI
  select coalesce(jsonb_agg(jsonb_build_object(
           'org_id', m.organization_id,
           'org_name', o.name,
           'org_slug', o.slug,
           'membership_id', m.id,
           'role', m.role
         ) order by o.name), '[]'::jsonb) into v_orgs
    from public.membership m
    join public.organization o on o.id = m.organization_id and o.deleted_at is null
   where m.user_id = v_user_id
     and m.status = 'active'::public.entity_status
     and m.deleted_at is null;

  v_claims := jsonb_set(v_claims, '{org_id}',        to_jsonb(v_membership.organization_id));
  v_claims := jsonb_set(v_claims, '{membership_id}', to_jsonb(v_membership.id));
  v_claims := jsonb_set(v_claims, '{org_role}',      to_jsonb(v_membership.role::text));
  v_claims := jsonb_set(v_claims, '{location_ids}',  v_locations);
  v_claims := jsonb_set(v_claims, '{orgs}',          v_orgs);

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.membership, public.membership_location,
               public.location, public.organization, public.user_profile
  to supabase_auth_admin;

-- El hook corre como supabase_auth_admin: necesita politicas propias
create policy auth_admin_read_membership on public.membership
  for select to supabase_auth_admin using (true);
create policy auth_admin_read_memloc on public.membership_location
  for select to supabase_auth_admin using (true);
create policy auth_admin_read_location on public.location
  for select to supabase_auth_admin using (true);
create policy auth_admin_read_org on public.organization
  for select to supabase_auth_admin using (true);
create policy auth_admin_read_profile on public.user_profile
  for select to supabase_auth_admin using (true);
