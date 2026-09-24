-- ============================================================
-- RestOps · 09 · Helpers de seguridad (leen claims del JWT)
-- Claims inyectados por el custom access token hook:
--   org_id, membership_id, org_role, location_ids
-- ============================================================

create or replace function restops.jwt_claim(p_claim text)
returns text language sql stable set search_path = '' as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> p_claim,
      ''
    ), ''
  );
$$;

create or replace function restops.current_org_id()
returns uuid language sql stable set search_path = '' as $$
  select restops.jwt_claim('org_id')::uuid;
$$;

create or replace function restops.current_membership_id()
returns uuid language sql stable set search_path = '' as $$
  select restops.jwt_claim('membership_id')::uuid;
$$;

create or replace function restops.current_role()
returns text language sql stable set search_path = '' as $$
  select restops.jwt_claim('org_role');
$$;

create or replace function restops.current_user_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

-- Locales autorizados para la membresia activa
create or replace function restops.current_location_ids()
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'location_ids', '[]'::jsonb)
      )::uuid
    ),
    '{}'::uuid[]
  );
$$;

-- Owner y GM ven toda la organizacion; el resto va por location_ids
create or replace function restops.is_org_wide()
returns boolean language sql stable set search_path = '' as $$
  select restops.current_role() in ('owner','gm');
$$;

create or replace function restops.has_role(variadic p_roles text[])
returns boolean language sql stable set search_path = '' as $$
  select restops.current_role() = any(p_roles);
$$;

-- Puede escribir configuracion (templates, locales, usuarios, activos)
create or replace function restops.can_manage()
returns boolean language sql stable set search_path = '' as $$
  select restops.current_role() in ('owner','gm','manager');
$$;

-- Solo lectura estricta
create or replace function restops.is_read_only()
returns boolean language sql stable set search_path = '' as $$
  select restops.current_role() = 'auditor';
$$;

-- Acceso a un local concreto
create or replace function restops.can_access_location(p_location_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select case
    when p_location_id is null then false
    when restops.current_org_id() is null then false
    when restops.is_org_wide() then true
    else p_location_id = any(restops.current_location_ids())
  end;
$$;

-- Pertenencia real (bypassea RLS): usada por el hook y el cambio de organizacion
create or replace function restops.is_member_of(p_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membership m
    where m.organization_id = p_org_id
      and m.user_id = restops.current_user_id()
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

revoke all on function restops.is_member_of(uuid) from public, anon;
grant execute on function restops.is_member_of(uuid) to authenticated;

grant execute on function
  restops.current_org_id(), restops.current_membership_id(), restops.current_role(),
  restops.current_user_id(), restops.current_location_ids(), restops.is_org_wide(),
  restops.has_role(text[]), restops.can_manage(), restops.is_read_only(),
  restops.can_access_location(uuid), restops.jwt_claim(text)
to authenticated, service_role;
