-- ============================================================
-- RestOps · 10 · Row Level Security
-- Regla: ninguna fila sale sin organization_id = claim del JWT.
-- ============================================================

-- Helper sin recursion para ver perfiles de companeros de organizacion
create or replace function restops.shares_org_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membership m
    where m.user_id = p_user_id
      and m.organization_id = restops.current_org_id()
      and m.deleted_at is null
  );
$$;
grant execute on function restops.shares_org_with(uuid) to authenticated;

-- Habilitar RLS en todo
do $$
declare t text;
begin
  foreach t in array array[
    'organization','plan_limit','subscription','usage_counter','location','user_profile',
    'membership','membership_location','device','area','asset','temperature_point',
    'shift_template','checklist_template','checklist_item_template','recurrence_rule',
    'checklist_run','checklist_response','exception','corrective_action','temperature_reading',
    'incident','comment','attachment','shift_handoff','document',
    'notification','notification_preference','push_subscription','audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Organizacion / planes / billing
-- ------------------------------------------------------------
create policy org_select on public.organization for select to authenticated
  using (id = (select restops.current_org_id()) and deleted_at is null);
create policy org_update on public.organization for update to authenticated
  using (id = (select restops.current_org_id()) and (select restops.has_role('owner')))
  with check (id = (select restops.current_org_id()));

create policy plan_limit_select on public.plan_limit for select to authenticated using (true);

create policy subscription_select on public.subscription for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and (select restops.has_role('owner','gm')));

create policy usage_select on public.usage_counter for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and (select restops.has_role('owner','gm')));

-- ------------------------------------------------------------
-- Locales
-- ------------------------------------------------------------
create policy location_select on public.location for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and deleted_at is null
         and restops.can_access_location(id));
create policy location_insert on public.location for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and (select restops.has_role('owner','gm')));
create policy location_update on public.location for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and (select restops.has_role('owner','gm')))
  with check (organization_id = (select restops.current_org_id()));

-- ------------------------------------------------------------
-- Perfiles y membresias
-- ------------------------------------------------------------
create policy profile_select on public.user_profile for select to authenticated
  using (id = (select auth.uid()) or restops.shares_org_with(id));
create policy profile_update on public.user_profile for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy membership_select on public.membership for select to authenticated
  using (organization_id = (select restops.current_org_id()) and deleted_at is null);
create policy membership_write on public.membership for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and (select restops.can_manage()));
create policy membership_update on public.membership for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and ((select restops.can_manage()) or id = (select restops.current_membership_id())))
  with check (organization_id = (select restops.current_org_id()));

create policy memloc_select on public.membership_location for select to authenticated
  using (organization_id = (select restops.current_org_id()));
create policy memloc_write on public.membership_location for all to authenticated
  using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));

create policy device_select on public.device for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy device_write on public.device for all to authenticated
  using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));

-- ------------------------------------------------------------
-- Configuracion por local: areas, activos, puntos de temperatura
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['area','asset','temperature_point'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (organization_id = (select restops.current_org_id())
               and deleted_at is null
               and (location_id is null or restops.can_access_location(location_id)));
      create policy %1$s_write on public.%1$s for all to authenticated
        using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
        with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Templates: lectura para todos en el local, escritura solo gestion
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['shift_template','checklist_template'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (organization_id = (select restops.current_org_id())
               and deleted_at is null
               and (location_id is null or restops.can_access_location(location_id)));
      create policy %1$s_write on public.%1$s for all to authenticated
        using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
        with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));
    $f$, t);
  end loop;
end $$;

create policy item_template_select on public.checklist_item_template for select to authenticated
  using (organization_id = (select restops.current_org_id()));
create policy item_template_write on public.checklist_item_template for all to authenticated
  using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));

create policy recurrence_select on public.recurrence_rule for select to authenticated
  using (organization_id = (select restops.current_org_id()));
create policy recurrence_write on public.recurrence_rule for all to authenticated
  using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));

-- ------------------------------------------------------------
-- Ejecucion
-- ------------------------------------------------------------
create policy run_select on public.checklist_run for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy run_insert on public.checklist_run for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and (select restops.can_manage())
              and restops.can_access_location(location_id));
