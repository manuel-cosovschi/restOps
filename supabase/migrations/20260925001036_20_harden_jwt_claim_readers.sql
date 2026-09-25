-- ============================================================
-- RestOps · 20 · Lectura defensiva de los claims del JWT
--
-- `current_setting('request.jwt.claims', true)` devuelve NULL cuando el
-- parametro nunca se seteo, pero devuelve la CADENA VACIA cuando se seteo
-- y despues se limpio. Y ''::jsonb no es null: tira
-- "invalid input syntax for type json".
--
-- Como restops.jwt_claim() lo usa el audit_trigger en cada insert, update
-- y delete de las 16 tablas auditadas, ese cast reventaba la sentencia
-- entera del usuario. Lo detecto el test de aislamiento multi-tenant al
-- limpiar los claims antes de borrar el fixture.
--
-- El nullif() antes del cast es todo el arreglo.
-- ============================================================

create or replace function restops.jwt_claim(p_claim text)
returns text language sql stable set search_path = '' as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> p_claim,
      ''
    ), ''
  );
$$;

create or replace function restops.current_user_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

create or replace function restops.current_location_ids()
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'location_ids',
          '[]'::jsonb
        )
      )::uuid
    ),
    '{}'::uuid[]
  );
$$;
