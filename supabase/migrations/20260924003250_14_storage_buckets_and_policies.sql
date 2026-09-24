-- ============================================================
-- RestOps · 14 · Storage
-- Convencion de key: {organization_id}/{location_id}/{entidad}/{uuid}.ext
-- El primer segmento del path ES el tenant y se valida contra el JWT.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restops-evidence',  'restops-evidence',  false, 26214400,
   array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']),
  ('restops-documents', 'restops-documents', false, 26214400,
   array['application/pdf','image/jpeg','image/png','image/webp']),
  ('restops-references','restops-references',false, 10485760,
   array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Helper: el path empieza con la organizacion del JWT
create or replace function restops.storage_tenant_ok(p_name text)
returns boolean language sql stable set search_path = '' as $$
  select restops.current_org_id() is not null
     and split_part(p_name, '/', 1) = restops.current_org_id()::text;
$$;
grant execute on function restops.storage_tenant_ok(text) to authenticated;

-- Evidencia: lee cualquiera del tenant con acceso al local, escribe quien no sea auditor
create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'restops-evidence' and restops.storage_tenant_ok(name));
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'restops-evidence'
              and restops.storage_tenant_ok(name)
              and not (select restops.is_read_only()));

create policy documents_select on storage.objects for select to authenticated
  using (bucket_id = 'restops-documents' and restops.storage_tenant_ok(name));
create policy documents_write on storage.objects for insert to authenticated
  with check (bucket_id = 'restops-documents'
              and restops.storage_tenant_ok(name)
              and (select restops.can_manage()));

create policy references_select on storage.objects for select to authenticated
  using (bucket_id = 'restops-references' and restops.storage_tenant_ok(name));
create policy references_write on storage.objects for insert to authenticated
  with check (bucket_id = 'restops-references'
              and restops.storage_tenant_ok(name)
              and (select restops.can_manage()));
