import { redirect } from 'next/navigation';

/** El middleware ya manda a /login si no hay sesion. */
export default function Home() {
  redirect('/dashboard');
}
