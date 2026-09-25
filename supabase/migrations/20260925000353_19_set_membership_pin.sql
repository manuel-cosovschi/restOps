-- ============================================================
-- RestOps · 19 · Alta de PIN de kiosco
--
-- El PIN se hashea con bcrypt DENTRO de la base: el handler nunca guarda
-- ni loguea el texto plano, y pgcrypto no es alcanzable desde PostgREST.
-- La Edge Function pin-login compara contra este mismo hash.
-- ============================================================

create or replace function public.set_membership_pin(
  p_membership_id uuid,
  p_pin           text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_org  uuid;
  v_target_org  uuid;
begin
  if p_pin !~ '^\d{4}$' then
    raise exception 'El PIN son 4 digitos' using errcode = '22023';
  end if;

  -- PINs triviales: 0000, 1111... y los dos clasicos
  if p_pin ~ '^(\d)\1{3}$' or p_pin in ('1234', '4321') then
    raise exception 'Ese PIN es demasiado obvio' using errcode = '22023';
  end if;

  v_caller_org := restops.current_org_id();

  if v_caller_org is null or not restops.can_manage() then
    raise exception 'No tenes permiso para asignar PINs' using errcode = '42501';
  end if;

  select m.organization_id into v_target_org
    from public.membership m
   where m.id = p_membership_id
     and m.deleted_at is null;

  if v_target_org is null then
    raise exception 'Membresia inexistente' using errcode = 'P0002';
  end if;

  -- Cruce de tenant: un encargado no le pone PIN a alguien de otra org
  if v_target_org <> v_caller_org then
    raise exception 'Membresia inexistente' using errcode = 'P0002';
  end if;

  update public.membership
     set pin_hash         = extensions.crypt(p_pin, extensions.gen_salt('bf')),
         pin_set_at       = now(),
         failed_pin_count = 0,
         locked_until     = null
   where id = p_membership_id;
end;
$$;

revoke execute on function public.set_membership_pin(uuid, text) from public, anon;
grant execute on function public.set_membership_pin(uuid, text) to authenticated;
