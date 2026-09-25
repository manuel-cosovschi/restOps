'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { locationSchema } from '@restops/contracts';

interface Local {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  timezone: string;
  business_day_start: string;
  status: string;
}

export function PanelLocales({
  iniciales, puedeCrear, puedeEditar,
}: { iniciales: Local[]; puedeCrear: boolean; puedeEditar: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Locales</h1>
          <p className="tenue text-sm">
            El dia operativo de cada local define contra que fecha se agrupa la operacion.
          </p>
        </div>
        {puedeCrear && (
          <button type="button" className="boton shrink-0" onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Cancelar' : 'Nuevo local'}
          </button>
        )}
      </div>

      {abierto && (
        <FormularioLocal
          onListo={() => { setAbierto(false); router.refresh(); }}
        />
      )}

      {iniciales.length === 0 ? (
        <div className="tarjeta">
          <p className="font-medium">Todavia no hay locales</p>
          <p className="tenue mt-1 text-sm">
            Crea el primero para empezar a cargar checklists y controles.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {iniciales.map((l) => (
            <li key={l.id} className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.name}</p>
                <p className="tenue truncate text-sm">
                  {[l.city, l.province].filter(Boolean).join(', ') || 'Sin direccion'}
                  {' · dia operativo desde '}{l.business_day_start.slice(0, 5)}
                </p>
              </div>
              {l.status !== 'active' && (
                <span className="rounded px-2 py-0.5 text-xs" style={{ color: 'hsl(var(--alerta))' }}>
                  {l.status}
                </span>
              )}
              {puedeEditar && (
                <a href={`/locales/${l.id}`} className="boton-secundario px-3 py-1.5 text-xs">
                  Editar
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormularioLocal({ onListo }: { onListo: () => void }) {
  const [form, setForm] = useState({
    name: '', slug: '', city: '', province: '', businessDayStart: '06:00',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        [k]: value,
        // Autocompletar el slug mientras no lo hayan tocado a mano
        ...(k === 'name' && !f.slug ? {} : {}),
      }));
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFields({}); setUpgradeUrl(null);

    const payload = {
      name: form.name,
      slug: form.slug || sugerirSlug(form.name),
      city: form.city || undefined,
      province: form.province || undefined,
      businessDayStart: form.businessDayStart,
    };

    const parsed = locationSchema.safeParse(payload);
    if (!parsed.success) {
      const porCampo: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0] ?? '_');
        if (!(k in porCampo)) porCampo[k] = i.message;
      }
      setFields(porCampo);
      return;
    }

    setEnviando(true);
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    const body: { error?: string; fields?: Record<string, string>; upgradeUrl?: string } =
      await res.json().catch(() => ({}));
    setEnviando(false);

    if (res.status === 402) {
      setError(body.error ?? 'Alcanzaste el limite de locales de tu plan');
      setUpgradeUrl(body.upgradeUrl ?? '/configuracion/plan');
      return;
    }

    if (!res.ok) {
      if (body.fields) setFields(body.fields);
      setError(body.error ?? 'No se pudo crear el local');
      return;
    }

    onListo();
  }

  return (
    <form onSubmit={onSubmit} className="tarjeta space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="name" label="Nombre" value={form.name} onChange={set('name')} error={fields.name} />
        <Campo id="slug" label="Identificador" value={form.slug} onChange={set('slug')}
               error={fields.slug} hint={form.slug ? undefined : `Se usara: ${sugerirSlug(form.name) || '—'}`} />
        <Campo id="city" label="Ciudad" value={form.city} onChange={set('city')} error={fields.city} />
        <Campo id="province" label="Provincia" value={form.province} onChange={set('province')} error={fields.province} />
        <Campo id="businessDayStart" label="Inicio del dia operativo" type="time"
               value={form.businessDayStart} onChange={set('businessDayStart')}
               error={fields.businessDayStart}
               hint="Si cerras a las 4 AM, ese cierre cuenta en el dia anterior." />
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'hsl(var(--peligro))' }}>
          {error}{' '}
          {upgradeUrl && <a href={upgradeUrl} className="underline">Ver planes</a>}
        </p>
      )}

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear local'}
      </button>
    </form>
  );
}

function sugerirSlug(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 48);
}

function Campo({
  id, label, value, onChange, error, hint, type = 'text',
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="etiqueta" htmlFor={id}>{label}</label>
      <input id={id} type={type} className="campo" value={value} onChange={onChange}
             aria-invalid={!!error} />
      {error
        ? <p className="mt-1 text-xs" style={{ color: 'hsl(var(--peligro))' }}>{error}</p>
        : hint ? <p className="tenue mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
