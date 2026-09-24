-- ============================================================
-- RestOps · 06 · Excepciones, acciones correctivas y temperaturas
-- Columna vertebral: todo lo que falla entra por aca.
-- ============================================================

create table public.exception (
  id                      uuid primary key default restops.uuid_v7(),
  organization_id         uuid not null references public.organization(id) on delete cascade,
  location_id             uuid not null references public.location(id) on delete cascade,
  source_type             exception_source not null,
  run_id                  uuid references public.checklist_run(id) on delete cascade,
  response_id             uuid references public.checklist_response(id) on delete cascade,
  item_template_id        uuid references public.checklist_item_template(id) on delete set null,
  temperature_point_id    uuid references public.temperature_point(id) on delete set null,
  temperature_reading_id  uuid,                    -- FK agregada mas abajo (dependencia circular)
  incident_id             uuid,                    -- FK agregada en migracion 07
  asset_id                uuid references public.asset(id) on delete set null,
  severity                criticality_level not null default 'medium',
  title                   text not null,
  detail                  text,
  expected                text,
  actual                  text,
  status                  exception_status not null default 'open',
  detected_at             timestamptz not null default now(),
  detected_by_membership_id uuid references public.membership(id) on delete set null,
  resolved_at             timestamptz,
  verified_at             timestamptz,
  verified_by_membership_id uuid references public.membership(id) on delete set null,
  dismissed_reason        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ck_exception_dismiss check (
    status <> 'dismissed' or (dismissed_reason is not null and length(trim(dismissed_reason)) >= 5)
  )
);
create index ix_exception_attention
  on public.exception(organization_id, status, severity, detected_at desc)
  where status in ('open','action_pending');
create index ix_exception_location on public.exception(organization_id, location_id, detected_at desc);
create index ix_exception_point    on public.exception(temperature_point_id, detected_at desc);
create index ix_exception_run      on public.exception(run_id);
create trigger trg_exception_updated before update on public.exception
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Accion correctiva. Sin al menos una, la excepcion no se resuelve.
-- ------------------------------------------------------------
create table public.corrective_action (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid not null references public.location(id) on delete cascade,
  exception_id              uuid not null references public.exception(id) on delete cascade,
  description               text not null check (length(trim(description)) >= 5),
  performed_by_membership_id uuid not null references public.membership(id) on delete restrict,
  performed_at              timestamptz not null default now(),
  requires_verification     boolean not null default true,
  verified_by_membership_id uuid references public.membership(id) on delete set null,
  verified_at               timestamptz,
  created_at                timestamptz not null default now()
);
create index ix_corrective_exception on public.corrective_action(exception_id);
create index ix_corrective_pending
  on public.corrective_action(organization_id, requires_verification, performed_at desc)
  where verified_at is null;

-- ------------------------------------------------------------
-- Lectura de temperatura. Snapshotea el rango vigente:
-- si manana cambian el rango, el historico sigue siendo verdadero.
-- ------------------------------------------------------------
create table public.temperature_reading (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid not null references public.location(id) on delete cascade,
  temperature_point_id      uuid not null references public.temperature_point(id) on delete restrict,
  value_c                   numeric(5,2) not null check (value_c between -80 and 200),
  min_c_snapshot            numeric(4,1) not null,
  max_c_snapshot            numeric(4,1) not null,
  in_range                  boolean not null,
  taken_at                  timestamptz not null default now(),
  recorded_by_membership_id uuid not null references public.membership(id) on delete restrict,
  source                    reading_source not null default 'checklist',
  checklist_response_id     uuid references public.checklist_response(id) on delete set null,
  exception_id              uuid references public.exception(id) on delete set null,
  device_id                 uuid references public.device(id) on delete set null,
  note                      text,
  client_uuid               uuid not null default restops.uuid_v7(),
  created_at                timestamptz not null default now()
);
create unique index uq_reading_client on public.temperature_reading(temperature_point_id, client_uuid);
create index ix_reading_point_time
  on public.temperature_reading(organization_id, temperature_point_id, taken_at desc);
create index ix_reading_out_of_range
  on public.temperature_reading(organization_id, location_id, taken_at desc) where not in_range;

-- Cierre de la dependencia circular
alter table public.exception
  add constraint fk_exception_reading
  foreign key (temperature_reading_id) references public.temperature_reading(id) on delete set null;
