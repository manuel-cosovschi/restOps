-- ============================================================
-- RestOps · 08 · Notificaciones y auditoria
-- ============================================================

create table public.notification (
  id                      uuid primary key default restops.uuid_v7(),
  organization_id         uuid not null references public.organization(id) on delete cascade,
  location_id             uuid references public.location(id) on delete cascade,
  recipient_membership_id uuid not null references public.membership(id) on delete cascade,
  type                    text not null,            -- temperature_out_of_range | run_overdue | incident_critical | ...
  channel                 notif_channel not null,
  title                   text not null,
  body                    text not null,
  payload                 jsonb not null default '{}'::jsonb,
  entity_type             linked_entity,
  entity_id               uuid,
  status                  notif_status not null default 'pending',
  scheduled_for           timestamptz not null default now(),
  sent_at                 timestamptz,
  read_at                 timestamptz,
  attempts                int not null default 0,
  provider_message_id     text,
  error                   text,
  dedupe_key              text,
  created_at              timestamptz not null default now()
);
-- Evita spamear la misma alerta: una por clave logica
create unique index uq_notification_dedupe
  on public.notification(recipient_membership_id, dedupe_key)
  where dedupe_key is not null;
create index ix_notification_outbox
  on public.notification(status, scheduled_for) where status = 'pending';
create index ix_notification_inbox
  on public.notification(recipient_membership_id, created_at desc) where status <> 'canceled';

create table public.notification_preference (
  membership_id   uuid not null references public.membership(id) on delete cascade,
  type            text not null,
  channels        notif_channel[] not null default '{inapp,push}',
  quiet_hours     jsonb not null default '{}'::jsonb,  -- {"from":"23:00","to":"07:00"}
  enabled         boolean not null default true,
  primary key (membership_id, type)
);

create table public.push_subscription (
  id            uuid primary key default restops.uuid_v7(),
  membership_id uuid not null references public.membership(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index ix_push_membership on public.push_subscription(membership_id);

-- ------------------------------------------------------------
-- Audit log. APPEND-ONLY. Se revocan UPDATE/DELETE mas abajo.
-- ------------------------------------------------------------
create table public.audit_log (
  id                  bigint generated always as identity primary key,
  organization_id     uuid not null references public.organization(id) on delete cascade,
  location_id         uuid,
  actor_membership_id uuid references public.membership(id) on delete set null,
  actor_user_id       uuid,
  actor_type          actor_type not null default 'user',
  action              text not null,               -- create | update | delete | status_change | login | export
  entity_type         text not null,
  entity_id           uuid,
  before              jsonb,
  after               jsonb,
  ip                  inet,
  user_agent          text,
  request_id          text,
  created_at          timestamptz not null default now()
);
create index ix_audit_entity
  on public.audit_log(organization_id, entity_type, entity_id, created_at desc);
create index ix_audit_org_time on public.audit_log(organization_id, created_at desc);
create index ix_audit_actor
  on public.audit_log(actor_membership_id, created_at desc) where actor_membership_id is not null;
