-- ============================================================
-- RestOps · 21 · El borrado duro de una organizacion era imposible
--
-- trg_audit_organization corria AFTER DELETE e insertaba en audit_log una
-- fila con organization_id = la organizacion recien borrada. Como
-- audit_log.organization_id referencia organization(id), el insert violaba
-- la foreign key y abortaba el delete: ninguna organizacion se podia
-- borrar de verdad.
--
-- Auditar ese delete no aportaba nada: audit_log.organization_id es
-- `on delete cascade`, asi que la fila de auditoria se habria borrado en
-- el mismo movimiento. Se audita insert y update; el borrado del tenant
-- queda fuera.
--
-- La operacion normal del producto sigue siendo la baja logica
-- (organization.deleted_at), que es un update y si se audita.
-- ============================================================

drop trigger if exists trg_audit_organization on public.organization;

create trigger trg_audit_organization
  after insert or update on public.organization
  for each row execute function restops.audit_trigger();
