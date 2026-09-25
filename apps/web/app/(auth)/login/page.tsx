'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInSchema } from '@restops/contracts';

/**
 * El `next` viene de la URL, asi que es entrada del usuario.
 * Sin este filtro, /login?next=https://sitio-falso.tld manda al usuario
 * fuera del producto despues de un login exitoso (open redirect), que es
 * justo el momento en que mas confia en lo que ve.
 */
function destinoSeguro(next: string | null): Route {
  if (!next) return '/dashboard';
  // Solo rutas internas: ni absolutas (http://) ni protocol-relative (//host)
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next as Route;
}

/**
 * useSearchParams() obliga a un limite de Suspense para que Next pueda
 * prerenderizar el resto de la pagina.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="tarjeta h-64" aria-busy="true" />}>
      <FormularioLogin />
    </Suspense>
  );
}

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = destinoSeguro(params.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Misma validacion que el servidor: evita un round-trip para errores obvios
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }

    setEnviando(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setEnviando(false);

    if (!res.ok) {
      const body: { error?: string } = await res.json().catch(() => ({}));
      setError(body.error ?? 'No se pudo iniciar sesion');
      return;
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="tarjeta space-y-4">
      <div>
        <label className="etiqueta" htmlFor="email">Email</label>
        <input
          id="email" type="email" autoComplete="email" required
          className="campo" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="etiqueta" htmlFor="password">Contraseña</label>
        <input
          id="password" type="password" autoComplete="current-password" required
          className="campo" value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'hsl(var(--peligro))' }}>
          {error}
        </p>
      )}

      <button type="submit" className="boton w-full" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="tenue text-center text-sm">
        ¿Todavia no tenes cuenta?{' '}
        <Link href="/signup" className="underline">Crear una</Link>
      </p>
    </form>
  );
}
