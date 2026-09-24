import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RestOps',
  description: 'El sistema operativo de las operaciones internas de tu restaurante.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
