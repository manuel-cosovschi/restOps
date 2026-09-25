/**
 * Arbol de UI administrativo. Puede ser mas denso que el kiosco: se usa
 * sentado, en escritorio o con el celular en la mano pero sin apuro.
 *
 * Si el JWT no trae org_id, no mostramos el dashboard roto: el hook de
 * access token no esta habilitado o el usuario todavia no tiene membresia,
 * y RLS le negaria todo igual.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/supabase/server';
import { ROLE_LABELS, type Role } from '@restops/rbac';
import { SelectorOrganizacion } from './selector-organizacion';
import { BotonSalir } from './boton-salir';

const NAV = [
  { href: '/dashboard', label: 'Hoy' },
  { href: '/locales', label: 'Locales' },
  { href: '/equipo', label: 'Equipo' },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx.userId) redirect('/login');

  if (!ctx.organizationId || !ctx.role) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="tarjeta space-y-3">
          <h1 className="text-lg font-semibold">Tu sesion no tiene organizacion activa</h1>
          <p className="tenue text-sm">
            Si acabas de crear la cuenta, cerra sesion y volve a entrar. Si el
            problema sigue, falta habilitar el hook de access token en Supabase
            (Authentication → Hooks → Customize Access Token Claims) — sin eso
            los claims vienen vacios y la base niega todo.
          </p>
          <BotonSalir />
        </div>
      </main>
    );
  }

  const orgActiva = ctx.orgs.find((o) => o.org_id === ctx.organizationId);

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 border-b backdrop-blur"
        style={{ borderColor: 'hsl(var(--borde))', backgroundColor: 'hsl(var(--fondo) / 0.85)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="font-bold tracking-tight">RestOps</Link>

          <SelectorOrganizacion orgs={ctx.orgs} activa={ctx.organizationId} />

          <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-70"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="tenue hidden text-xs sm:inline">
              {orgActiva?.org_name} · {ROLE_LABELS[ctx.role as Role]}
            </span>
            <BotonSalir />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
