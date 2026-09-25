import { createClient, getAuthContext } from '@/lib/supabase/server';
import { can } from '@restops/rbac';
import { PanelEquipo, type MiembroVista } from './panel-equipo';

export default async function EquipoPage() {
  const ctx = await getAuthContext();
  const supabase = await createClient();

  const [{ data: membresias }, { data: locales }] = await Promise.all([
    supabase
      .from('membership')
      .select(`
        id, role, display_name, job_title, status, pin_set_at,
        user_profile:user_id ( full_name ),
        membership_location ( location_id )
      `)
      .is('deleted_at', null)
      .order('created_at'),
    supabase
      .from('location')
      .select('id, name')
      .is('deleted_at', null)
      .order('name'),
  ]);

  const miembros: MiembroVista[] = (membresias ?? []).map((m) => {
    const perfil = Array.isArray(m.user_profile) ? m.user_profile[0] : m.user_profile;
    return {
      id: m.id,
      role: m.role,
      status: m.status,
      hasPin: m.pin_set_at !== null,
      jobTitle: m.job_title,
      nombre: (perfil?.full_name ?? '').trim() || m.display_name || 'Sin nombre',
      locationIds: (m.membership_location ?? []).map((ml) => ml.location_id),
    };
  });

  return (
    <PanelEquipo
      miembros={miembros}
      locales={locales ?? []}
      puedeEditar={can(ctx, 'member:update')}
      puedePin={can(ctx, 'member:set_pin')}
    />
  );
}
