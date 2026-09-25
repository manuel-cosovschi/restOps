'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS, ORG_WIDE_ROLES, type Role } from '@restops/rbac';
import { setPinSchema } from '@restops/contracts';

export interface MiembroVista {
  id: string;
  role: string;
  status: string;
  hasPin: boolean;
  jobTitle: string | null;
  nombre: string;
  locationIds: string[];
}

interface Local { id: string; name: string }

export function PanelEquipo({
  miembros, locales, puedeEditar, puedePin,
}: {
  miembros: MiembroVista[]; locales: Local[];
  puedeEditar: boolean; puedePin: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Equipo</h1>
        <p className="tenue text-sm">
          El alcance por local define que ve cada persona. Dueño y gerente general
          ven toda la organizacion.
        </p>
      </div>

      <ul className="space-y-2">
        {miembros.map((m) => (
          <FilaMiembro
            key={m.id} miembro={m} locales={locales}
            puedeEditar={puedeEditar} puedePin={puedePin}
          />
        ))}
      </ul>
    </div>
  );
}

function FilaMiembro({
  miembro, locales, puedeEditar, puedePin,
}: {
  miembro: MiembroVista; locales: Local[];
  puedeEditar: boolean; puedePin: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [role, setRole] = useState<Role>(miembro.role as Role);
  const [locationIds, setLocationIds] = useState<string[]>(miembro.locationIds);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const esOrgWide = ORG_WIDE_ROLES.includes(role);

  async function guardar() {
    setError(null); setOk(null); setGuardando(true);

    const res = await fetch(`/api/members/${miembro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, locationIds: esOrgWide ? [] : locationIds }),
    });
    const body: { error?: string } = await res.json().catch(() => ({}));
    setGuardando(false);

    if (!res.ok) { setError(body.error ?? 'No se pudo guardar'); return; }

    setOk('Cambios guardados');
    router.refresh();
  }

  async function guardarPin() {
    setError(null); setOk(null);

    const parsed = setPinSchema.safeParse({ membershipId: miembro.id, pin });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'PIN invalido');
      return;
    }

    setGuardando(true);
    const res = await fetch('/api/members/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    const body: { error?: string } = await res.json().catch(() => ({}));
    setGuardando(false);

    if (!res.ok) { setError(body.error ?? 'No se pudo asignar el PIN'); return; }

    setPin('');
    setOk('PIN actualizado');
    router.refresh();
  }

  return (
    <li className="tarjeta">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{miembro.nombre}</p>
          <p className="tenue truncate text-sm">
            {ROLE_LABELS[miembro.role as Role]}
            {miembro.jobTitle ? ` · ${miembro.jobTitle}` : ''}
            {miembro.hasPin ? ' · PIN asignado' : ''}
            {miembro.status !== 'active' ? ` · ${miembro.status}` : ''}
          </p>
        </div>
        {(puedeEditar || puedePin) && (
          <button type="button" className="boton-secundario px-3 py-1.5 text-xs"
                  onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Cerrar' : 'Editar'}
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: 'hsl(var(--borde))' }}>
          {puedeEditar && (
            <>
              <div>
                <label className="etiqueta" htmlFor={`rol-${miembro.id}`}>Rol</label>
                <select id={`rol-${miembro.id}`} className="campo"
                        value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="etiqueta">Locales</span>
                {esOrgWide ? (
                  <p className="tenue text-sm">
                    {ROLE_LABELS[role]} ve toda la organizacion: no hace falta asignar locales.
                  </p>
                ) : locales.length === 0 ? (
                  <p className="tenue text-sm">Todavia no hay locales creados.</p>
                ) : (
                  <div className="space-y-1.5">
                    {locales.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={locationIds.includes(l.id)}
                          onChange={(e) =>
                            setLocationIds((prev) =>
                              e.target.checked
                                ? [...prev, l.id]
                                : prev.filter((x) => x !== l.id))
                          }
                        />
                        {l.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className="boton" onClick={() => void guardar()} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          )}

          {puedePin && (
            <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--borde))' }}>
              <label className="etiqueta" htmlFor={`pin-${miembro.id}`}>
                PIN de kiosco (4 digitos)
              </label>
              <div className="flex gap-2">
                <input
                  id={`pin-${miembro.id}`} className="campo" inputMode="numeric"
                  maxLength={4} value={pin} autoComplete="off"
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" className="boton-secundario shrink-0"
                        onClick={() => void guardarPin()} disabled={guardando || pin.length !== 4}>
                  Asignar
                </button>
              </div>
              <p className="tenue mt-1 text-xs">
                Se guarda hasheado. Nadie, ni vos, puede volver a verlo.
              </p>
            </div>
          )}

          {error && <p role="alert" className="text-sm" style={{ color: 'hsl(var(--peligro))' }}>{error}</p>}
          {ok && <p className="text-sm" style={{ color: 'hsl(var(--acento))' }}>{ok}</p>}
        </div>
      )}
    </li>
  );
}
