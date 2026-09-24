-- ============================================================
-- RestOps · 15 · Fijar search_path en funciones restantes
-- ============================================================

alter function restops.uuid_v7() set search_path = '';
alter function restops.set_updated_at() set search_path = '';
