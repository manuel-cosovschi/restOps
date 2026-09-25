-- ============================================================
-- RestOps · Seed de desarrollo
-- Org "Grupo Costa", 2 locales (Guemes / Puerto), 5 usuarios,
-- 3 checklists gastronomicas publicadas + recurrencia.
-- Ya esta aplicado en el proyecto remoto. Correrlo de nuevo en
-- una base vacia lo reproduce identico.
-- ============================================================

-- ---------- 1/3 · Organizacion, usuarios, locales, membresias ----------
do $$
declare
  v_org   uuid;
  v_loc_g uuid;
  v_loc_p uuid;
  v_u_owner uuid := '11111111-1111-4111-8111-111111111111';
  v_u_gm    uuid := '22222222-2222-4222-8222-222222222222';
  v_u_mgr   uuid := '33333333-3333-4333-8333-333333333333';
  v_u_emp   uuid := '44444444-4444-4444-8444-444444444444';
  v_u_mnt   uuid := '55555555-5555-4555-8555-555555555555';
  v_m_mgr uuid; v_m_emp uuid; v_m_mnt uuid;
  r record;
begin
  for r in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'owner@restops.demo',         'Manu Cosovschi'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'gerente@restops.demo',       'Lucia Ferrari'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'encargado@restops.demo',     'Diego Sosa'),
      ('44444444-4444-4444-8444-444444444444'::uuid, 'cocina@restops.demo',        'Brenda Gimenez'),
      ('55555555-5555-4555-8555-555555555555'::uuid, 'mantenimiento@restops.demo', 'Raul Peralta')
    ) as t(uid, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', r.uid, 'authenticated', 'authenticated',
      r.email, extensions.crypt('RestOps2026!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', r.full_name),
      '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      extensions.gen_random_uuid(), r.uid,
      jsonb_build_object('sub', r.uid::text, 'email', r.email, 'email_verified', true),
      'email', r.uid::text, now(), now(), now()
    ) on conflict do nothing;
  end loop;

  insert into public.organization (name, slug, country_code, locale, default_timezone)
  values ('Grupo Costa', 'grupo-costa', 'AR', 'es-AR', 'America/Argentina/Buenos_Aires')
  returning id into v_org;

  insert into public.subscription (organization_id, plan, status, billing_cycle,
                                   unit_price_usd, locations_included,
                                   trial_ends_at, current_period_start, current_period_end)
  -- Plan 'chain': el seed crea 2 locales y 'local' admite uno solo
  -- (plan_limit.max_locations = 1). Con el guard de la migracion 18 el
  -- segundo insert de location rebotaria.
  values (v_org, 'chain', 'trialing', 'monthly', 19.00, 2,
          now() + interval '14 days', now(), now() + interval '1 month');

  insert into public.location (organization_id, name, slug, address, city, province,
                               lat, lng, timezone, business_day_start)
  values (v_org, 'Guemes', 'guemes', 'Guemes 2847', 'Mar del Plata', 'Buenos Aires',
          -38.0123456, -57.5478901, 'America/Argentina/Buenos_Aires', '06:00')
  returning id into v_loc_g;

  insert into public.location (organization_id, name, slug, address, city, province,
                               lat, lng, timezone, business_day_start)
  values (v_org, 'Puerto', 'puerto', 'Av. Martinez de Hoz 150', 'Mar del Plata', 'Buenos Aires',
          -38.0345678, -57.5312345, 'America/Argentina/Buenos_Aires', '07:00')
  returning id into v_loc_p;

  insert into public.membership (organization_id, user_id, role, display_name, employee_code, job_title, accepted_at)
  values (v_org, v_u_owner, 'owner', 'Manu Cosovschi', 'EMP-001', 'Duenio', now());

  insert into public.membership (organization_id, user_id, role, display_name, employee_code, job_title, accepted_at)
  values (v_org, v_u_gm, 'gm', 'Lucia Ferrari', 'EMP-002', 'Gerente general', now());

  insert into public.membership (organization_id, user_id, role, display_name, employee_code,
                                 job_title, pin_hash, pin_set_at, accepted_at)
  values (v_org, v_u_mgr, 'manager', 'Diego Sosa', 'EMP-003', 'Encargado Guemes',
          extensions.crypt('4021', extensions.gen_salt('bf')), now(), now())
  returning id into v_m_mgr;

  insert into public.membership (organization_id, user_id, role, display_name, employee_code,
                                 job_title, pin_hash, pin_set_at, accepted_at)
  values (v_org, v_u_emp, 'employee', 'Brenda Gimenez', 'EMP-004', 'Cocina',
          extensions.crypt('1234', extensions.gen_salt('bf')), now(), now())
  returning id into v_m_emp;

  insert into public.membership (organization_id, user_id, role, display_name, employee_code, job_title, accepted_at)
  values (v_org, v_u_mnt, 'maintenance', 'Raul Peralta', 'EMP-005', 'Mantenimiento', now())
  returning id into v_m_mnt;

  insert into public.membership_location (membership_id, location_id, organization_id, is_primary) values
    (v_m_mgr, v_loc_g, v_org, true),
    (v_m_emp, v_loc_g, v_org, true),
    (v_m_mnt, v_loc_g, v_org, true),
    (v_m_mnt, v_loc_p, v_org, false);

  update public.user_profile set active_organization_id = v_org
   where id in (v_u_owner, v_u_gm, v_u_mgr, v_u_emp, v_u_mnt);

  insert into public.device (organization_id, location_id, name, token_hash, platform, enrolled_by)
  values (v_org, v_loc_g, 'Tablet Cocina Guemes',
          encode(extensions.digest('demo-device-token-guemes', 'sha256'), 'hex'),
          'android', v_m_mgr);
