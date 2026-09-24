# ERD — resumen

30 tablas, agrupadas por dominio. El diseño completo con tipos de columna,
constraints e índices está en `supabase/migrations/` (source of truth);
esto es un mapa de navegación, no la especificación.

```
Tenancy e identidad
  organization ── plan_limit
       │              │
       ├── subscription
       ├── usage_counter
       └── location
             │
  user_profile ── membership ── membership_location ── location
                       │
                     device

Configuración operativa
  area ── asset ── temperature_point
  shift_template ── checklist_template (versionada, inmutable si published)
                          │
                    checklist_item_template
                          │
                    recurrence_rule

Ejecución (columna vertebral)
  checklist_run ── checklist_response (append-only)
                          │
                     temperature_reading (append-only)
                          │
                       exception ── corrective_action
                          │
                       incident (opcional, escalada manual)

Soporte
  comment ── (polimórfico: entity_type + entity_id)
  attachment ── (polimórfico, metadata; el archivo vive en Storage)
  shift_handoff
  document

Notificaciones y auditoría
  notification ── notification_preference ── push_subscription
  audit_log (append-only, INSERT revocado para `authenticated`)
```

## Las 3 reglas que no se ven en el diagrama

1. **`item_snapshot` en `checklist_response`** — copia congelada del label +
   config del item al momento de responder. Cambiar el rango de una heladera
   hoy no reescribe el historial de marzo.

2. **`exception.temperature_reading_id` ↔ `temperature_reading.exception_id`**
   — dependencia circular resuelta con un `ALTER TABLE ... ADD CONSTRAINT`
   después de crear ambas tablas (ver migración 06).

3. **Comentarios y adjuntos son polimórficos** — `entity_type` + `entity_id`
   sin FK real (no es enforceable en Postgres sin partición). Se compensa con
   `CHECK` sobre `entity_type` y un índice compuesto. Trade-off deliberado
   contra tener 9 tablas de adjuntos.

## Vistas (`security_invoker = on`)

| Vista | Para qué |
|---|---|
| `v_attention_today` | La pantalla "Qué necesita mi atención hoy" |
| `v_location_compliance` | % de cumplimiento por local y día operativo |
| `v_recurring_problems` | Mismo punto de temperatura fallando ≥3 veces en 30 días |
| `v_incident_metrics` | Tiempo medio de resolución y primera respuesta |
