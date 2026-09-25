'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUpSchema } from '@restops/contracts';

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '', organizationName: '', email: '', password: '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set(campo: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});

    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      const porCampo: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '_');
        if (!(k in porCampo)) porCampo[k] = issue.message;
      }
      setFields(porCampo);
      return;
    }

    setEnviando(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    const body: {
      error?: string; fields?: Record<string, string>;
      pendingEmailConfirmation?: boolean; message?: string; warning?: string;
    } = await res.json().catch(() => ({}));
    setEnviando(false);

    if (res.status === 202 && body.pendingEmailConfirmation) {
      setAviso(body.message ?? 'Confirma tu correo para continuar.');
      return;
    }

    if (!res.ok) {
      if (body.fields) setFields(body.fields);
      setError(body.error ?? 'No se pudo crear la cuenta');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (aviso) {
    return (
      <div className="tarjeta space-y-3 text-center">
        <p className="text-sm">{aviso}</p>
        <Link href="/login" className="boton-secundario w-full">Ir a iniciar sesion</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="tarjeta space-y-4">
      <Campo id="fullName" label="Tu nombre" value={form.fullName}
             onChange={set('fullName')} error={fields.fullName} autoComplete="name" />

      <Campo id="organizationName" label="Nombre del negocio" value={form.organizationName}
             onChange={set('organizationName')} error={fields.organizationName}
             hint="Podes cambiarlo despues." />

      <Campo id="email" label="Email" type="email" value={form.email}
             onChange={set('email')} error={fields.email} autoComplete="email" />

      <Campo id="password" label="Contraseña" type="password" value={form.password}
             onChange={set('password')} error={fields.password}
             autoComplete="new-password" hint="Minimo 8 caracteres." />

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'hsl(var(--peligro))' }}>
          {error}
        </p>
      )}

      <button type="submit" className="boton w-full" disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear cuenta'}
      </button>

      <p className="tenue text-center text-sm">
        ¿Ya tenes cuenta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </form>
  );
}

function Campo({
  id, label, value, onChange, error, hint, type = 'text', autoComplete,
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; hint?: string; type?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label className="etiqueta" htmlFor={id}>{label}</label>
      <input
        id={id} type={type} className="campo" value={value} onChange={onChange}
        autoComplete={autoComplete} required
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      />
      {error
        ? <p id={`${id}-error`} className="mt-1 text-xs" style={{ color: 'hsl(var(--peligro))' }}>{error}</p>
        : hint ? <p className="tenue mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
