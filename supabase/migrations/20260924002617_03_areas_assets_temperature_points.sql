-- ============================================================
-- RestOps · 03 · Areas, activos y puntos de control de temperatura
-- ============================================================

create table public.area (
  id              uuid primary key default restops.uuid_v7(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  location_id     uuid references public.location(id) on delete cascade,  -- null = area plantilla de la org
  name            text not null check (length(trim(name)) between 2 and 80),
  order_index     int not null default 0,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index ix_area_org_loc on public.area(organization_id, location_id) where deleted_at is null;

create table public.asset (
  id              uuid primary key default restops.uuid_v7(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  location_id     uuid not null references public.location(id) on delete cascade,
  area_id         uuid references public.area(id) on delete set null,
  name            text not null check (length(trim(name)) between 2 and 120),
  code            text,
  category        text,
  brand           text,
  model           text,
  serial_number   text,
  purchased_on    date,
  warranty_until  date,
  status          entity_status not null default 'active',
  qr_token        text unique default encode(extensions.gen_random_bytes(12), 'hex'),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index uq_asset_org_code on public.asset(organization_id, code)
  where code is not null and deleted_at is null;
create index ix_asset_location on public.asset(organization_id, location_id) where deleted_at is null;
create trigger trg_asset_updated before update on public.asset
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Punto de control de temperatura
-- ------------------------------------------------------------
create table public.temperature_point (
  id                uuid primary key default restops.uuid_v7(),
  organization_id   uuid not null references public.organization(id) on delete cascade,
  location_id       uuid not null references public.location(id) on delete cascade,
  asset_id          uuid references public.asset(id) on delete set null,
  area_id           uuid references public.area(id) on delete set null,
  name              text not null check (length(trim(name)) between 2 and 120),
  kind              temp_point_kind not null,
  min_c             numeric(4,1) not null,
  max_c             numeric(4,1) not null,
  criticality       criticality_level not null default 'high',
  responsible_role  org_role,
  frequency_config  jsonb not null default '{}'::jsonb,
  active            boolean not null default true,
  order_index       int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint ck_temp_point_range check (min_c < max_c),
  constraint ck_temp_point_sane  check (min_c >= -60 and max_c <= 120)
);
create index ix_temp_point_location on public.temperature_point(organization_id, location_id)
  where deleted_at is null and active;
create trigger trg_temp_point_updated before update on public.temperature_point
  for each row execute function restops.set_updated_at();
