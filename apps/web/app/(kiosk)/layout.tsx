/**
 * Arbol de UI del kiosco. Nada que ver con el admin:
 * una mano, guantes, apuro, vapor y luz mala.
 *
 * Sin barra de navegacion, sin menues anidados, sin scroll horizontal.
 * Los controles reales llegan en el Sprint 3; esto fija el marco.
 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--fondo))' }}>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
    </div>
  );
}
