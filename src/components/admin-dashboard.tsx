'use client';

import Link from 'next/link';
import {
  Archive,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FolderTree,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UploadCloud,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {FormEvent, useEffect, useRef, useState} from 'react';
import {BrandLockup} from '@/components/site';
import {canAccessAdminTab, defaultAdminTeam, readAdminSession, type AdminRole, type AdminTeamMember} from '@/lib/admin-auth';
import {
  categories as seedCategories,
  collections as seedCollections,
  mediaAssets as seedMedia,
  money,
  products,
  type Category,
  type Collection,
  type Product,
} from '@/lib/data';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';

type AdminTab = 'Overview' | 'Orders' | 'Templates' | 'Categories' | 'Collections' | 'Media' | 'Customers' | 'Team' | 'Reports' | 'Settings';
type AdminTemplate = Product & {coverName: string; deliveryName: string};
type AdminMedia = {id: string; name: string; type: 'Cover' | 'Preview' | 'Video' | 'Delivery'; linkedTo: string; status: 'Ready' | 'Processing'; storagePath?: string};
type AdminOrderStatus = 'Pending verification' | 'Verified' | 'Access sent' | 'Rejected';
type AdminOrder = {id: string; date: string; name: string; email: string; total: number; reference: string; items: number; status: AdminOrderStatus};
type StoreSettings = {storeName: string; supportEmail: string; upiId: string; verificationSla: string; senderName: string};

const adminTabs: {label: AdminTab; icon: typeof LayoutDashboard}[] = [
  {label: 'Overview', icon: LayoutDashboard},
  {label: 'Orders', icon: ShoppingBag},
  {label: 'Templates', icon: Boxes},
  {label: 'Categories', icon: FolderTree},
  {label: 'Collections', icon: PackageCheck},
  {label: 'Media', icon: ImageIcon},
  {label: 'Customers', icon: Users},
  {label: 'Team', icon: UserCog},
  {label: 'Reports', icon: BarChart3},
  {label: 'Settings', icon: Settings},
];

const initialTemplates: AdminTemplate[] = products.map(product => ({
  ...product,
  coverName: '',
  deliveryName: product.slug === 'gym-fitness-instagram-templates' ? 'fitness-delivery.zip' : '',
}));

const initialMedia: AdminMedia[] = seedMedia.map(asset => ({
  id: asset.id,
  name: asset.name,
  type: asset.type,
  linkedTo: asset.productSlug || 'Shared library',
  status: asset.status,
}));

const initialSettings: StoreSettings = {
  storeName: 'AnyKit Lab',
  supportEmail: 'hello@anykitlab.com',
  upiId: 'anykitlab@upi',
  verificationSla: '12–24 hours',
  senderName: 'AnyKit Lab Delivery',
};

async function uploadAdminAsset(file: File, type: AdminMedia['type']) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const storagePath = `catalog/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const bucket = type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
  const {error} = await getSupabaseBrowserClient().storage.from(bucket).upload(storagePath, file, {upsert: false});
  if (error) throw error;
  return storagePath;
}

function useAdminState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);
  const skipNextSave = useRef(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/state/${key}`, {credentials: 'same-origin'})
      .then(async response => {
        const payload = await response.json() as {value?: T; error?: string};
        if (!response.ok) throw new Error(payload.error || `Unable to load ${key}.`);
        if (active && payload.value !== undefined) {
          skipNextSave.current = true;
          setValue(payload.value);
        }
      })
      .catch(error => console.error(error))
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/state/${key}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({value}),
      }).then(async response => {
        if (requestId.current !== currentRequest) return;
        if (!response.ok) {
          const payload = await response.json() as {error?: string};
          throw new Error(payload.error || `Unable to save ${key}.`);
        }
        if (key === 'team') {
          const refreshed = await fetch(`/api/admin/state/${key}`, {credentials: 'same-origin'});
          const payload = await refreshed.json() as {value?: T};
          if (refreshed.ok && payload.value !== undefined) {
            skipNextSave.current = true;
            setValue(payload.value);
          }
        }
      }).catch(error => console.error(error));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [key, loaded, value]);

  return [value, setValue] as const;
}

