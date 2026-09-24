-- ============================================================
-- RestOps · 05 · Ejecucion: runs y respuestas (append-only)
-- ============================================================

create table public.checklist_run (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid not null references public.location(id) on delete cascade,
  checklist_template_id     uuid not null references public.checklist_template(id) on delete restrict,
  template_version          int not null,
  shift_template_id         uuid references public.shift_template(id) on delete set null,
  business_date             date not null,
  scheduled_for             timestamptz not null,
  due_at                    timestamptz not null,
  opened_at                 timestamptz,
  closed_at                 timestamptz,
  status                    run_status not null default 'pending',
  assigned_membership_id    uuid references public.membership(id) on delete set null,
  completed_by_membership_id uuid references public.membership(id) on delete set null,
  total_items               int not null default 0,
  answered_items            int not null default 0,
  failed_items              int not null default 0,
  completion_pct            numeric(5,2) not null default 0,
  exception_count           int not null default 0,
  na_reason                 text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint ck_run_due_after_scheduled check (due_at >= scheduled_for)
);
-- Idempotencia del generador nocturno
create unique index uq_run_slot
  on public.checklist_run(location_id, checklist_template_id, scheduled_for);
-- Dashboard "que necesita mi atencion hoy"
create index ix_run_org_date   on public.checklist_run(organization_id, business_date desc, location_id);
create index ix_run_sweeper    on public.checklist_run(status, due_at) where status in ('pending','in_progress');
create index ix_run_loc_status on public.checklist_run(organization_id, location_id, status, business_date desc);
create trigger trg_run_updated before update on public.checklist_run
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Respuesta. APPEND-ONLY: una correccion crea fila nueva con
-- supersedes_id y marca la anterior con superseded_at.
-- item_snapshot congela label + config al momento de responder.
-- ------------------------------------------------------------
create table public.checklist_response (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid not null references public.location(id) on delete cascade,
  run_id                    uuid not null references public.checklist_run(id) on delete cascade,
  item_template_id          uuid not null references public.checklist_item_template(id) on delete restrict,
  item_snapshot             jsonb not null,
  value_bool                boolean,
  value_text                text,
  value_num                 numeric(12,3),
  value_option              text,
  status                    response_status not null default 'ok',
  note                      text,
  answered_by_membership_id uuid not null references public.membership(id) on delete restrict,
  answered_at               timestamptz not null default now(),
  device_id                 uuid references public.device(id) on delete set null,
  captured_lat              numeric(10,7),
  captured_lng              numeric(10,7),
  captured_accuracy_m       numeric(8,2),
  presence_verified         boolean not null default false,
  supersedes_id             uuid references public.checklist_response(id) on delete set null,
  superseded_at             timestamptz,
  correction_reason         text,
  client_uuid               uuid not null,
  created_at                timestamptz not null default now(),
  constraint ck_response_correction check (
    supersedes_id is null
    or (correction_reason is not null and length(trim(correction_reason)) >= 5)
  )
);
-- Idempotencia de la cola offline: reintentar el mismo POST no duplica
create unique index uq_response_client on public.checklist_response(run_id, client_uuid);
-- Una sola respuesta vigente por item
create unique index uq_response_active
  on public.checklist_response(run_id, item_template_id) where superseded_at is null;
create index ix_response_run      on public.checklist_response(run_id) where superseded_at is null;
create index ix_response_org_date on public.checklist_response(organization_id, answered_at desc);
