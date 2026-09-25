import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { can } from '@restops/rbac';
import { PanelLocales } from './panel-locales';

export default async function LocalesPage() {
  const ctx = await getAuthContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from('location')
    .select('id, name, slug, city, province, timezone, business_day_start, status')
    .is('deleted_at', null)
    .order('name');

  return (
    <PanelLocales
      iniciales={data ?? []}
      puedeCrear={can(ctx, 'location:create')}
      puedeEditar={can(ctx, 'location:update')}
    />
  );
}
