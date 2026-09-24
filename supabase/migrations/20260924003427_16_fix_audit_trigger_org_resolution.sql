-- ============================================================
-- RestOps · 16 · El audit trigger debe resolver el tenant
-- tambien para la tabla organization, donde id ES el tenant.
-- ============================================================

create or replace function restops.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_loc uuid;
  v_row jsonb;
  v_before jsonb;
  v_after  jsonb;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null; v_row := v_before;
  elsif tg_op = 'INSERT' then
    v_before := null; v_after := to_jsonb(new); v_row := v_after;
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new); v_row := v_after;
    if v_before = v_after then
      return coalesce(new, old);
    end if;
  end if;

  -- En la tabla organization el propio id es el tenant
  v_org := coalesce(
    (v_row->>'organization_id')::uuid,
    case when tg_table_name = 'organization' then (v_row->>'id')::uuid end
  );
  v_loc := (v_row->>'location_id')::uuid;

  if v_org is null then
    return coalesce(new, old);
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
