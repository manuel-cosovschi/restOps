-- ============================================================
-- RestOps · 11 · Logica de negocio en la base
-- El status de una respuesta lo decide el servidor, NUNCA el cliente.
-- ============================================================

create or replace function restops.evaluate_response()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.checklist_item_template%rowtype;
  v_point  public.temperature_point%rowtype;
  v_min    numeric;
  v_max    numeric;
  v_fail   boolean := false;
begin
  select * into v_item from public.checklist_item_template where id = new.item_template_id;
  if not found then
    raise exception 'Item de checklist inexistente: %', new.item_template_id;
  end if;

  if v_item.organization_id <> new.organization_id then
    raise exception 'Violacion de tenant en la respuesta';
  end if;

  new.item_snapshot := jsonb_build_object(
    'label', v_item.label,
    'type', v_item.type,
    'section', v_item.section,
    'required', v_item.required,
    'criticality', v_item.criticality,
    'config', v_item.config,
    'photo_required', v_item.photo_required,
    'snapshot_at', now()
  );

  if new.status = 'na'::public.response_status then
    return new;
  end if;

  case v_item.type
    when 'temperature'::public.item_type then
      select * into v_point from public.temperature_point where id = v_item.temperature_point_id;
      if not found then
        raise exception 'Punto de temperatura inexistente para el item %', v_item.id;
      end if;
      if new.value_num is null then
        raise exception 'El item de temperatura "%" requiere un valor', v_item.label;
      end if;
      v_fail := new.value_num < v_point.min_c or new.value_num > v_point.max_c;
      new.item_snapshot := new.item_snapshot || jsonb_build_object(
        'min_c', v_point.min_c, 'max_c', v_point.max_c, 'point_name', v_point.name
      );

    when 'number'::public.item_type then
      v_min := (v_item.config->>'min')::numeric;
      v_max := (v_item.config->>'max')::numeric;
      v_fail := (v_min is not null and new.value_num < v_min)
             or (v_max is not null and new.value_num > v_max);

    when 'checkbox'::public.item_type then
      v_fail := v_item.required and coalesce(new.value_bool, false) = false;

    when 'select'::public.item_type then
      v_fail := exists (
        select 1 from jsonb_array_elements(coalesce(v_item.config->'options','[]'::jsonb)) o
        where o->>'value' = new.value_option and (o->>'is_fail')::boolean is true
      );

    else
      v_fail := false;
  end case;

  new.status := case when v_fail
                     then 'fail'::public.response_status
                     else 'ok'::public.response_status end;
  return new;
end;
$$;

create trigger trg_response_evaluate
  before insert on public.checklist_response
  for each row execute function restops.evaluate_response();

-- ------------------------------------------------------------
create or replace function restops.after_response_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_item       public.checklist_item_template%rowtype;
  v_point      public.temperature_point%rowtype;
  v_exc_id     uuid;
  v_reading_id uuid;
