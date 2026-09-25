-- ============================================================
-- RestOps · Test de aislamiento multi-tenant
--
-- Definition of done del Sprint 1: un usuario de la organizacion A no ve
-- NADA de la organizacion B, ni siquiera pidiendo un id directo.
--
-- Se corre entero como una sola sentencia: si una asercion falla, el bloque
-- aborta y se revierte todo, incluida la organizacion de prueba. No deja
-- basura ni cuando pasa ni cuando falla.
--
--   psql "$DATABASE_URL" -f supabase/tests/rls_tenant_isolation.sql
--
-- Nota: hay que correrlo como un rol SIN bypassrls sobre las consultas de
-- prueba; por eso cada asercion hace `set local role authenticated`.
-- ============================================================

do $$
declare
  v_org_a      uuid;
  v_user_a     uuid;
  v_loc_a      uuid;
  v_org_b      uuid;
  v_loc_b      uuid;
  v_member_b   uuid;
  v_user_b     uuid;
  v_claims     text;
  v_count      int;
  v_locs_a     jsonb;
begin
  -- ----------------------------------------------------------
  -- Fixture: organizacion A = la del seed, organizacion B = nueva
  -- ----------------------------------------------------------
  select o.id into v_org_a from public.organization o
   where o.slug::text = 'grupo-costa' and o.deleted_at is null;
  if v_org_a is null then
    raise exception 'Falta el seed: no existe la organizacion grupo-costa';
  end if;

  select m.user_id into v_user_a from public.membership m
   where m.organization_id = v_org_a and m.role = 'owner' and m.deleted_at is null
   limit 1;

  select l.id into v_loc_a from public.location l
   where l.organization_id = v_org_a and l.deleted_at is null limit 1;

  select coalesce(jsonb_agg(l.id), '[]'::jsonb) into v_locs_a
    from public.location l
   where l.organization_id = v_org_a and l.deleted_at is null;

  insert into public.organization (name, slug)
  values ('Tenant B de prueba', 'tenant-b-rls-test')
  returning id into v_org_b;

  insert into public.location (organization_id, name, slug)
  values (v_org_b, 'Local de B', 'local-de-b')
  returning id into v_loc_b;

  -- Un usuario cualquiera de A, reusado como dueño de B solo para el fixture
  select u.id into v_user_b from auth.users u limit 1;

  insert into public.membership (organization_id, user_id, role, status, accepted_at)
  values (v_org_b, v_user_b, 'owner', 'active', now())
  returning id into v_member_b;

  -- ----------------------------------------------------------
  -- Sesion simulada: owner de la organizacion A
  -- ----------------------------------------------------------
  v_claims := jsonb_build_object(
    'sub',           v_user_a::text,
    'role',          'authenticated',
    'org_id',        v_org_a::text,
    'org_role',      'owner',
    'membership_id', (select m.id::text from public.membership m
                       where m.organization_id = v_org_a and m.user_id = v_user_a limit 1),
    'location_ids',  v_locs_a
  )::text;

  perform set_config('request.jwt.claims', v_claims, true);
  execute 'set local role authenticated';

  -- 1. Listado de locales: ninguno de B
  select count(*) into v_count from public.location where organization_id = v_org_b;
  if v_count <> 0 then
    raise exception 'FUGA: el owner de A ve % local(es) de B en el listado', v_count;
  end if;

  -- 2. Id directo del local de B  <- la prueba que pide el DoD
  select count(*) into v_count from public.location where id = v_loc_b;
  if v_count <> 0 then
    raise exception 'FUGA: el owner de A accede al local de B pidiendo el id directo';
  end if;

  -- 3. La organizacion B
  select count(*) into v_count from public.organization where id = v_org_b;
  if v_count <> 0 then
    raise exception 'FUGA: el owner de A ve la organizacion B';
  end if;

  -- 4. Las membresias de B
  select count(*) into v_count from public.membership where organization_id = v_org_b;
  if v_count <> 0 then
    raise exception 'FUGA: el owner de A ve % membresia(s) de B', v_count;
  end if;

  -- 5. El propio local de A si se ve: el test no pasa por estar todo vacio
  select count(*) into v_count from public.location where id = v_loc_a;
  if v_count <> 1 then
    raise exception 'FALSO POSITIVO: el owner de A tampoco ve su propio local';
  end if;

  execute 'reset role';

  -- ----------------------------------------------------------
  -- Sesion simulada: empleado de A con alcance a UN solo local
  -- ----------------------------------------------------------
  v_claims := jsonb_build_object(
    'sub',           v_user_a::text,
    'role',          'authenticated',
    'org_id',        v_org_a::text,
    'org_role',      'employee',
    'location_ids',  jsonb_build_array(v_loc_a::text)
  )::text;

  perform set_config('request.jwt.claims', v_claims, true);
  execute 'set local role authenticated';

  -- 6. Ve su local asignado
  select count(*) into v_count from public.location where id = v_loc_a;
  if v_count <> 1 then
    raise exception 'El empleado no ve el local que tiene asignado';
  end if;

  -- 7. NO ve los otros locales de su propia organizacion
  select count(*) into v_count from public.location
   where organization_id = v_org_a and id <> v_loc_a and deleted_at is null;
  if v_count <> 0 then
    raise exception 'FUGA: el empleado ve % local(es) de A fuera de su alcance', v_count;
  end if;

  -- 8. Tampoco el de B
  select count(*) into v_count from public.location where id = v_loc_b;
  if v_count <> 0 then
    raise exception 'FUGA: el empleado de A accede al local de B';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- ----------------------------------------------------------
  -- Limpieza del fixture
  -- ----------------------------------------------------------
  delete from public.membership where id = v_member_b;
  delete from public.location where id = v_loc_b;
  delete from public.organization where id = v_org_b;

  raise notice 'OK: 8 aserciones de aislamiento pasaron';
end $$;
