# Verificación manual · Sprint 1

Tenancy, auth y ABM de locales y equipo. Probalo en este orden: cada paso
asume el anterior.

## Antes de empezar

```bash
pnpm install
cp .env.example .env.local     # completar NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev
```

> **Requisito que bloquea todo lo demás.** El hook de access token tiene que
> estar habilitado en Supabase: Dashboard → Authentication → Hooks →
> *Customize Access Token (JWT) Claims* → función `public.custom_access_token_hook`
> → Enable.
>
> Sin eso el JWT no trae `org_id` y RLS niega todo. La app no te deja a
> ciegas: el layout admin muestra un cartel explicando exactamente esto en
> lugar de un dashboard vacío.

Para confirmar que el hook quedó activo, logueate y mirá el token: tiene que
traer `org_id`, `org_role` y `location_ids`.

---

## 1. Signup crea organización, membresía y suscripción

1. Entrá a `/signup`.
2. Completá nombre, negocio (ej. *Cantina del Puerto*), email y contraseña.
3. Enviá.

**Esperado:** caés en `/dashboard` con la organización ya activa.

**Verificación en base:**

```sql
select o.name, o.slug, s.plan, m.role, up.active_organization_id = o.id as es_la_activa
  from public.organization o
  join public.subscription s on s.organization_id = o.id
  join public.membership   m on m.organization_id = o.id
  join public.user_profile up on up.id = m.user_id
 where o.slug = 'cantina-del-puerto';
```

Tiene que devolver una fila: plan `free`, rol `owner`, `es_la_activa = true`.
Las tres filas se crean en **una** transacción (`create_organization_with_owner`,
migración 18); no hay estado intermedio donde exista la organización sin su dueño.

**Doble submit:** volvé a enviar el mismo formulario con el mismo negocio.
No se crea una segunda organización — la función devuelve la existente.

**Colisión de slug:** creá otra cuenta con el mismo nombre de negocio. El slug
sale `cantina-del-puerto-2`.

---

## 2. Login y cierre de sesión

1. `/login` con las credenciales del seed: `owner@restops.demo` / `RestOps2026!`.
2. Entrás a `/dashboard`.
3. "Salir" te devuelve a `/login`.
4. Entrá a `/locales` sin sesión: el middleware te redirige a
   `/login?next=/locales` y después del login volvés a `/locales`.

**Open redirect:** probá `/login?next=https://ejemplo-externo.tld`. Después de
loguearte tenés que terminar en `/dashboard`, **no** en el sitio externo.
Lo mismo con `//ejemplo-externo.tld`.

**Credenciales inválidas:** el mensaje es "Email o contraseña incorrectos"
tanto si el email no existe como si la contraseña está mal. Es a propósito:
distinguirlos permite enumerar cuentas.

---

## 3. ABM de locales y límite de plan

Con la cuenta nueva (plan `free`, `max_locations = 1`):

1. `/locales` → **Nuevo local** → nombre "Sucursal Centro" → Crear.
2. Aparece en la lista.
3. Intentá crear un segundo local.

**Esperado:** no se crea, y el mensaje dice que el plan incluye 1 local, con
un link **Ver planes**. El status HTTP es **402**, no un 403 genérico.

La barrera real está en la base, no en el handler. Comprobalo salteando la app:

```sql
-- Como el owner de esa organización, vía PostgREST o SQL con sus claims:
insert into public.location (organization_id, name, slug)
values ('<org_id>', 'Segundo', 'segundo');
-- ERROR: Tu plan incluye 1 local(es). Actualiza el plan para agregar mas.
```

El día operativo se respeta: creá un local con inicio `04:00` y confirmá que
queda guardado en `location.business_day_start`.

---

## 4. Equipo: rol, alcance por local y PIN

Con `owner@restops.demo` (organización del seed, 2 locales, 5 personas):

1. `/equipo` lista las 5 membresías con su rol.
2. Editá `cocina@restops.demo`: destildá Güemes, tildá el otro local, Guardar.
3. Verificá:

```sql
select l.name from public.membership_location ml
  join public.location l on l.id = ml.location_id
 where ml.membership_id = '<membership_id>';
```

4. Cambiá el rol de esa persona a **Gerente general**. El formulario deja de
   pedir locales ("ve toda la organización") y al guardar se borran sus filas
   de `membership_location`: si mañana la degradás, no le queda alcance fantasma.

5. **Último dueño:** intentá cambiarle el rol al único `owner` activo.
   Esperado: **409** y el mensaje "La organizacion necesita al menos un dueño activo".

6. **PIN:** asignale `4021` a una membresía. Esperado: OK, y la fila pasa a
   mostrar "PIN asignado".
   - Probá `1111` → rechazado por obvio.
   - Probá `1234` → rechazado.
   - El PIN se guarda hasheado con bcrypt dentro de la base
     (`set_membership_pin`, migración 19). Confirmá que nunca viaja en claro:

```sql
select pin_hash like '$2%' as es_bcrypt, pin_set_at
  from public.membership where id = '<membership_id>';
```

---

## 5. Selector de organización (multi-org)

El selector sólo aparece si el usuario pertenece a más de una organización.
Para provocarlo, agregá una membresía manual:

```sql
insert into public.membership (organization_id, user_id, role, status, accepted_at)
values ('<otra_org_id>', '<user_id>', 'manager', 'active', now());
```

1. Recargá. Aparece el desplegable en la barra superior.
2. Cambiá de organización.

**Esperado:** la página se recarga y `/locales` y `/equipo` muestran los datos
de la otra organización. El cambio actualiza `active_organization_id` **y**
refresca el token; sin ese refresh RLS seguiría resolviendo con el `org_id`
anterior.

---

## 6. Aislamiento multi-tenant (el que define el sprint)

Automatizado. Corre 8 aserciones y se limpia solo, pase o falle:

```bash
psql "$DATABASE_URL" -f supabase/tests/rls_tenant_isolation.sql
```

**Esperado:** `NOTICE: OK: 8 aserciones de aislamiento pasaron`.

Cubre:

| # | Aserción |
|---|---|
| 1 | El owner de A no ve locales de B en un listado |
| 2 | El owner de A no accede al local de B **pidiendo el id directo** |
| 3 | El owner de A no ve la organización B |
| 4 | El owner de A no ve las membresías de B |
| 5 | El owner de A **sí** ve su propio local (que no pase por estar todo vacío) |
| 6 | Un empleado ve el local que tiene asignado |
| 7 | Un empleado **no** ve los otros locales de su propia organización |
| 8 | Un empleado de A no accede al local de B |

La 5 es la que evita el falso positivo: sin ella, un `where` roto que no
devuelve nada haría pasar el test entero.

### Prueba manual equivalente

Con sesión de una organización, pedile a la API el id de un local de otra:

```
GET /api/locations/<id_de_otra_organizacion>
```

**Esperado: 404**, no 403. Un 403 confirmaría que ese id existe.

---

## Qué NO entra en este sprint

- **Invitación de miembros por email.** Crear el usuario en `auth.users`
  requiere la service role key, y la regla 2 de CLAUDE.md la prohíbe en un
  handler que atiende a un usuario. Va como Edge Function, junto a `pin-login`.
  Por ahora las membresías se crean contra usuarios que ya existen.
- Editor de templates (Sprint 2), ejecución y kiosco (Sprint 3).
  El layout de kiosco está creado pero todavía no tiene pantallas.