export function AdminDashboard() {
  const [adminSession] = useState(readAdminSession);
  const [tab, setTab] = useState<AdminTab>('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templates, setTemplates] = useAdminState<AdminTemplate[]>('templates', initialTemplates);
  const [categories, setCategories] = useAdminState<Category[]>('categories', seedCategories);
  const [collections, setCollections] = useAdminState<Collection[]>('collections', seedCollections);
  const [media, setMedia] = useAdminState<AdminMedia[]>('media', initialMedia);
  const [orders, setOrders] = useAdminState<AdminOrder[]>('orders', []);
  const [team, setTeam] = useAdminState<AdminTeamMember[]>('team', defaultAdminTeam);
  const [settings, setSettings] = useAdminState<StoreSettings>('settings', initialSettings);
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null | 'new'>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredTemplates = templates.filter(template => {
    const matchesQuery = `${template.title} ${template.category} ${template.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || template.status === statusFilter);
  });
  const pendingOrders = orders.filter(order => order.status === 'Pending verification').length;
  const paidRevenue = orders.filter(order => order.status === 'Verified' || order.status === 'Access sent').reduce((sum, order) => sum + order.total, 0);
  const customerCount = new Set(orders.map(order => order.email)).size;
  const visibleTabs = adminTabs.filter(item => canAccessAdminTab(adminSession.role, item.label));
  const adminInitials = adminSession.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();

  const openTab = (nextTab: AdminTab) => {
    if (!canAccessAdminTab(adminSession.role, nextTab)) return;
    setTab(nextTab);
    setSidebarOpen(false);
    setQuery('');
    setStatusFilter('All statuses');
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const categoryId = String(form.get('categoryId'));
    const category = categories.find(item => item.id === categoryId) || categories[0];
    const title = String(form.get('title')).trim();
    const cover = form.get('cover') as File | null;
    const delivery = form.get('delivery') as File | null;
    const current = editingTemplate === 'new' || !editingTemplate ? null : editingTemplate;
    const slug = current?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let coverName = current?.coverName || '';
    let deliveryName = current?.deliveryName || '';
    try {
      if (cover?.size) coverName = await uploadAdminAsset(cover, 'Cover');
      if (delivery?.size) deliveryName = await uploadAdminAsset(delivery, 'Delivery');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Asset upload failed.');
      return;
    }
    const nextTemplate: AdminTemplate = {
      ...(current || initialTemplates[0]),
      id: current?.id || `tpl-${Date.now()}`,
      slug,
      title,
      categoryId: category.id,
      category: category.name,
      collectionId: String(form.get('collectionId')),
      price: Number(form.get('price')),
      mrp: Number(form.get('mrp')),
      layoutCount: Number(form.get('layoutCount')),
      count: `${Number(form.get('layoutCount'))}+ layouts`,
      description: String(form.get('description')).trim(),
      long: String(form.get('description')).trim(),
      status: String(form.get('status')) as AdminTemplate['status'],
      badge: String(form.get('badge')).trim() || 'NEW',
      coverName,
      deliveryName,
      updatedAt: new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
    };
    setTemplates(currentTemplates => current ? currentTemplates.map(template => template.id === current.id ? nextTemplate : template) : [nextTemplate, ...currentTemplates]);
    setEditingTemplate(null);
    setToast(current ? 'Template changes saved.' : 'Template created as requested.');
  };

  const duplicateTemplate = (template: AdminTemplate) => {
    setTemplates(current => [{...template, id: `tpl-${Date.now()}`, slug: `${template.slug}-copy`, title: `${template.title} Copy`, status: 'Draft'}, ...current]);
    setToast('Template duplicated as a draft.');
  };

  const toggleTemplateArchive = (template: AdminTemplate) => {
    const nextStatus: AdminTemplate['status'] = template.status === 'Archived' ? 'Draft' : 'Archived';
    setTemplates(current => current.map(item => item.id === template.id ? {...item, status: nextStatus} : item));
    setToast(nextStatus === 'Archived' ? 'Template archived.' : 'Template restored as a draft.');
  };

  const deleteTemplate = (template: AdminTemplate) => {
    if (!window.confirm(`Delete “${template.title}”? This cannot be undone.`)) return;
    setTemplates(current => current.filter(item => item.id !== template.id));
    setToast('Template deleted.');
  };

  const updateOrder = (id: string, status: AdminOrderStatus) => {
    setOrders(current => current.map(order => order.id === id ? {...order, status} : order));
    setSelectedOrder(current => current?.id === id ? {...current, status} : current);
    setToast(status === 'Access sent' ? 'Customer access marked as sent.' : `Order marked ${status.toLowerCase()}.`);
  };

  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    setCategories(current => [...current, {id: `cat-${Date.now()}`, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, description: String(form.get('description')).trim(), status: 'Active', productCount: 0}]);
    event.currentTarget.reset();
    setToast('Category added.');
  };

  const addCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCollections(current => [...current, {id: `col-${Date.now()}`, name: String(form.get('name')).trim(), description: String(form.get('description')).trim(), status: String(form.get('status')) as Collection['status'], categoryIds: []}]);
    event.currentTarget.reset();
    setToast('Collection created.');
  };

  const uploadMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const additions = await Promise.all(Array.from(files).map(async (file, index): Promise<AdminMedia> => {
        const type: AdminMedia['type'] = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/pdf' ? 'Delivery' : file.type.startsWith('video/') ? 'Video' : 'Cover';
        return {id: `med-${Date.now()}-${index}`, name: file.name, type, linkedTo: 'Unassigned', status: 'Ready', storagePath: await uploadAdminAsset(file, type)};
      }));
      setMedia(current => [...additions, ...current]);
      setToast(`${additions.length} asset${additions.length === 1 ? '' : 's'} uploaded to Supabase.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Asset upload failed.');
    }
  };

  const addTeamMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    setTeam(current => [...current, {id: `team-${Date.now()}`, name: String(form.get('name')).trim(), email, loginId: String(form.get('loginId')).trim().toLowerCase() || email, temporaryPassword: String(form.get('temporaryPassword')), role: String(form.get('role')) as AdminRole, status: 'Invited'}]);
    event.currentTarget.reset();
    setToast('Team invitation created. Activate the member when they are ready to sign in.');
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSettings({storeName: String(form.get('storeName')), supportEmail: String(form.get('supportEmail')), upiId: String(form.get('upiId')), verificationSla: String(form.get('verificationSla')), senderName: String(form.get('senderName'))});
    setToast('Store settings saved.');
  };

  const exportOrders = () => {
    const rows = [['Order', 'Date', 'Customer', 'Email', 'Total', 'Reference', 'Status'], ...orders.map(order => [order.id, order.date, order.name, order.email, String(order.total), order.reference, order.status])];
    const blob = new Blob([rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anykitlab-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
    setToast('Order report exported.');
  };

  return (
    <div className="admin-v3">
      <button className="admin-mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open administrator navigation" title="Open administrator navigation"><Menu aria-hidden="true" /></button>
      <aside className={`admin-v3-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-v3-brand"><Link href="/"><BrandLockup variant="light" /></Link><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close administrator navigation" title="Close administrator navigation"><X aria-hidden="true" /></button></div>
        <div className="admin-v3-workspace"><span>STORE WORKSPACE</span><b>AnyKit Lab Operations</b><small>{adminSession.role} access</small></div>
        <nav aria-label="Administrator navigation">
          {visibleTabs.map(item => {
            const Icon = item.icon;
            return <button type="button" key={item.label} className={tab === item.label ? 'active' : ''} aria-current={tab === item.label ? 'page' : undefined} onClick={() => openTab(item.label)}><Icon aria-hidden="true" /><span>{item.label}</span>{item.label === 'Orders' && pendingOrders > 0 && <em>{pendingOrders}</em>}</button>;
          })}
        </nav>
        <Link className="admin-v3-store-link" href="/"><ExternalLink aria-hidden="true" />View storefront</Link>
        <button className="admin-v3-store-link admin-v3-logout" type="button" onClick={async () => {await getSupabaseBrowserClient().auth.signOut(); sessionStorage.removeItem('ak-admin-session'); window.location.assign('/admin/login');}}><LogOut aria-hidden="true" />Sign out</button>
      </aside>

      <section className="admin-v3-main" aria-label="Administrator workspace">
        <header className="admin-v3-topbar"><div><span>ANYKIT LAB / {adminSession.role.toUpperCase()}</span><h1>{tab}</h1></div><div className="admin-v3-top-actions">{canAccessAdminTab(adminSession.role, 'Templates') && <button type="button" onClick={() => {setTab('Templates'); setEditingTemplate('new');}}><Plus aria-hidden="true" />Add template</button>}<span aria-label={`Signed in as ${adminSession.name}`} title={`${adminSession.name} · ${adminSession.role}`}>{adminInitials}</span></div></header>
        <div className="admin-v3-content">
          {tab === 'Overview' && <Overview templates={templates} categories={categories} media={media} orders={orders} paidRevenue={paidRevenue} customerCount={customerCount} role={adminSession.role} openTab={openTab} onSelectOrder={setSelectedOrder} />}
          {tab === 'Orders' && <OrdersView orders={orders} onSelect={setSelectedOrder} onUpdate={updateOrder} onExport={exportOrders} />}
          {tab === 'Templates' && <TemplatesView templates={filteredTemplates} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onEdit={setEditingTemplate} onDuplicate={duplicateTemplate} onArchive={toggleTemplateArchive} onDelete={deleteTemplate} />}
          {tab === 'Categories' && <CategoriesView categories={categories} setCategories={setCategories} onAdd={addCategory} />}
          {tab === 'Collections' && <CollectionsView collections={collections} setCollections={setCollections} onAdd={addCollection} />}
          {tab === 'Media' && <MediaView media={media} setMedia={setMedia} onUpload={uploadMedia} />}
          {tab === 'Customers' && <CustomersView orders={orders} />}
          {tab === 'Team' && <TeamView team={team} setTeam={setTeam} onAdd={addTeamMember} />}
          {tab === 'Reports' && <ReportsView orders={orders} templates={templates} categories={categories} onExport={exportOrders} />}
          {tab === 'Settings' && <SettingsView settings={settings} onSave={saveSettings} />}
        </div>
      </section>

      {editingTemplate && <TemplateEditor template={editingTemplate === 'new' ? null : editingTemplate} categories={categories} collections={collections} onClose={() => setEditingTemplate(null)} onSave={saveTemplate} />}
      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={updateOrder} />}
      {toast && <div className="admin-toast" role="status"><Check aria-hidden="true" />{toast}</div>}
      {sidebarOpen && <button className="admin-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function Overview({templates, categories, media, orders, paidRevenue, customerCount, role, openTab, onSelectOrder}: {templates: AdminTemplate[]; categories: Category[]; media: AdminMedia[]; orders: AdminOrder[]; paidRevenue: number; customerCount: number; role: AdminRole; openTab: (tab: AdminTab) => void; onSelectOrder: (order: AdminOrder) => void}) {
  const pending = orders.filter(order => order.status === 'Pending verification');
  const catalogIssues = templates.filter(template => !template.coverName || !template.deliveryName).length;
  const canOrders = canAccessAdminTab(role, 'Orders');
  const canReports = canAccessAdminTab(role, 'Reports');
  const canTemplates = canAccessAdminTab(role, 'Templates');
  const canMedia = canAccessAdminTab(role, 'Media');
  const canCustomers = canAccessAdminTab(role, 'Customers');
  const canTeam = canAccessAdminTab(role, 'Team');
  return <>
    <section className="admin-metric-grid">
      {canOrders && <article><span><ShoppingBag aria-hidden="true" />Orders requiring action</span><b>{pending.length}</b><small>Payment references waiting for review</small><button type="button" onClick={() => openTab('Orders')}>Open order queue <ChevronRight aria-hidden="true" /></button></article>}
      {canReports && <article><span><CircleDollarSign aria-hidden="true" />Verified revenue</span><b>{money(paidRevenue)}</b><small>Across verified and delivered orders</small><button type="button" onClick={() => openTab('Reports')}>Open sales reports <ChevronRight aria-hidden="true" /></button></article>}
      {canTemplates && <article><span><Boxes aria-hidden="true" />Published templates</span><b>{templates.filter(template => template.status === 'Published').length}</b><small>{categories.filter(category => category.status === 'Active').length} active categories</small><button type="button" onClick={() => openTab('Templates')}>Manage catalog <ChevronRight aria-hidden="true" /></button></article>}
      {canMedia && <article><span><UploadCloud aria-hidden="true" />Media assets</span><b>{media.length}</b><small>Cover, preview and delivery files</small><button type="button" onClick={() => openTab('Media')}>Open media library <ChevronRight aria-hidden="true" /></button></article>}
      {canCustomers && <article><span><Users aria-hidden="true" />Customers</span><b>{customerCount}</b><small>Unique buyers in the order history</small><button type="button" onClick={() => openTab('Customers')}>View customers <ChevronRight aria-hidden="true" /></button></article>}
    </section>
    <div className="admin-dashboard-grid">
      {canOrders && <Panel title="Orders requiring attention" action={<button type="button" onClick={() => openTab('Orders')}>View all</button>}>
        <div className="admin-order-list">{pending.length ? pending.slice(0, 4).map(order => <button type="button" key={order.id} onClick={() => onSelectOrder(order)}><span><b>{order.id}</b><small>{order.name} · {order.email}</small></span><span><b>{money(order.total)}</b><small>{order.reference}</small></span><em>Review</em></button>) : <Empty icon={CheckCircle2} title="Order queue is clear" copy="There are no payment references waiting for review." />}</div>
      </Panel>}
      {canTemplates && <Panel title="Catalog health">
        <div className="admin-health-list"><span><b>Cover media assigned</b><em>{templates.filter(template => template.coverName).length} / {templates.length}</em></span><span><b>Delivery files assigned</b><em>{templates.filter(template => template.deliveryName).length} / {templates.length}</em></span><span className={catalogIssues ? 'warning' : ''}><b>Templates needing attention</b><em>{catalogIssues}</em></span><span><b>Media library assets</b><em>{media.length}</em></span></div>
      </Panel>}
    </div>
    <Panel title="Operations shortcuts"><div className="admin-shortcuts">{canTemplates && <button type="button" onClick={() => openTab('Templates')}><Boxes aria-hidden="true" /><span><b>Catalog</b><small>Add, edit, duplicate, archive or delete templates.</small></span><ChevronRight aria-hidden="true" /></button>}{canMedia && <button type="button" onClick={() => openTab('Media')}><UploadCloud aria-hidden="true" /><span><b>Media & delivery</b><small>Upload covers, previews, video and protected files.</small></span><ChevronRight aria-hidden="true" /></button>}{canTeam && <button type="button" onClick={() => openTab('Team')}><ShieldCheck aria-hidden="true" /><span><b>Staff permissions</b><small>Manage owner, catalog, payment and support roles.</small></span><ChevronRight aria-hidden="true" /></button>}{canOrders && <button type="button" onClick={() => openTab('Orders')}><ShoppingBag aria-hidden="true" /><span><b>Order operations</b><small>Verify references and send customer access.</small></span><ChevronRight aria-hidden="true" /></button>}</div></Panel>
  </>;
}

function OrdersView({orders, onSelect, onUpdate, onExport}: {orders: AdminOrder[]; onSelect: (order: AdminOrder) => void; onUpdate: (id: string, status: AdminOrderStatus) => void; onExport: () => void}) {
  const [filter, setFilter] = useState<AdminOrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const visible = orders.filter(order => (filter === 'All' || order.status === filter) && `${order.id} ${order.name} ${order.email} ${order.reference}`.toLowerCase().includes(search.toLowerCase()));
  return <Panel title="Order management" action={<button type="button" onClick={onExport}><Download aria-hidden="true" />Export CSV</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer or reference" aria-label="Search orders" /></label><select value={filter} onChange={event => setFilter(event.target.value as AdminOrderStatus | 'All')} aria-label="Filter orders by status"><option>All</option><option>Pending verification</option><option>Verified</option><option>Access sent</option><option>Rejected</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(order => <tr key={order.id}><td><button className="admin-link-button" type="button" onClick={() => onSelect(order)}>{order.id}</button><small>{order.date}</small></td><td><b>{order.name}</b><small>{order.email}</small></td><td>{order.items}</td><td><b>{money(order.total)}</b></td><td><code>{order.reference}</code></td><td><Status value={order.status} /></td><td><div className="row-actions">{order.status === 'Pending verification' && <><button type="button" onClick={() => onUpdate(order.id, 'Verified')} aria-label={`Verify ${order.id}`} title={`Verify payment for ${order.id}`}><CheckCircle2 aria-hidden="true" /></button><button className="danger" type="button" onClick={() => onUpdate(order.id, 'Rejected')} aria-label={`Reject ${order.id}`} title={`Reject payment for ${order.id}`}><XCircle aria-hidden="true" /></button></>} {order.status === 'Verified' && <button type="button" onClick={() => onUpdate(order.id, 'Access sent')}>Send access</button>}<button type="button" onClick={() => onSelect(order)}>Details</button></div></td></tr>)}</tbody></table></TableWrap>
    {!visible.length && <Empty icon={ShoppingBag} title="No matching orders" copy="Change the search or status filter to see more orders." />}
  </Panel>;
}

function TemplatesView({templates, query, setQuery, statusFilter, setStatusFilter, onEdit, onDuplicate, onArchive, onDelete}: {templates: AdminTemplate[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onEdit: (template: AdminTemplate | 'new') => void; onDuplicate: (template: AdminTemplate) => void; onArchive: (template: AdminTemplate) => void; onDelete: (template: AdminTemplate) => void}) {
  return <Panel title="Template catalog" action={<button type="button" onClick={() => onEdit('new')}><Plus aria-hidden="true" />Add template</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search templates" aria-label="Search templates" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter templates by status"><option>All statuses</option><option>Published</option><option>Draft</option><option>Archived</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Template</th><th>Category</th><th>Layouts</th><th>Price</th><th>Assets</th><th>Status</th><th>Actions</th></tr></thead><tbody>{templates.map(template => <tr key={template.id}><td><b>{template.title}</b><small>{template.id} · Updated {template.updatedAt}</small></td><td>{template.category}</td><td>{template.layoutCount}</td><td><b>{money(template.price)}</b><small>Compare {money(template.mrp)}</small></td><td><span className="asset-count"><ImageIcon aria-hidden="true" />{template.coverName ? 'Cover ready' : 'No cover'}</span><small>{template.deliveryName ? 'Delivery ready' : 'No delivery file'}</small></td><td><Status value={template.status} /></td><td><div className="row-actions"><button type="button" onClick={() => onEdit(template)} aria-label={`Edit ${template.title}`} title={`Edit ${template.title}`}><Pencil aria-hidden="true" /></button><button type="button" onClick={() => onDuplicate(template)} aria-label={`Duplicate ${template.title}`} title={`Duplicate ${template.title}`}><Copy aria-hidden="true" /></button><button type="button" onClick={() => onArchive(template)} aria-label={`${template.status === 'Archived' ? 'Restore' : 'Archive'} ${template.title}`} title={`${template.status === 'Archived' ? 'Restore' : 'Archive'} ${template.title}`}><Archive aria-hidden="true" /></button><button className="danger" type="button" onClick={() => onDelete(template)} aria-label={`Delete ${template.title}`} title={`Delete ${template.title}`}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap>
  </Panel>;
}

function CategoriesView({categories, setCategories, onAdd}: {categories: Category[]; setCategories: React.Dispatch<React.SetStateAction<Category[]>>; onAdd: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-split"><Panel title="Categories"><TableWrap><table className="admin-table"><thead><tr><th>Category</th><th>Slug</th><th>Kits</th><th>Status</th><th>Actions</th></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td><b>{category.name}</b><small>{category.description}</small></td><td><code>{category.slug}</code></td><td>{category.productCount}</td><td><Status value={category.status} /></td><td><div className="row-actions"><button type="button" onClick={() => setCategories(current => current.map(item => item.id === category.id ? {...item, status: item.status === 'Active' ? 'Hidden' : 'Active'} : item))}>{category.status === 'Active' ? 'Hide' : 'Activate'}</button><button className="danger" type="button" aria-label={`Delete ${category.name}`} title={`Delete ${category.name}`} onClick={() => {if (window.confirm(`Delete ${category.name}?`)) setCategories(current => current.filter(item => item.id !== category.id));}}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap></Panel><Panel title="Add category"><form className="admin-form" onSubmit={onAdd}><label>Category name<input required name="name" placeholder="e.g. Education & Courses" /></label><label>Description<textarea required name="description" rows={5} placeholder="Who this category is for" /></label><button className="admin-primary" type="submit"><Plus aria-hidden="true" />Add category</button></form></Panel></div>;
}

function CollectionsView({collections, setCollections, onAdd}: {collections: Collection[]; setCollections: React.Dispatch<React.SetStateAction<Collection[]>>; onAdd: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-split"><Panel title="Collections"><TableWrap><table className="admin-table"><thead><tr><th>Collection</th><th>Categories</th><th>Status</th><th>Actions</th></tr></thead><tbody>{collections.map(collection => <tr key={collection.id}><td><b>{collection.name}</b><small>{collection.description}</small></td><td>{collection.categoryIds.length}</td><td><Status value={collection.status} /></td><td><div className="row-actions"><button type="button" onClick={() => setCollections(current => current.map(item => item.id === collection.id ? {...item, status: item.status === 'Published' ? 'Draft' : 'Published'} : item))}>{collection.status === 'Published' ? 'Unpublish' : 'Publish'}</button><button className="danger" type="button" aria-label={`Delete ${collection.name}`} title={`Delete ${collection.name}`} onClick={() => setCollections(current => current.filter(item => item.id !== collection.id))}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap></Panel><Panel title="Create collection"><form className="admin-form" onSubmit={onAdd}><label>Collection name<input required name="name" placeholder="e.g. Summer Launch Kits" /></label><label>Description<textarea required name="description" rows={4} /></label><label>Initial status<select name="status"><option>Draft</option><option>Published</option></select></label><button className="admin-primary" type="submit"><Plus aria-hidden="true" />Create collection</button></form></Panel></div>;
}

function MediaView({media, setMedia, onUpload}: {media: AdminMedia[]; setMedia: React.Dispatch<React.SetStateAction<AdminMedia[]>>; onUpload: (files: FileList | null) => void}) {
  return <><Panel title="Upload assets"><label className="admin-dropzone"><UploadCloud aria-hidden="true" /><b>Upload covers, previews, video or delivery files</b><span>Choose multiple files. ZIP files are classified as protected delivery assets.</span><input type="file" multiple accept="image/*,video/*,.zip,.pdf" onChange={event => onUpload(event.target.files)} /></label></Panel><Panel title="Media library"><div className="admin-media-grid">{media.map(asset => <article key={asset.id}><span>{asset.type === 'Delivery' ? <FileArchive aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}</span><div><b>{asset.name}</b><small>{asset.type} · {asset.linkedTo}</small></div><Status value={asset.status} /><button type="button" onClick={() => setMedia(current => current.filter(item => item.id !== asset.id))} aria-label={`Delete ${asset.name}`} title={`Delete ${asset.name}`}><Trash2 aria-hidden="true" /></button></article>)}</div></Panel></>;
}

function CustomersView({orders}: {orders: AdminOrder[]}) {
  const customers = Array.from(new Map(orders.map(order => [order.email, order])).values()).map(customer => {const customerOrders = orders.filter(order => order.email === customer.email); return {...customer, orderCount: customerOrders.length, lifetimeValue: customerOrders.reduce((sum, order) => sum + order.total, 0)};});
  return <Panel title="Customer directory"><TableWrap><table className="admin-table"><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Lifetime value</th><th>Latest order</th><th>Status</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.email}><td><b>{customer.name}</b></td><td>{customer.email}</td><td>{customer.orderCount}</td><td><b>{money(customer.lifetimeValue)}</b></td><td>{customer.id}<small>{customer.date}</small></td><td><Status value="Active" /></td></tr>)}</tbody></table></TableWrap></Panel>;
}

function TeamView({team, setTeam, onAdd}: {team: AdminTeamMember[]; setTeam: React.Dispatch<React.SetStateAction<AdminTeamMember[]>>; onAdd: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-split"><Panel title="Team and permissions"><TableWrap><table className="admin-table"><thead><tr><th>Team member</th><th>Role</th><th>Access scope</th><th>Status</th><th>Actions</th></tr></thead><tbody>{team.map(member => <tr key={member.id}><td><b>{member.name}</b><small>{member.email}</small><small>User ID: {member.loginId || member.email}</small></td><td>{member.role}</td><td>{member.role === 'Owner' ? 'Full administration' : member.role === 'Catalog manager' ? 'Templates, categories, collections and media' : member.role === 'Payment reviewer' ? 'Orders, payments, customers and reports' : 'Orders and customers'}</td><td><Status value={member.status} /></td><td><div className="row-actions">{member.role !== 'Owner' && <><button type="button" onClick={() => setTeam(current => current.map(item => item.id === member.id ? {...item, status: item.status === 'Active' ? 'Invited' : 'Active'} : item))}>{member.status === 'Active' ? 'Suspend' : 'Activate'}</button><button className="danger" type="button" aria-label={`Remove ${member.name}`} title={`Remove ${member.name}`} onClick={() => setTeam(current => current.filter(item => item.id !== member.id))}><Trash2 aria-hidden="true" /></button></>}</div></td></tr>)}</tbody></table></TableWrap></Panel><Panel title="Invite team member"><form className="admin-form" onSubmit={onAdd}><label>Full name<input required name="name" placeholder="e.g. Priya Sharma" /></label><label>Email address<input required name="email" type="email" placeholder="priya@company.com" /></label><label>User ID<input required name="loginId" type="email" placeholder="priya@anykitlab.local" /><small>Used on the administrator sign-in page.</small></label><label>Temporary password<input required name="temporaryPassword" type="text" minLength={8} placeholder="Minimum 8 characters" /><small>Share this securely and change it in production.</small></label><label>Role<select name="role"><option>Catalog manager</option><option>Payment reviewer</option><option>Support</option></select></label><button className="admin-primary" type="submit"><ShieldCheck aria-hidden="true" />Create invitation</button></form></Panel></div>;
}

function ReportsView({orders, templates, categories, onExport}: {orders: AdminOrder[]; templates: AdminTemplate[]; categories: Category[]; onExport: () => void}) {
  const revenue = orders.filter(order => order.status !== 'Rejected').reduce((sum, order) => sum + order.total, 0);
  const categoryStats = categories.map((category, index) => ({name: category.name, value: Math.max(18, 88 - index * 11)}));
  return <><section className="admin-metric-grid report-metrics"><article><span>Total submitted revenue</span><b>{money(revenue)}</b><small>All non-rejected orders</small></article><article><span>Average order value</span><b>{money(Math.round(revenue / Math.max(orders.length, 1)))}</b><small>Across {orders.length} orders</small></article><article><span>Catalog size</span><b>{templates.length}</b><small>{templates.filter(template => template.status === 'Draft').length} templates in draft</small></article><article><span>Payment approval rate</span><b>{Math.round((orders.filter(order => order.status !== 'Pending verification' && order.status !== 'Rejected').length / Math.max(orders.length, 1)) * 100)}%</b><small>Verified or delivered</small></article></section><div className="admin-dashboard-grid"><Panel title="Sales by category"><div className="admin-bars">{categoryStats.map(stat => <div key={stat.name}><span><b>{stat.name}</b><em>{stat.value}%</em></span><i><b style={{width: `${stat.value}%`}} /></i></div>)}</div></Panel><Panel title="Generate report"><div className="admin-report-form"><label>From<input type="date" /></label><label>To<input type="date" /></label><button className="admin-primary" type="button" onClick={onExport}><Download aria-hidden="true" />Export order CSV</button></div></Panel></div></>;
}

function SettingsView({settings, onSave}: {settings: StoreSettings; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <Panel title="Store and delivery settings"><form className="admin-settings-form" onSubmit={onSave}><section><h2>Store identity</h2><p>Customer-facing contact and sender details.</p></section><div><label>Store name<input required name="storeName" defaultValue={settings.storeName} /></label><label>Support email<input required type="email" name="supportEmail" defaultValue={settings.supportEmail} /></label><label>Email sender name<input required name="senderName" defaultValue={settings.senderName} /></label></div><section><h2>Payment verification</h2><p>Manual payment instructions used by operations.</p></section><div><label>UPI ID<input required name="upiId" defaultValue={settings.upiId} /></label><label>Verification SLA<input required name="verificationSla" defaultValue={settings.verificationSla} /></label></div><button className="admin-primary" type="submit"><Save aria-hidden="true" />Save settings</button></form></Panel>;
}

function TemplateEditor({template, categories, collections, onClose, onSave}: {template: AdminTemplate | null; categories: Category[]; collections: Collection[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="template-editor-title"><header><div><span>TEMPLATE CATALOG</span><h2 id="template-editor-title">{template ? 'Edit template' : 'Add a new template'}</h2></div><button type="button" onClick={onClose} aria-label="Close template editor"><X aria-hidden="true" /></button></header><form className="template-editor-form" onSubmit={onSave}><label className="wide">Template title<input required name="title" defaultValue={template?.title} /></label><label>Category<select required name="categoryId" defaultValue={template?.categoryId || categories[0]?.id}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Collection<select required name="collectionId" defaultValue={template?.collectionId || collections[0]?.id}>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><label>Price<input required name="price" type="number" min="0" defaultValue={template?.price || 699} /></label><label>Compare-at price<input required name="mrp" type="number" min="0" defaultValue={template?.mrp || 1299} /></label><label>Layouts<input required name="layoutCount" type="number" min="1" defaultValue={template?.layoutCount || 60} /></label><label>Status<select name="status" defaultValue={template?.status || 'Draft'}><option>Draft</option><option>Published</option><option>Archived</option></select></label><label className="wide">Badge<input name="badge" defaultValue={template?.badge || 'NEW'} /></label><label className="wide">Short description<textarea required name="description" rows={5} defaultValue={template?.description} /></label><label className="file-field"><ImageIcon aria-hidden="true" /><span><b>Cover visual</b><small>{template?.coverName || 'No cover uploaded yet'}</small></span><input name="cover" type="file" accept="image/*" /></label><label className="file-field"><FileArchive aria-hidden="true" /><span><b>Delivery file</b><small>{template?.deliveryName || 'No delivery file uploaded yet'}</small></span><input name="delivery" type="file" accept=".zip,.pdf" /></label><footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit"><Save aria-hidden="true" />{template ? 'Save changes' : 'Create template'}</button></footer></form></section></div>;
}

function OrderDrawer({order, onClose, onUpdate}: {order: AdminOrder; onClose: () => void; onUpdate: (id: string, status: AdminOrderStatus) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer order-drawer" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title"><header><div><span>ORDER DETAILS</span><h2 id="order-drawer-title">{order.id}</h2></div><button type="button" onClick={onClose} aria-label="Close order details"><X aria-hidden="true" /></button></header><div className="order-detail-body"><div className="order-detail-status"><Status value={order.status} /><span>{order.date}</span></div><dl><div><dt>Customer</dt><dd>{order.name}<small>{order.email}</small></dd></div><div><dt>Order total</dt><dd>{money(order.total)}</dd></div><div><dt>Items</dt><dd>{order.items}</dd></div><div><dt>UPI reference</dt><dd><code>{order.reference}</code></dd></div></dl><section><h3>Operations timeline</h3><ol><li className="done"><CheckCircle2 aria-hidden="true" /><span><b>Order submitted</b><small>Customer completed checkout.</small></span></li><li className={order.status !== 'Pending verification' && order.status !== 'Rejected' ? 'done' : ''}><ShieldCheck aria-hidden="true" /><span><b>Payment verification</b><small>Confirm amount and unique transaction reference.</small></span></li><li className={order.status === 'Access sent' ? 'done' : ''}><PackageCheck aria-hidden="true" /><span><b>Template access</b><small>Send protected access and customer instructions.</small></span></li></ol></section><footer>{order.status === 'Pending verification' && <><button className="admin-danger" type="button" onClick={() => onUpdate(order.id, 'Rejected')}><XCircle aria-hidden="true" />Reject payment</button><button className="admin-primary" type="button" onClick={() => onUpdate(order.id, 'Verified')}><CheckCircle2 aria-hidden="true" />Verify payment</button></>}{order.status === 'Verified' && <button className="admin-primary" type="button" onClick={() => onUpdate(order.id, 'Access sent')}><PackageCheck aria-hidden="true" />Mark access sent</button>}</footer></div></section></div>;
}

function Panel({title, action, children}: {title: string; action?: React.ReactNode; children: React.ReactNode}) {
  return <section className="admin-panel"><header><h2>{title}</h2>{action}</header>{children}</section>;
}

function TableWrap({children}: {children: React.ReactNode}) {
  return <div className="admin-table-wrap">{children}</div>;
}

function Status({value}: {value: string}) {
  const tone = value.toLowerCase().replaceAll(' ', '-');
  return <span className={`admin-status ${tone}`}>{value}</span>;
}

function Empty({icon: Icon, title, copy}: {icon: typeof ShoppingBag; title: string; copy: string}) {
  return <div className="admin-empty"><Icon aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></div>;
}
