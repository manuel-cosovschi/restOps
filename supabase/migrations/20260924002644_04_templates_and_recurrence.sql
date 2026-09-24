-- ============================================================
-- RestOps · 04 · Templates de turno / checklist y recurrencia
-- ============================================================

create table public.shift_template (
  id              uuid primary key default restops.uuid_v7(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  location_id     uuid references public.location(id) on delete cascade,  -- null = aplica a toda la org
  name            text not null,
  kind            shift_kind not null,
  start_time      time not null,
  end_time        time not null,
  days_of_week    smallint[] not null default '{1,2,3,4,5,6,7}',          -- ISO: 1=lunes
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint ck_shift_days check (
    array_length(days_of_week,1) between 1 and 7
    and days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[]
  )
);
create index ix_shift_template_org on public.shift_template(organization_id, location_id) where deleted_at is null;
create trigger trg_shift_template_updated before update on public.shift_template
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Checklist template. Versionada e INMUTABLE una vez publicada.
-- Editar una publicada crea version N+1 con el mismo parent.
-- ------------------------------------------------------------
create table public.checklist_template (
  id                  uuid primary key default restops.uuid_v7(),
  organization_id     uuid not null references public.organization(id) on delete cascade,
  location_id         uuid references public.location(id) on delete cascade,
  shift_template_id   uuid references public.shift_template(id) on delete set null,
  parent_template_id  uuid references public.checklist_template(id) on delete cascade,
  name                text not null check (length(trim(name)) between 2 and 140),
  description         text,
  kind                shift_kind not null default 'control',
  version             int not null default 1 check (version >= 1),
  status              template_status not null default 'draft',
  presence_required   presence_mode not null default 'none',
  estimated_minutes   int,
  published_at        timestamptz,
  published_by        uuid references public.membership(id) on delete set null,
  created_by          uuid references public.membership(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  constraint ck_template_published check (
    (status = 'published' and published_at is not null) or status <> 'published'
  )
);
-- Raiz de la familia de versiones: si parent es null, la raiz es el propio id
create unique index uq_checklist_template_version
  on public.checklist_template(coalesce(parent_template_id, id), version);
create index ix_checklist_template_org
  on public.checklist_template(organization_id, location_id, status) where deleted_at is null;
create trigger trg_checklist_template_updated before update on public.checklist_template
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Item de checklist
-- config JSONB segun type:
--   number      {"min":0,"max":100,"unit":"kg","decimals":1}
--   temperature {"min_c":0,"max_c":5}  (o hereda del temperature_point)
--   select      {"options":[{"value":"ok","label":"OK","is_fail":false}]}
--   text        {"max_length":500,"multiline":true}
--   photo       {"min_photos":1,"max_photos":3}
-- ------------------------------------------------------------
create table public.checklist_item_template (
  id                    uuid primary key default restops.uuid_v7(),
  organization_id       uuid not null references public.organization(id) on delete cascade,
  checklist_template_id uuid not null references public.checklist_template(id) on delete cascade,
  section               text not null default 'General',
  order_index           int not null default 0,
  label                 text not null check (length(trim(label)) between 2 and 200),
  type                  item_type not null,
  required              boolean not null default true,
  criticality           criticality_level not null default 'medium',
  instructions          text,
  reference_image_key   text,
  photo_required        boolean not null default false,
  config                jsonb not null default '{}'::jsonb,
  default_role          org_role,
  temperature_point_id  uuid references public.temperature_point(id) on delete set null,
  asset_id              uuid references public.asset(id) on delete set null,
  due_offset_min        int,                     -- minutos desde el inicio del turno
  tolerance_min         int not null default 30,
  created_at            timestamptz not null default now(),
  constraint ck_item_temp_point check (
    (type = 'temperature' and temperature_point_id is not null)
    or type <> 'temperature'
  )
);
create index ix_item_template_parent
  on public.checklist_item_template(checklist_template_id, section, order_index);
create unique index uq_item_template_order
  on public.checklist_item_template(checklist_template_id, section, order_index);

-- ------------------------------------------------------------
-- Regla de recurrencia
-- ------------------------------------------------------------
create table public.recurrence_rule (
  id                    uuid primary key default restops.uuid_v7(),
  organization_id       uuid not null references public.organization(id) on delete cascade,
  checklist_template_id uuid not null references public.checklist_template(id) on delete cascade,
  location_id           uuid references public.location(id) on delete cascade, -- null = todos los locales
  freq                  recurrence_freq not null,
  by_weekday            smallint[],              -- ISO 1..7
  by_monthday           smallint[],              -- 1..31, -1 = ultimo dia
  at_times              time[] not null default '{}',
  tolerance_min         int not null default 60 check (tolerance_min between 5 and 1440),
  starts_on             date not null default current_date,
  ends_on               date,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint ck_recurrence_weekday check (by_weekday is null or by_weekday <@ '{1,2,3,4,5,6,7}'::smallint[]),
  constraint ck_recurrence_window  check (ends_on is null or ends_on >= starts_on)
);
create index ix_recurrence_active
  on public.recurrence_rule(organization_id, active, starts_on) where active;
create trigger trg_recurrence_updated before update on public.recurrence_rule
  for each row execute function restops.set_updated_at();
