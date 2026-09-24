-- ============================================================
-- RestOps · 07 · Incidencias, comentarios, adjuntos, handoff, documentos
-- ============================================================

create table public.incident (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid not null references public.location(id) on delete cascade,
  area_id                   uuid references public.area(id) on delete set null,
  asset_id                  uuid references public.asset(id) on delete set null,
  code                      text,
  category                  incident_category not null,
  title                     text not null check (length(trim(title)) between 3 and 160),
  description               text,
  priority                  criticality_level not null default 'medium',
  status                    incident_status not null default 'new',
  reported_by_membership_id uuid not null references public.membership(id) on delete restrict,
  assigned_to_membership_id uuid references public.membership(id) on delete set null,
  vendor_name               text,
  vendor_contact            text,
  due_at                    timestamptz,
  first_response_at         timestamptz,
  resolved_at               timestamptz,
  verified_at               timestamptz,
  verified_by_membership_id uuid references public.membership(id) on delete set null,
  closed_at                 timestamptz,
  cost_amount               numeric(12,2),
  cost_currency             char(3) default 'ARS',
  downtime_minutes          int,
  resolution_note           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index ix_incident_board
  on public.incident(organization_id, location_id, status, priority, created_at desc);
create index ix_incident_open
  on public.incident(organization_id, priority, created_at)
  where status not in ('resolved','verified','closed');
create index ix_incident_assignee
  on public.incident(assigned_to_membership_id, status) where assigned_to_membership_id is not null;
create index ix_incident_asset on public.incident(asset_id) where asset_id is not null;
create trigger trg_incident_updated before update on public.incident
  for each row execute function restops.set_updated_at();

-- Cierre del FK pendiente de la migracion 06
alter table public.exception
  add constraint fk_exception_incident
  foreign key (incident_id) references public.incident(id) on delete set null;

-- ------------------------------------------------------------
-- Comentario polimorfico
-- ------------------------------------------------------------
create table public.comment (
  id              uuid primary key default restops.uuid_v7(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  location_id     uuid references public.location(id) on delete cascade,
  entity_type     linked_entity not null,
  entity_id       uuid not null,
  membership_id   uuid not null references public.membership(id) on delete restrict,
  body            text not null check (length(trim(body)) >= 1),
  is_internal     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index ix_comment_entity
  on public.comment(organization_id, entity_type, entity_id, created_at) where deleted_at is null;
create trigger trg_comment_updated before update on public.comment
  for each row execute function restops.set_updated_at();

-- ------------------------------------------------------------
-- Adjunto polimorfico. El archivo vive en Storage; aca la metadata.
-- ------------------------------------------------------------
create table public.attachment (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid references public.location(id) on delete cascade,
  entity_type               linked_entity not null,
  entity_id                 uuid not null,
  kind                      attachment_kind not null default 'evidence',
  storage_bucket            text not null default 'restops-evidence',
  storage_key               text not null,
  mime_type                 text not null,
  size_bytes                bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  width                     int,
  height                    int,
  uploaded_by_membership_id uuid not null references public.membership(id) on delete restrict,
  captured_at               timestamptz,
  expires_on                date,                  -- retencion segun plan
  created_at                timestamptz not null default now()
);
create unique index uq_attachment_key on public.attachment(storage_bucket, storage_key);
create index ix_attachment_entity on public.attachment(organization_id, entity_type, entity_id);
create index ix_attachment_retention on public.attachment(expires_on) where expires_on is not null;

-- ------------------------------------------------------------
-- Libro de turno
-- ------------------------------------------------------------
create table public.shift_handoff (
  id                    uuid primary key default restops.uuid_v7(),
  organization_id       uuid not null references public.organization(id) on delete cascade,
  location_id           uuid not null references public.location(id) on delete cascade,
  business_date         date not null,
  shift_template_id     uuid references public.shift_template(id) on delete set null,
  from_membership_id    uuid not null references public.membership(id) on delete restrict,
  to_membership_id      uuid references public.membership(id) on delete set null,
  shortages             text,
  issues                text,
  critical_stock        text,
  events_note           text,
  absent_staff          text,
  pending_tasks         text,
  open_incident_ids     uuid[] not null default '{}',
  submitted_at          timestamptz not null default now(),
  ack_at                timestamptz,
  ack_by_membership_id  uuid references public.membership(id) on delete set null,
  created_at            timestamptz not null default now()
);
create index ix_handoff_location
  on public.shift_handoff(organization_id, location_id, business_date desc);
create index ix_handoff_unacked
  on public.shift_handoff(location_id, submitted_at desc) where ack_at is null;

-- ------------------------------------------------------------
-- Documentos y vencimientos (tablas v1, UI en v1.1)
-- ------------------------------------------------------------
create table public.document (
  id                        uuid primary key default restops.uuid_v7(),
  organization_id           uuid not null references public.organization(id) on delete cascade,
  location_id               uuid references public.location(id) on delete cascade,
  membership_id             uuid references public.membership(id) on delete cascade,
  type                      document_type not null,
  title                     text not null,
  issuer                    text,
  issued_on                 date,
  expires_on                date,
  storage_bucket            text not null default 'restops-documents',
  storage_key               text,
  responsible_membership_id uuid references public.membership(id) on delete set null,
  status                    document_status not null default 'active',
  alert_offsets_days        smallint[] not null default '{30,15,7,1}',
  last_alert_offset         smallint,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index ix_document_expiry
  on public.document(organization_id, expires_on)
  where status = 'active' and expires_on is not null;
create trigger trg_document_updated before update on public.document
  for each row execute function restops.set_updated_at();
