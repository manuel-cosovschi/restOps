/**
 * "Que necesita mi atencion hoy".
 *
 * Maximo 3 bloques, ordenados por impacto, sin graficos arriba
 * (CLAUDE.md > UX). La vista v_attention_today ya viene priorizada y con
 * security_invoker, asi que RLS la filtra por la sesion que consulta.
 */
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const MOTIVOS: Record<string, string> = {
  apertura_incompleta: 'Apertura sin terminar',
  excepcion_critica: 'Excepcion critica',
  incidencia_sin_respuesta: 'Incidencia sin respuesta',
  checklist_vencida: 'Checklist vencida',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: atencion }, { count: locales }, { count: equipo }] = await Promise.all([
    supabase
      .from('v_attention_today')
      .select('motivo, prioridad, titulo, detalle, location_name, entity_id')
      .order('prioridad')
      .limit(3),
    supabase.from('location').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('membership').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ]);

  const pendientes = atencion ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Hoy</h1>
        <p className="tenue text-sm">Lo que necesita tu atencion, ordenado por impacto.</p>
      </div>

      {pendientes.length === 0 ? (
        <div className="tarjeta">
          <p className="font-medium">Todo en orden</p>
          <p className="tenue mt-1 text-sm">
            No hay aperturas incompletas, excepciones criticas ni checklists vencidas.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pendientes.map((item, i) => (
            <li key={`${item.entity_id}-${i}`} className="tarjeta">
              <p className="text-xs font-semibold uppercase tracking-wide"
                 style={{ color: 'hsl(var(--alerta))' }}>
                {MOTIVOS[item.motivo ?? ''] ?? item.motivo}
              </p>
              <p className="mt-1 font-medium">{item.titulo}</p>
              <p className="tenue mt-0.5 text-sm">{item.location_name} · {item.detalle}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/locales" className="tarjeta block">
          <p className="text-2xl font-bold tabular-nums">{locales ?? 0}</p>
          <p className="tenue text-sm">Locales</p>
        </Link>
        <Link href="/equipo" className="tarjeta block">
          <p className="text-2xl font-bold tabular-nums">{equipo ?? 0}</p>
          <p className="tenue text-sm">Personas</p>
        </Link>
      </div>
    </div>
  );
}
