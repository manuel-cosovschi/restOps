# ADR 0003 — Se cobra por local, con usuarios ilimitados

**Estado:** Aceptado · **Fecha:** 2026-09-24

## Contexto

Necesitábamos un modelo de precios simple de vender a un restaurante
independiente y que escale a una cadena de 20 locales.

## Decisión

`plan_limit` factura por `max_locations`, nunca por usuario. Gratis (1
local), Local (USD 25/mes, 1 local), Cadena (USD 19-15/mes según volumen,
locales ilimitados). Usuarios siempre ilimitados en todos los planes pagos.

## Por qué

Cobrar por usuario activo incentiva al dueño a compartir un solo login
entre 8 empleados para no pagar de más — y eso destruye exactamente lo que
vende el producto: saber quién hizo qué. El local es la unidad que crece
cuando al cliente le va bien, y es la que usa toda la categoría (Jolt,
Trail, Zenput cobran por site).

## Consecuencias

- `plan_limit.max_users` existe en el schema pero se deja en `null`
  (ilimitado) en todos los planes de v1. No se activa salvo que el negocio
  lo pida explícitamente más adelante.
- Cualquier endpoint que cree un local nuevo debe devolver `402` con link
  de upgrade cuando se supera `max_locations`, no un `403` genérico.
- Lista de precios en USD, cobro en ARS al tipo de cambio del día de
  factura — la inflación argentina vuelve inútil un precio fijo en ARS.
