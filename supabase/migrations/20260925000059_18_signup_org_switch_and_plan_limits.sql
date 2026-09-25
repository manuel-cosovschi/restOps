-- ============================================================
-- RestOps · 18 · Alta de organizacion, cambio de org y limite de plan
--
-- El signup NO puede ser tres inserts sueltos desde el cliente: un usuario
-- recien creado no tiene claims en el JWT todavia, asi que RLS le niega
-- todo. Estas funciones corren como security definer y hacen el alta
-- completa en UNA transaccion.
-- ============================================================

-- ------------------------------------------------------------
-- Slug a partir de un nombre. Saca acentos y todo lo que no sea
-- alfanumerico. "Grupo Costa" -> "grupo-costa"
-- ------------------------------------------------------------
create or replace function restops.slugify(p_text text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from
    regexp_replace(
      lower(translate(
        coalesce(p_text, ''),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
      )),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Slug libre para organizacion: agrega -2, -3... hasta encontrar uno
create or replace function restops.free_org_slug(p_name text)
returns text language plpgsql stable set search_path = '' as $$
declare
  v_base text;
  v_slug text;
  v_n    int := 1;
begin
  v_base := restops.slugify(p_name);
  -- El check de organization exige 3+ caracteres, alfanumerico en los bordes
  if length(v_base) < 3 then
    v_base := trim(both '-' from (v_base || '-resto'));
  end if;
  v_base := trim(both '-' from left(v_base, 44));
  v_slug := v_base;

  -- citext vive en el schema extensions y aca corremos con search_path vacio,
  -- asi que comparamos como text en minusculas en lugar de castear al tipo.
  while exists (select 1 from public.organization o where lower(o.slug::text) = lower(v_slug)) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  return v_slug;
end;
$$;

-- ------------------------------------------------------------
-- Alta de organizacion + membresia owner + suscripcion free.
-- Idempotente ante doble submit: si el usuario ya es owner de una org
-- con ese mismo nombre, devuelve la existente en vez de duplicarla.
-- ------------------------------------------------------------
create or replace function public.create_organization_with_owner(
  p_org_name  text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_org_id  uuid;
  v_slug    text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Necesitas una sesion activa' using errcode = '28000';
  end if;

  if length(trim(coalesce(p_org_name, ''))) < 2 then
    raise exception 'El nombre del negocio es obligatorio' using errcode = '22023';
  end if;

  -- Doble submit / reintento: no creamos una segunda organizacion igual
  select o.id into v_org_id
    from public.organization o
    join public.membership m on m.organization_id = o.id
   where m.user_id = v_user_id
     and m.role = 'owner'::public.org_role
     and m.deleted_at is null
     and o.deleted_at is null
     and lower(o.name) = lower(trim(p_org_name))
   limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  v_slug := restops.free_org_slug(p_org_name);

  insert into public.organization (name, slug)
  values (trim(p_org_name), v_slug)
  returning id into v_org_id;

  insert into public.subscription (organization_id, plan, status, trial_ends_at)
  values (v_org_id, 'free'::public.plan_tier, 'trialing'::public.subscription_status,
          now() + interval '14 days');

  insert into public.membership (
    organization_id, user_id, role, display_name, status, accepted_at
  ) values (
    v_org_id, v_user_id, 'owner'::public.org_role,
    coalesce(nullif(trim(p_full_name), ''), ''),
    'active'::public.entity_status, now()
  );

  -- La organizacion activa es la que el hook mete en el JWT
  update public.user_profile
     set active_organization_id = v_org_id,
         full_name = case
           when coalesce(trim(full_name), '') = ''
             then coalesce(nullif(trim(p_full_name), ''), full_name)
           else full_name
         end
   where id = v_user_id;

  return v_org_id;
end;
$$;

revoke execute on function public.create_organization_with_owner(text, text)
  from public, anon;
grant execute on function public.create_organization_with_owner(text, text)
  to authenticated;

-- ------------------------------------------------------------
-- Cambio de organizacion activa.
-- Valida pertenencia real contra membership, no contra el JWT: el claim
-- viejo justamente apunta a la organizacion que estamos dejando.
-- ------------------------------------------------------------
create or replace function public.switch_organization(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Necesitas una sesion activa' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.membership m
     where m.user_id = v_user_id
       and m.organization_id = p_organization_id
       and m.status = 'active'::public.entity_status
       and m.deleted_at is null
  ) then
    raise exception 'No sos miembro de esa organizacion' using errcode = '42501';
  end if;

  update public.user_profile
     set active_organization_id = p_organization_id
   where id = v_user_id;

  return p_organization_id;
end;
$$;

revoke execute on function public.switch_organization(uuid) from public, anon;
grant execute on function public.switch_organization(uuid) to authenticated;

-- ------------------------------------------------------------
-- Limite de locales por plan.
-- El handler devuelve 402 con link de upgrade, pero la barrera real
-- va en la base: si alguien postea directo a PostgREST, tambien rebota.
-- ------------------------------------------------------------
create or replace function restops.guard_location_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  public.plan_tier;
  v_max   int;
  v_count int;
begin
  select s.plan into v_plan
    from public.subscription s
   where s.organization_id = new.organization_id;

  v_plan := coalesce(v_plan, 'free'::public.plan_tier);

  select pl.max_locations into v_max
    from public.plan_limit pl
   where pl.plan = v_plan;

  -- null = ilimitado
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
    from public.location l
   where l.organization_id = new.organization_id
     and l.deleted_at is null;

  if v_count >= v_max then
    raise exception 'Tu plan incluye % local(es). Actualiza el plan para agregar mas.', v_max
      using errcode = 'RO402';
  end if;

  return new;
end;
$$;

create trigger trg_location_plan_limit
  before insert on public.location
  for each row execute function restops.guard_location_limit();

grant execute on function restops.slugify(text) to authenticated, service_role;