end $$;

-- ---------- 2/3 · Areas, activos, puntos de temperatura, turnos ----------
do $$
declare
  v_org uuid; v_loc_g uuid; v_loc_p uuid; v_m_mgr uuid;
  v_a_cocina uuid; v_a_dep uuid; v_a_barra uuid;
  v_as_hel1 uuid; v_as_hel2 uuid; v_as_free uuid; v_as_cam uuid; v_as_campana uuid;
begin
  select id into v_org from public.organization where slug = 'grupo-costa';
  select id into v_loc_g from public.location where organization_id = v_org and slug = 'guemes';
  select id into v_loc_p from public.location where organization_id = v_org and slug = 'puerto';
  select id into v_m_mgr from public.membership where organization_id = v_org and employee_code = 'EMP-003';

  insert into public.area (organization_id, location_id, name, order_index)
  select v_org, l.id, a.name, a.ord
    from public.location l
    cross join (values ('Cocina',1),('Salon',2),('Barra',3),('Deposito',4),('Banios',5)) as a(name, ord)
   where l.organization_id = v_org;

  select id into v_a_cocina from public.area where location_id = v_loc_g and name = 'Cocina';
  select id into v_a_dep    from public.area where location_id = v_loc_g and name = 'Deposito';
  select id into v_a_barra  from public.area where location_id = v_loc_g and name = 'Barra';

  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand, model)
  values (v_org, v_loc_g, v_a_cocina, 'Heladera Principal', 'HEL-01', 'refrigeracion', 'Gafa', 'Eternity 4P')
  returning id into v_as_hel1;
  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand, model)
  values (v_org, v_loc_g, v_a_cocina, 'Heladera 2', 'HEL-02', 'refrigeracion', 'Briket', 'BR-800')
  returning id into v_as_hel2;
  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand, model)
  values (v_org, v_loc_g, v_a_cocina, 'Freezer Cocina', 'FRZ-01', 'refrigeracion', 'Teora', 'TF-500')
  returning id into v_as_free;
  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand, model)
  values (v_org, v_loc_g, v_a_dep, 'Camara de Frio', 'CAM-01', 'refrigeracion', 'Friolatina', 'CF-2000')
  returning id into v_as_cam;
  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand)
  values (v_org, v_loc_g, v_a_cocina, 'Campana Extractora', 'CAMP-01', 'ventilacion', 'Inoxmar')
  returning id into v_as_campana;
  insert into public.asset (organization_id, location_id, area_id, name, code, category, brand, model)
  values (v_org, v_loc_g, v_a_barra, 'Chopera', 'CHO-01', 'barra', 'Lindr', 'PYGMY 25');

  insert into public.temperature_point
    (organization_id, location_id, asset_id, area_id, name, kind, min_c, max_c, criticality, responsible_role, order_index)
  values
    (v_org, v_loc_g, v_as_hel1, v_a_cocina, 'Heladera Principal', 'fridge',       0.0,   5.0, 'critical', 'employee', 1),
    (v_org, v_loc_g, v_as_hel2, v_a_cocina, 'Heladera 2',         'fridge',       0.0,   5.0, 'high',     'employee', 2),
    (v_org, v_loc_g, v_as_free, v_a_cocina, 'Freezer Cocina',     'freezer',    -22.0, -15.0, 'critical', 'employee', 3),
    (v_org, v_loc_g, v_as_cam,  v_a_dep,    'Camara de Frio',     'chamber',      0.0,   4.0, 'critical', 'manager',  4),
    (v_org, v_loc_g, null,      v_a_cocina, 'Mantenimiento Caliente', 'hot_holding', 63.0, 90.0, 'high',  'employee', 5),
    (v_org, v_loc_g, null,      v_a_dep,    'Recepcion de Mercaderia', 'receiving',  0.0,   5.0, 'high',  'manager',  6),
    (v_org, v_loc_g, null,      v_a_barra,  'Heladera Barra',     'fridge',       2.0,   6.0, 'medium',   'employee', 7);

  insert into public.temperature_point
    (organization_id, location_id, name, kind, min_c, max_c, criticality, order_index)
  values
    (v_org, v_loc_p, 'Heladera Principal', 'fridge',   0.0,  5.0, 'critical', 1),
    (v_org, v_loc_p, 'Freezer',            'freezer',-22.0,-15.0, 'critical', 2);

  insert into public.shift_template (organization_id, location_id, name, kind, start_time, end_time, days_of_week)
  values
    (v_org, v_loc_g, 'Apertura Guemes',        'apertura', '08:00', '10:00', '{1,2,3,4,5,6,7}'),
    (v_org, v_loc_g, 'Cambio de turno Guemes', 'cambio',   '16:00', '17:00', '{1,2,3,4,5,6,7}'),
    (v_org, v_loc_g, 'Cierre Guemes',          'cierre',   '23:30', '01:00', '{1,2,3,4,5,6,7}'),
    (v_org, v_loc_p, 'Apertura Puerto',        'apertura', '09:00', '11:00', '{1,2,3,4,5,6,7}'),
    (v_org, v_loc_p, 'Cierre Puerto',          'cierre',   '23:00', '00:30', '{1,2,3,4,5,6,7}');