begin
  select * into v_item from public.checklist_item_template where id = new.item_template_id;

  if new.supersedes_id is not null then
    update public.checklist_response
       set superseded_at = now()
     where id = new.supersedes_id and superseded_at is null;
  end if;

  if v_item.type = 'temperature'::public.item_type
     and new.status <> 'na'::public.response_status then
    select * into v_point from public.temperature_point where id = v_item.temperature_point_id;
    insert into public.temperature_reading (
      organization_id, location_id, temperature_point_id, value_c,
      min_c_snapshot, max_c_snapshot, in_range, taken_at,
      recorded_by_membership_id, source, checklist_response_id, device_id
    ) values (
      new.organization_id, new.location_id, v_point.id, new.value_num,
      v_point.min_c, v_point.max_c, (new.status = 'ok'::public.response_status), new.answered_at,
      new.answered_by_membership_id, 'checklist'::public.reading_source, new.id, new.device_id
    ) returning id into v_reading_id;
  end if;

  if new.status = 'fail'::public.response_status then
    insert into public.exception (
      organization_id, location_id, source_type, run_id, response_id,
      item_template_id, temperature_point_id, temperature_reading_id, asset_id,
      severity, title, expected, actual, status,
      detected_at, detected_by_membership_id
    ) values (
      new.organization_id, new.location_id,
      case when v_item.type = 'temperature'::public.item_type
           then 'temperature'::public.exception_source
           else 'checklist_item'::public.exception_source end,
      new.run_id, new.id, v_item.id, v_item.temperature_point_id, v_reading_id, v_item.asset_id,
      v_item.criticality,
      v_item.label,
      case when v_item.type = 'temperature'::public.item_type
           then format('%s a %s C', new.item_snapshot->>'min_c', new.item_snapshot->>'max_c')
           when v_item.type = 'checkbox'::public.item_type then 'Tildado'
           else coalesce(v_item.config->>'min','') || ' - ' || coalesce(v_item.config->>'max','') end,
      coalesce(new.value_num::text, new.value_option, new.value_text, new.value_bool::text),
      'action_pending'::public.exception_status,
      new.answered_at, new.answered_by_membership_id
    ) returning id into v_exc_id;

    if v_reading_id is not null then
      update public.temperature_reading set exception_id = v_exc_id where id = v_reading_id;
    end if;
  end if;

  update public.checklist_run r
     set answered_items = sub.answered,
         failed_items   = sub.failed,
         completion_pct = case when r.total_items > 0
                               then round(sub.answered::numeric * 100 / r.total_items, 2)
                               else 0 end,
         exception_count = (select count(*) from public.exception e where e.run_id = r.id),
         status = case when r.status = 'pending'::public.run_status
                       then 'in_progress'::public.run_status
                       else r.status end,
         opened_at = coalesce(r.opened_at, now())
    from (
      select count(*) filter (where superseded_at is null) as answered,
             count(*) filter (where superseded_at is null
                              and status = 'fail'::public.response_status) as failed
      from public.checklist_response where run_id = new.run_id
    ) sub
   where r.id = new.run_id;

  return new;
end;
$$;

create trigger trg_response_after_insert
  after insert on public.checklist_response
  for each row execute function restops.after_response_insert();

-- ------------------------------------------------------------
create or replace function restops.guard_exception_resolution()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'resolved'::public.exception_status
     and old.status <> 'resolved'::public.exception_status then
    if not exists (select 1 from public.corrective_action ca where ca.exception_id = new.id) then
      raise exception 'No se puede resolver la excepcion sin al menos una accion correctiva';
    end if;
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;

  if new.status = 'verified'::public.exception_status
     and old.status <> 'verified'::public.exception_status then
    if new.verified_by_membership_id is null then
      raise exception 'La verificacion requiere identificar al verificador';
    end if;
    if new.verified_by_membership_id = new.detected_by_membership_id then
      raise exception 'Quien detecto la excepcion no puede verificarla';
    end if;
    new.verified_at := coalesce(new.verified_at, now());
  end if;

  return new;
end;
$$;

create trigger trg_exception_guard
  before update on public.exception
  for each row execute function restops.guard_exception_resolution();

create or replace function restops.after_corrective_action()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.exception
     set status = 'resolved'::public.exception_status, resolved_at = now()
   where id = new.exception_id
     and status in ('open'::public.exception_status, 'action_pending'::public.exception_status);
  return new;
end;
$$;

create trigger trg_corrective_after_insert
  after insert on public.corrective_action
  for each row execute function restops.after_corrective_action();

-- ------------------------------------------------------------
create or replace function restops.guard_published_template()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'published'::public.template_status
     and new.status = 'published'::public.template_status then
    if new.name is distinct from old.name
       or new.kind is distinct from old.kind
       or new.presence_required is distinct from old.presence_required
       or new.shift_template_id is distinct from old.shift_template_id then
      raise exception 'Una checklist publicada es inmutable. Cree una nueva version.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_template_immutable
  before update on public.checklist_template
  for each row execute function restops.guard_published_template();

create or replace function restops.guard_published_items()
returns trigger language plpgsql set search_path = '' as $$
declare v_status public.template_status;
begin
  select status into v_status from public.checklist_template
   where id = coalesce(new.checklist_template_id, old.checklist_template_id);
  if v_status = 'published'::public.template_status then
    raise exception 'No se pueden modificar los items de una checklist publicada. Cree una nueva version.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_items_immutable
  before insert or update or delete on public.checklist_item_template
  for each row execute function restops.guard_published_items();
