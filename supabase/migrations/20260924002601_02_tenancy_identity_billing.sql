-- ============================================================
-- RestOps · 02 · Tenancy, identidad y billing
-- ============================================================

-- Trigger generico de updated_at
create or replace function restops.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Organizacion (tenant raiz)
-- ------------------------------------------------------------
create table public.organization (
  id              uuid primary key default restops.uuid_v7(),
  name            text not null check (length(trim(name)) between 2 and 120),
  slug            citext not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  tax_id          text,
  country_code    char(2) not null default 'AR',
  locale          text not null default 'es-AR',
  default_timezone text not null default 'America/Argentina/Buenos_Aires',
  status          entity_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger trg_organization_updated before update on public.organization
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Planes y limites (tabla de referencia global, sin tenant)
-- ------------------------------------------------------------
create table public.plan_limit (
  plan                  plan_tier primary key,
  display_name          text not null,
  price_usd_month       numeric(8,2) not null,
  max_locations         int,                       -- null = ilimitado
  max_users             int,
  max_templates         int,
  history_days          int not null,
  photo_retention_days  int not null,
  monthly_photo_quota   int,
  features              jsonb not null default '{}'::jsonb
);

insert into public.plan_limit values
  ('free',      'Gratis',     0.00,    1,    5,    2,   30,   30,   100,
   '{"dashboard_consolidado":false,"api":false,"rol_auditor":false,"exportaciones":false,"whatsapp":false}'),
  ('local',     'Local',     25.00,    1, null, null,  365,  365,  null,
   '{"dashboard_consolidado":false,"api":false,"rol_auditor":false,"exportaciones":true,"whatsapp":false}'),
  ('chain',     'Cadena',    19.00, null, null, null,  730,  730,  null,
   '{"dashboard_consolidado":true,"api":true,"rol_auditor":true,"exportaciones":true,"whatsapp":true}'),
  ('enterprise','Enterprise', 0.00, null, null, null, 1825, 1825, null,
   '{"dashboard_consolidado":true,"api":true,"rol_auditor":true,"exportaciones":true,"whatsapp":true,"sso":true,"sla":true}');

create table public.subscription (
  id                  uuid primary key default restops.uuid_v7(),
  organization_id     uuid not null references public.organization(id) on delete cascade,
  plan                plan_tier not null default 'free' references public.plan_limit(plan),
  status              subscription_status not null default 'trialing',
  billing_cycle       billing_cycle not null default 'monthly',
  unit_price_usd      numeric(8,2) not null default 0,
  locations_included  int not null default 1,
  trial_ends_at       timestamptz,
  current_period_start timestamptz,
  current_period_end  timestamptz,
  provider            text,                        -- mercadopago | stripe | manual
  provider_ref        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index uq_subscription_org on public.subscription(organization_id);
create trigger trg_subscription_updated before update on public.subscription
  for each row execute function restops.set_updated_at();

create table public.usage_counter (
  organization_id   uuid not null references public.organization(id) on delete cascade,
  period            date not null,                 -- primer dia del mes
  active_locations  int not null default 0,
  active_users      int not null default 0,
  photos_uploaded   int not null default 0,
  storage_bytes     bigint not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (organization_id, period)
);

-- ------------------------------------------------------------
-- Local
-- ------------------------------------------------------------
create table public.location (
  id                  uuid primary key default restops.uuid_v7(),
  organization_id     uuid not null references public.organization(id) on delete cascade,
  name                text not null check (length(trim(name)) between 2 and 120),
  slug                citext not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$'),
  address             text,
  city                text,
  province            text,
  phone               text,
  lat                 numeric(10,7),
  lng                 numeric(10,7),
  geofence_radius_m   int not null default 150 check (geofence_radius_m between 20 and 2000),
  timezone            text not null default 'America/Argentina/Buenos_Aires',
  business_day_start  time not null default '06:00',
  status              entity_status not null default 'active',
  opened_on           date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create unique index uq_location_org_slug on public.location(organization_id, slug) where deleted_at is null;
create index ix_location_org on public.location(organization_id) where deleted_at is null;
create trigger trg_location_updated before update on public.location
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Perfil de usuario (1:1 con auth.users) — GLOBAL, multi-org
-- ------------------------------------------------------------
create table public.user_profile (
  id                      uuid primary key references auth.users(id) on delete cascade,
  full_name               text not null default '',
  phone                   text,
  avatar_key              text,
  locale                  text not null default 'es-AR',
  active_organization_id  uuid references public.organization(id) on delete set null,
  last_login_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_user_profile_updated before update on public.user_profile
  for each row execute function restops.set_updated_at();

-- Alta automatica del perfil al crear el usuario en auth
create or replace function restops.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profile (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function restops.handle_new_user();

-- ------------------------------------------------------------
-- Membresia: usuario <-> organizacion <-> rol
-- Un usuario puede pertenecer a N organizaciones.
-- ------------------------------------------------------------
create table public.membership (
  id                uuid primary key default restops.uuid_v7(),
  organization_id   uuid not null references public.organization(id) on delete cascade,
  user_id           uuid not null references public.user_profile(id) on delete cascade,
  role              org_role not null default 'employee',
  display_name      text not null default '',
  employee_code     text,
  pin_hash          text,                          -- bcrypt, solo para login kiosco
  pin_set_at        timestamptz,
  failed_pin_count  int not null default 0,
  locked_until      timestamptz,
  job_title         text,
  status            entity_status not null default 'active',
  invited_at        timestamptz,
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create unique index uq_membership_org_user on public.membership(organization_id, user_id) where deleted_at is null;
create unique index uq_membership_employee_code on public.membership(organization_id, employee_code)
  where employee_code is not null and deleted_at is null;
create index ix_membership_org_role on public.membership(organization_id, role) where deleted_at is null;
create index ix_membership_user on public.membership(user_id) where deleted_at is null;
create trigger trg_membership_updated before update on public.membership
  for each row execute function restops.set_updated_at();

-- Alcance de locales por membresia (owner/gm ven toda la org)
create table public.membership_location (
  membership_id   uuid not null references public.membership(id) on delete cascade,
  location_id     uuid not null references public.location(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  is_primary      boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (membership_id, location_id)
);
create index ix_membership_location_loc on public.membership_location(location_id);

-- ------------------------------------------------------------
-- Dispositivo registrado (tablet de cocina, modo kiosco)
-- ------------------------------------------------------------
create table public.device (
  id                uuid primary key default restops.uuid_v7(),
  organization_id   uuid not null references public.organization(id) on delete cascade,
  location_id       uuid not null references public.location(id) on delete cascade,
  name              text not null,
  token_hash        text not null unique,
  platform          text,
  last_seen_at      timestamptz,
  enrolled_by       uuid references public.membership(id) on delete set null,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);
create index ix_device_location on public.device(location_id) where revoked_at is null;