create policy run_update on public.checklist_run for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id)
         and not (select restops.is_read_only()))
  with check (organization_id = (select restops.current_org_id()));

-- APPEND-ONLY: sin update ni delete desde el cliente
create policy response_select on public.checklist_response for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy response_insert on public.checklist_response for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only())
              and answered_by_membership_id = (select restops.current_membership_id()));

-- ------------------------------------------------------------
-- Excepciones y acciones correctivas
-- ------------------------------------------------------------
create policy exception_select on public.exception for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy exception_insert on public.exception for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only()));
create policy exception_update on public.exception for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id)
         and not (select restops.is_read_only()))
  with check (organization_id = (select restops.current_org_id()));

create policy corrective_select on public.corrective_action for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy corrective_insert on public.corrective_action for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only())
              and performed_by_membership_id = (select restops.current_membership_id()));
create policy corrective_update on public.corrective_action for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()));

-- Temperaturas: append-only
create policy reading_select on public.temperature_reading for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy reading_insert on public.temperature_reading for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only())
              and recorded_by_membership_id = (select restops.current_membership_id()));

-- ------------------------------------------------------------
-- Incidencias
-- ------------------------------------------------------------
create policy incident_select on public.incident for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy incident_insert on public.incident for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only())
              and reported_by_membership_id = (select restops.current_membership_id()));
create policy incident_update on public.incident for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id)
         and not (select restops.is_read_only()))
  with check (organization_id = (select restops.current_org_id()));

-- ------------------------------------------------------------
-- Comentarios, adjuntos, handoff, documentos
-- ------------------------------------------------------------
create policy comment_select on public.comment for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and deleted_at is null
         and (location_id is null or restops.can_access_location(location_id)));
create policy comment_insert on public.comment for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and not (select restops.is_read_only())
              and membership_id = (select restops.current_membership_id()));
create policy comment_update on public.comment for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and membership_id = (select restops.current_membership_id()))
  with check (organization_id = (select restops.current_org_id()));

create policy attachment_select on public.attachment for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and (location_id is null or restops.can_access_location(location_id)));
create policy attachment_insert on public.attachment for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and not (select restops.is_read_only())
              and uploaded_by_membership_id = (select restops.current_membership_id()));

create policy handoff_select on public.shift_handoff for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id));
create policy handoff_insert on public.shift_handoff for insert to authenticated
  with check (organization_id = (select restops.current_org_id())
              and restops.can_access_location(location_id)
              and not (select restops.is_read_only())
              and from_membership_id = (select restops.current_membership_id()));
create policy handoff_update on public.shift_handoff for update to authenticated
  using (organization_id = (select restops.current_org_id())
         and restops.can_access_location(location_id)
         and not (select restops.is_read_only()))
  with check (organization_id = (select restops.current_org_id()));

create policy document_select on public.document for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and (location_id is null or restops.can_access_location(location_id)));
create policy document_write on public.document for all to authenticated
  using (organization_id = (select restops.current_org_id()) and (select restops.can_manage()))
  with check (organization_id = (select restops.current_org_id()) and (select restops.can_manage()));

-- ------------------------------------------------------------
-- Notificaciones: cada uno ve solo las suyas
-- ------------------------------------------------------------
create policy notification_select on public.notification for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and recipient_membership_id = (select restops.current_membership_id()));
create policy notification_update on public.notification for update to authenticated
  using (recipient_membership_id = (select restops.current_membership_id()))
  with check (recipient_membership_id = (select restops.current_membership_id()));

create policy notifpref_all on public.notification_preference for all to authenticated
  using (membership_id = (select restops.current_membership_id()))
  with check (membership_id = (select restops.current_membership_id()));

create policy push_all on public.push_subscription for all to authenticated
  using (membership_id = (select restops.current_membership_id()))
  with check (membership_id = (select restops.current_membership_id()));

-- ------------------------------------------------------------
-- Audit log: solo lectura, y solo para quien audita
-- ------------------------------------------------------------
create policy audit_select on public.audit_log for select to authenticated
  using (organization_id = (select restops.current_org_id())
         and (select restops.has_role('owner','gm','auditor')));

revoke insert, update, delete on public.audit_log from authenticated, anon;
