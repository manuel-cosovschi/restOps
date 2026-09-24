# RestOps

El sistema operativo de las operaciones internas de un restaurante.
No es POS, no es comandas, no es facturación: reemplaza checklists de
papel, WhatsApp, Excel y libretas de temperatura.

**Para continuar el desarrollo, leé [`CLAUDE.md`](./CLAUDE.md) primero.**
Ahí está todo: qué existe, qué falta, las reglas no negociables y el
Sprint 1 detallado.

## Estado

Sprint 0 completo: 30 tablas, RLS forzada y verificada (0 fugas entre
tenants), triggers de negocio, `pg_cron`, 4 vistas de dashboard, seed
gastronómico cargado. Cero líneas de UI todavía — eso es Sprint 1.

Proyecto Supabase: `dfbxrytiigwczxhfsvzc` (`sa-east-1`, São Paulo).

## Quickstart

```bash
pnpm install
cp .env.example .env.local          # completar con las claves del proyecto
supabase link --project-ref dfbxrytiigwczxhfsvzc
pnpm dev
```

**Paso manual pendiente antes de tocar auth:** habilitar el JWT hook en
Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims
→ `public.custom_access_token_hook`. Sin esto, RLS niega todo porque los
claims del token vienen vacíos.

## Documentación

| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Contexto completo para retomar el desarrollo |
| `docs/erd.md` | Mapa del modelo de datos |
| `docs/verificacion.md` | Cómo probar que la base funciona |
| `docs/adr/` | Por qué se tomó cada decisión de arquitectura |
| `supabase/migrations/README.md` | Las 17 migraciones aplicadas, en orden |

## Stack

Next.js 15 · Supabase (Postgres + RLS + Auth + Storage + `pg_cron`) · Zod ·
Tailwind. Sin NestJS, sin Redis, sin Prisma — ver `docs/adr/0001-*.md`.
