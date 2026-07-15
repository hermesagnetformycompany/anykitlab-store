import {AdminDashboard} from '@/components/admin-dashboard';
import {AdminCatalogTools} from '@/components/admin-catalog-tools';
import {redirect} from 'next/navigation';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {loadAdminCatalogData, type AdminCatalogData} from '@/lib/admin-catalog-data';

export const dynamic = 'force-dynamic';

const emptyCatalog: AdminCatalogData = {products: [], categories: [], collections: [], media: []};

export default async function AdminPage() {
  const admin = await getVerifiedAdmin();
  if (!admin) redirect('/admin/login');

  const canManageCatalog = admin.role === 'Owner' || admin.role === 'Catalog manager';
  let catalog = emptyCatalog;
  let catalogError = '';

  if (canManageCatalog) {
    try {
      catalog = await loadAdminCatalogData();
    } catch (error) {
      catalogError = error instanceof Error ? error.message : 'Unable to load catalog data from Supabase.';
    }
  }

  return <><AdminDashboard />{canManageCatalog && <AdminCatalogTools initialData={catalog} initialError={catalogError} />}</>;
}
