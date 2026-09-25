'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Un consultor trabaja con varios restaurantes desde una sola cuenta.
 *
 * Cambiar de organizacion no es cosmetico: el servidor actualiza
 * `active_organization_id` y refresca el token para que el hook vuelva a
 * inyectar org_id. Por eso hace falta router.refresh() despues — los
 * Server Components tienen que releerse con los claims nuevos.
 */
interface Org {
  org_id: string;
  org_name: string;
  org_slug: string;
  role: string;
}

export function SelectorOrganizacion({ orgs, activa }: { orgs: Org[]; activa: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (orgs.length <= 1) return null;

  async function cambiar(organizationId: string) {
    if (organizationId === activa) return;
    setError(null);

    const res = await fetch('/api/auth/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    });

    if (!res.ok) {
      const body: { error?: string } = await res.json().catch(() => ({}));
      setError(body.error ?? 'No se pudo cambiar de organizacion');
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="org">Organizacion</label>
      <select
        id="org"
        className="campo w-auto py-1.5 text-sm"
        value={activa}
        disabled={pending}
        onChange={(e) => void cambiar(e.target.value)}
      >
        {orgs.map((o) => (
          <option key={o.org_id} value={o.org_id}>{o.org_name}</option>
        ))}
      </select>
      {error && <span className="text-xs" style={{ color: 'hsl(var(--peligro))' }}>{error}</span>}
    </div>
  );
}