end $$;

-- ---------- 3/3 · Checklists, items y recurrencia ----------
do $$
declare
  v_org uuid; v_loc_g uuid; v_m_mgr uuid;
  v_sh_ap uuid; v_sh_ci uuid;
  v_t_ap uuid; v_t_ci uuid; v_t_ctrl uuid;
  p_hel1 uuid; p_hel2 uuid; p_free uuid; p_cam uuid; p_hot uuid; p_barra uuid;
begin
  select id into v_org   from public.organization where slug = 'grupo-costa';
  select id into v_loc_g from public.location where organization_id = v_org and slug = 'guemes';
  select id into v_m_mgr from public.membership where organization_id = v_org and employee_code = 'EMP-003';
  select id into v_sh_ap from public.shift_template where location_id = v_loc_g and kind = 'apertura';
  select id into v_sh_ci from public.shift_template where location_id = v_loc_g and kind = 'cierre';

  select id into p_hel1  from public.temperature_point where location_id=v_loc_g and name='Heladera Principal';
  select id into p_hel2  from public.temperature_point where location_id=v_loc_g and name='Heladera 2';
  select id into p_free  from public.temperature_point where location_id=v_loc_g and name='Freezer Cocina';
  select id into p_cam   from public.temperature_point where location_id=v_loc_g and name='Camara de Frio';
  select id into p_hot   from public.temperature_point where location_id=v_loc_g and name='Mantenimiento Caliente';
  select id into p_barra from public.temperature_point where location_id=v_loc_g and name='Heladera Barra';

  insert into public.checklist_template
    (organization_id, location_id, shift_template_id, name, description, kind,
     status, presence_required, estimated_minutes, created_by)
  values (v_org, v_loc_g, v_sh_ap, 'Apertura de cocina',
          'Control obligatorio antes de habilitar el servicio.', 'apertura',
          'draft', 'gps', 8, v_m_mgr)
  returning id into v_t_ap;

  insert into public.checklist_item_template
    (organization_id, checklist_template_id, section, order_index, label, type,
     required, criticality, instructions, photo_required, config, temperature_point_id, default_role)
  values
    (v_org, v_t_ap, 'Seguridad', 1, 'Salidas de emergencia despejadas', 'checkbox',
     true, 'critical', 'Verificar que no haya cajas ni mercaderia bloqueando.', false, '{}', null, 'employee'),
    (v_org, v_t_ap, 'Seguridad', 2, 'Matafuegos con carga vigente', 'checkbox',
     true, 'high', 'Revisar manometro en zona verde.', false, '{}', null, 'employee'),
    (v_org, v_t_ap, 'Cadena de frio', 1, 'Heladera Principal', 'temperature',
     true, 'critical', 'Medir en el estante del medio, con el termometro calibrado.', false, '{}', p_hel1, 'employee'),
    (v_org, v_t_ap, 'Cadena de frio', 2, 'Heladera 2', 'temperature',
     true, 'high', null, false, '{}', p_hel2, 'employee'),
    (v_org, v_t_ap, 'Cadena de frio', 3, 'Freezer Cocina', 'temperature',
     true, 'critical', null, false, '{}', p_free, 'employee'),
    (v_org, v_t_ap, 'Cadena de frio', 4, 'Camara de Frio', 'temperature',
     true, 'critical', null, false, '{}', p_cam, 'manager'),
    (v_org, v_t_ap, 'Higiene', 1, 'Mesadas y tablas sanitizadas', 'checkbox',
     true, 'high', 'Usar sanitizante y dejar actuar 5 minutos.', false, '{}', null, 'employee'),
    (v_org, v_t_ap, 'Higiene', 2, 'Estado general de pisos', 'select',
     true, 'medium', null, false,
     '{"options":[{"value":"bueno","label":"Bueno","is_fail":false},{"value":"regular","label":"Regular","is_fail":false},{"value":"malo","label":"Malo","is_fail":true}]}',
     null, 'employee'),
    (v_org, v_t_ap, 'Higiene', 3, 'Foto de la cocina lista', 'photo',
     true, 'medium', 'Foto general desde la puerta de ingreso.', true,
     '{"min_photos":1,"max_photos":3}', null, 'employee'),
    (v_org, v_t_ap, 'Cierre', 1, 'Observaciones de apertura', 'text',
     false, 'low', null, false, '{"max_length":500,"multiline":true}', null, 'employee'),
    (v_org, v_t_ap, 'Cierre', 2, 'Confirmo la apertura del local', 'signature',
     true, 'high', null, false, '{}', null, 'manager');

  update public.checklist_template
     set status = 'published', published_at = now(), published_by = v_m_mgr
   where id = v_t_ap;

  insert into public.checklist_template
    (organization_id, location_id, shift_template_id, name, description, kind,
     status, presence_required, estimated_minutes, created_by)
  values (v_org, v_loc_g, v_sh_ci, 'Cierre de local',
          'Ultimo control del dia operativo.', 'cierre', 'draft', 'gps', 10, v_m_mgr)
  returning id into v_t_ci;

  insert into public.checklist_item_template
    (organization_id, checklist_template_id, section, order_index, label, type,
     required, criticality, instructions, photo_required, config, temperature_point_id, default_role)
  values
    (v_org, v_t_ci, 'Cadena de frio', 1, 'Heladera Principal', 'temperature',
     true, 'critical', null, false, '{}', p_hel1, 'employee'),
    (v_org, v_t_ci, 'Cadena de frio', 2, 'Freezer Cocina', 'temperature',
     true, 'critical', null, false, '{}', p_free, 'employee'),
    (v_org, v_t_ci, 'Cadena de frio', 3, 'Heladera Barra', 'temperature',
     true, 'medium', null, false, '{}', p_barra, 'employee'),
    (v_org, v_t_ci, 'Cocina', 1, 'Campana y filtros limpios', 'checkbox',
     true, 'high', 'Los filtros van al lavavajillas.', false, '{}', null, 'employee'),
    (v_org, v_t_ci, 'Cocina', 2, 'Gas cerrado en la llave general', 'checkbox',
     true, 'critical', null, false, '{}', null, 'manager'),
    (v_org, v_t_ci, 'Cocina', 3, 'Foto de cocina cerrada', 'photo',
     true, 'medium', null, true, '{"min_photos":1}', null, 'employee'),
    (v_org, v_t_ci, 'Barra', 1, 'Barriles restantes', 'number',
     true, 'low', 'Contar barriles llenos en camara.', false,
     '{"min":0,"max":50,"unit":"barriles","decimals":0}', null, 'employee'),
    (v_org, v_t_ci, 'Barra', 2, 'Chopera purgada', 'checkbox',
     true, 'medium', null, false, '{}', null, 'employee'),
    (v_org, v_t_ci, 'Cierre', 1, 'Novedades del turno', 'text',
     false, 'low', null, false, '{"max_length":800,"multiline":true}', null, 'manager'),
    (v_org, v_t_ci, 'Cierre', 2, 'Confirmo el cierre del local', 'signature',
     true, 'critical', null, false, '{}', null, 'manager');

  update public.checklist_template
     set status = 'published', published_at = now(), published_by = v_m_mgr
   where id = v_t_ci;

  insert into public.checklist_template
    (organization_id, location_id, name, description, kind, status,
     presence_required, estimated_minutes, created_by)
  values (v_org, v_loc_g, 'Control de temperaturas',
          'Control intermedio de la cadena de frio.', 'control', 'draft', 'gps', 3, v_m_mgr)
  returning id into v_t_ctrl;

  insert into public.checklist_item_template
    (organization_id, checklist_template_id, section, order_index, label, type,
     required, criticality, config, temperature_point_id, default_role)
  values
    (v_org, v_t_ctrl, 'Cadena de frio', 1, 'Heladera Principal', 'temperature', true, 'critical', '{}', p_hel1, 'employee'),
    (v_org, v_t_ctrl, 'Cadena de frio', 2, 'Heladera 2',         'temperature', true, 'high',     '{}', p_hel2, 'employee'),
    (v_org, v_t_ctrl, 'Cadena de frio', 3, 'Camara de Frio',     'temperature', true, 'critical', '{}', p_cam,  'employee'),
    (v_org, v_t_ctrl, 'Servicio',       1, 'Mantenimiento Caliente', 'temperature', true, 'high',  '{}', p_hot, 'employee');

  update public.checklist_template
     set status = 'published', published_at = now(), published_by = v_m_mgr
   where id = v_t_ctrl;

  insert into public.recurrence_rule
    (organization_id, checklist_template_id, location_id, freq, at_times, tolerance_min)
  values
    (v_org, v_t_ap,   v_loc_g, 'daily', '{08:30}', 60),
    (v_org, v_t_ci,   v_loc_g, 'daily', '{23:45}', 75),
    (v_org, v_t_ctrl, v_loc_g, 'daily', '{13:00,18:00,22:00}', 45);
end $$;

-- Materializa la primera ventana de 48h de runs
select restops.generate_runs(48);
