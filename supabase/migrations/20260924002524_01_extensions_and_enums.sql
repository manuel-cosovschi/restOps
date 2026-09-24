-- ============================================================
-- RestOps · 01 · Extensiones, schema privado y tipos enumerados
-- ============================================================

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists cube with schema extensions;
create extension if not exists earthdistance with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Schema privado: helpers de seguridad, NO expuesto por PostgREST
create schema if not exists restops;
revoke all on schema restops from public, anon, authenticated;
grant usage on schema restops to authenticated, service_role;

-- ------------------------------------------------------------
-- UUID v7: ordenable en el tiempo (menos fragmentacion de indice)
-- ------------------------------------------------------------
create or replace function restops.uuid_v7()
returns uuid
language plpgsql
volatile
as $$
declare
  v_time_ms bigint;
  v_bytes bytea;
begin
  v_time_ms := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_bytes := extensions.gen_random_bytes(16);
  -- 48 bits de timestamp
  v_bytes := set_byte(v_bytes, 0, ((v_time_ms >> 40) & 255)::int);
  v_bytes := set_byte(v_bytes, 1, ((v_time_ms >> 32) & 255)::int);
  v_bytes := set_byte(v_bytes, 2, ((v_time_ms >> 24) & 255)::int);
  v_bytes := set_byte(v_bytes, 3, ((v_time_ms >> 16) & 255)::int);
  v_bytes := set_byte(v_bytes, 4, ((v_time_ms >> 8) & 255)::int);
  v_bytes := set_byte(v_bytes, 5, (v_time_ms & 255)::int);
  -- version 7
  v_bytes := set_byte(v_bytes, 6, ((get_byte(v_bytes, 6) & 15) | 112));
  -- variante RFC 4122
  v_bytes := set_byte(v_bytes, 8, ((get_byte(v_bytes, 8) & 63) | 128));
  return encode(v_bytes, 'hex')::uuid;
end;
$$;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type org_role            as enum ('owner','gm','manager','employee','maintenance','auditor');
create type entity_status       as enum ('active','inactive','suspended');
create type plan_tier           as enum ('free','local','chain','enterprise');
create type subscription_status as enum ('trialing','active','past_due','canceled');
create type billing_cycle       as enum ('monthly','annual');

create type shift_kind          as enum ('apertura','cambio','cierre','control');
create type template_status     as enum ('draft','published','archived');
create type item_type           as enum ('checkbox','text','number','temperature','select','photo','comment','signature');
create type criticality_level   as enum ('low','medium','high','critical');
create type recurrence_freq     as enum ('daily','weekly','monthly','custom');
create type presence_mode       as enum ('none','gps','device');

create type run_status          as enum ('pending','in_progress','completed','overdue','failed','na');
create type response_status     as enum ('ok','fail','na','skipped');

create type exception_source    as enum ('temperature','checklist_item','overdue_run','manual');
create type exception_status    as enum ('open','action_pending','resolved','verified','dismissed');

create type incident_category   as enum ('equipo','edilicio','faltante','limpieza','seguridad','plaga','frio','electricidad','agua','personal','otro');
create type incident_status     as enum ('new','assigned','in_progress','waiting_third_party','resolved','verified','closed');

create type temp_point_kind     as enum ('fridge','freezer','chamber','hot_holding','food','receiving');
create type reading_source      as enum ('checklist','adhoc','sensor');

create type attachment_kind     as enum ('evidence','before','after','reference','signature');
create type linked_entity       as enum ('incident','exception','corrective_action','checklist_response','checklist_run','shift_handoff','document','asset','location');

create type notif_channel       as enum ('push','email','whatsapp','inapp');
create type notif_status        as enum ('pending','sent','failed','read','canceled');

create type document_type       as enum ('manipulador','mantenimiento','fumigacion','certificado','interno','otro');
create type document_status     as enum ('active','expired','archived');

create type actor_type          as enum ('user','system','ai');
