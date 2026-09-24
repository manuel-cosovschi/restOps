-- ============================================================
-- RestOps · 13 · Generador de runs, sweeper de vencidos y cron
-- ============================================================

create extension if not exists pg_cron;

-- Version publicada mas reciente de la familia de un template
create or replace function restops.latest_published_template(p_template_id uuid)
returns public.checklist_template
language sql stable security definer set search_path = '' as $$
  select ct.*
    from public.checklist_template ct
   where coalesce(ct.parent_template_id, ct.id) = (
           select coalesce(parent_template_id, id)
             from public.checklist_template where id = p_template_id
         )
     and ct.status = 'published'::public.template_status
     and ct.deleted_at is null
   order by ct.version desc
   limit 1;
$$;

-- ------------------------------------------------------------
-- Materializa los runs de la ventana proxima (default 48h).
-- Idempotente: uq_run_slot evita duplicados si corre dos veces.
-- ------------------------------------------------------------
create or replace function restops.generate_runs(p_horizon_hours int default 48)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  r_rule     record;
  r_loc      public.location%rowtype;
  v_tpl      public.checklist_template%rowtype;
  v_date     date;
  v_time     time;
  v_dow      smallint;
  v_sched    timestamptz;
  v_bizdate  date;
  v_items    int;
  v_created  int := 0;
  v_days     int;
begin
  v_days := ceil(p_horizon_hours / 24.0)::int + 1;

  for r_rule in
    select rr.* from public.recurrence_rule rr
     where rr.active
       and rr.starts_on <= current_date + v_days
       and (rr.ends_on is null or rr.ends_on >= current_date)
  loop
    v_tpl := restops.latest_published_template(r_rule.checklist_template_id);
    continue when v_tpl.id is null;

    select count(*) into v_items
      from public.checklist_item_template
     where checklist_template_id = v_tpl.id;
    continue when v_items = 0;

    for r_loc in
      select l.* from public.location l
       where l.organization_id = r_rule.organization_id
         and l.status = 'active'::public.entity_status
         and l.deleted_at is null
         and (r_rule.location_id is null or l.id = r_rule.location_id)
         and (v_tpl.location_id is null or l.id = v_tpl.location_id)
    loop
      for i in 0 .. v_days loop
        v_date := current_date + i;
        continue when v_date < r_rule.starts_on;
        continue when r_rule.ends_on is not null and v_date > r_rule.ends_on;

        v_dow := extract(isodow from v_date)::smallint;

        -- Filtro de frecuencia
        if r_rule.freq = 'weekly'::public.recurrence_freq
           or r_rule.freq = 'custom'::public.recurrence_freq then
          continue when r_rule.by_weekday is null or not (v_dow = any(r_rule.by_weekday));
        elsif r_rule.freq = 'monthly'::public.recurrence_freq then
          continue when r_rule.by_monthday is null
            or not (extract(day from v_date)::smallint = any(r_rule.by_monthday));
        end if;

        foreach v_time in array r_rule.at_times loop
          v_sched   := (v_date + v_time) at time zone r_loc.timezone;
          continue when v_sched > now() + make_interval(hours => p_horizon_hours);

          v_bizdate := case when v_time < r_loc.business_day_start
                            then v_date - 1 else v_date end;

          insert into public.checklist_run (
            organization_id, location_id, checklist_template_id, template_version,
            shift_template_id, business_date, scheduled_for, due_at, total_items
          ) values (
            r_rule.organization_id, r_loc.id, v_tpl.id, v_tpl.version,
            v_tpl.shift_template_id, v_bizdate, v_sched,
            v_sched + make_interval(mins => r_rule.tolerance_min), v_items
          )
          on conflict (location_id, checklist_template_id, scheduled_for) do nothing;

          if found then v_created := v_created + 1; end if;
        end loop;
      end loop;
    end loop;
  end loop;

  return v_created;
end;
$$;

-- ------------------------------------------------------------
-- Marca vencidos, abre excepcion y encola notificacion
-- ------------------------------------------------------------
create or replace function restops.sweep_overdue_runs()
returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select cr.*, l.name as location_name, ct.name as template_name
      from public.checklist_run cr
      join public.location l on l.id = cr.location_id
      join public.checklist_template ct on ct.id = cr.checklist_template_id
     where cr.status in ('pending'::public.run_status, 'in_progress'::public.run_status)
       and cr.due_at < now()
     limit 5000
  loop
    update public.checklist_run
       set status = 'overdue'::public.run_status
     where id = r.id;

    insert into public.exception (
      organization_id, location_id, source_type, run_id,
      severity, title, expected, actual, status, detected_at
    ) values (
      r.organization_id, r.location_id, 'overdue_run'::public.exception_source, r.id,
      case when r.answered_items = 0 then 'high'::public.criticality_level
           else 'medium'::public.criticality_level end,
      format('Checklist vencida: %s', r.template_name),
      format('Completar antes de %s', to_char(r.due_at, 'DD/MM HH24:MI')),
      format('%s de %s items', r.answered_items, r.total_items),
      'open'::public.exception_status,
      now()
    );

    -- Notificar a encargados, GM y owner del local
    insert into public.notification (
      organization_id, location_id, recipient_membership_id, type, channel,
      title, body, entity_type, entity_id, dedupe_key
    )
    select distinct r.organization_id, r.location_id, m.id, 'run_overdue', 'push'::public.notif_channel,
           format('%s: checklist vencida', r.location_name),
           format('%s tiene %s tareas sin completar.', r.template_name, r.total_items - r.answered_items),
           'checklist_run'::public.linked_entity, r.id,
           'run_overdue:' || r.id::text
      from public.membership m
      left join public.membership_location ml on ml.membership_id = m.id
     where m.organization_id = r.organization_id
       and m.status = 'active'::public.entity_status
       and m.deleted_at is null
       and (
         m.role in ('owner'::public.org_role, 'gm'::public.org_role)
         or (m.role = 'manager'::public.org_role and ml.location_id = r.location_id)
       )
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Marca documentos vencidos (alertas en v1.1)
create or replace function restops.expire_documents()
returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  update public.document
     set status = 'expired'::public.document_status
   where status = 'active'::public.document_status
     and expires_on is not null
     and expires_on < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- Agenda
-- ------------------------------------------------------------
select cron.schedule('restops-generate-runs', '0 3 * * *',  $$ select restops.generate_runs(48) $$);
select cron.schedule('restops-sweep-overdue', '*/10 * * * *', $$ select restops.sweep_overdue_runs() $$);
select cron.schedule('restops-expire-docs',   '30 4 * * *',   $$ select restops.expire_documents() $$);
