'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonSalir() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" className="boton-secundario px-3 py-1.5 text-xs"
            onClick={() => void salir()} disabled={saliendo}>
      {saliendo ? 'Saliendo…' : 'Salir'}
    </button>
  );
}
