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
import {AdminMediaView, type MediaAssignmentOption} from '@/components/admin-media-view';
import {MediaLibraryField} from '@/components/admin-media-picker';
import {AdminTeamView} from '@/components/admin-team-view';
import {BrandLockup} from '@/components/site';
import {canAccessAdminTab, canManageOrderStatus, defaultAdminTeam, readAdminSession, type AdminRole, type AdminTeamMember} from '@/lib/admin-auth';
import type {AdminMedia} from '@/lib/admin-media';
import {
  money,
  type Category,
  type Collection,
  type Product,
} from '@/lib/data';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';

type AdminTab = 'Overview' | 'Orders' | 'Templates' | 'Categories' | 'Collections' | 'Media' | 'Customers' | 'Team' | 'Reports' | 'Settings';
type AdminTemplate = Product & {coverName: string; deliveryName: string; coverUrl?: string};
type AdminOrderStatus = 'Awaiting payment' | 'Pending verification' | 'Verified' | 'Access sent' | 'Rejected';
type AdminOrder = {id: string; date: string; name: string; email: string; total: number; reference: string; items: number; status: AdminOrderStatus};
type StoreSettings = {storeName: string; supportEmail: string; upiId: string; verificationSla: string; senderName: string; heroImage1?: string; heroImage2?: string; heroImage3?: string};

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

const initialTemplates: AdminTemplate[] = [];

const initialMedia: AdminMedia[] = [];

const initialSettings: StoreSettings = {
  storeName: 'AnyKit Lab',
  supportEmail: 'hello@anykitlab.com',
  upiId: 'anykitlab@upi',
  verificationSla: '12–24 hours',
  senderName: 'AnyKit Lab Delivery',
  heroImage1: '',
  heroImage2: '',
  heroImage3: '',
};

async function uploadAdminAsset(file: File, type: AdminMedia['type']) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const storagePath = `catalog/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const bucket = type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
  const supabase = getSupabaseBrowserClient();
  const {error} = await supabase.storage.from(bucket).upload(storagePath, file, {upsert: false});
  if (error) throw error;
  // Get the public URL for cover/preview images so they show on the storefront
  const publicUrl = type === 'Delivery' ? '' : supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  return {storagePath, publicUrl};
}

function useAdminState<T>(key: string, initialValue: T, {autosave = true, enabled = true}: {autosave?: boolean; enabled?: boolean} = {}) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(!enabled);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const requestId = useRef(0);
  const skipNextSave = useRef(false);
  const safeToSave = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void fetch(`/api/admin/state/${key}`, {credentials: 'same-origin'})
      .then(async response => {
        const payload = await response.json() as {value?: T; error?: string};
        if (!response.ok) throw new Error(payload.error || `Unable to load ${key}.`);
        if (active && payload.value !== undefined) {
          skipNextSave.current = true;
          safeToSave.current = true;
          setValue(payload.value);
        }
      })
      .catch(error => {
        console.error(error);
        if (active) setErrorMessage(error instanceof Error ? error.message : `Unable to load ${key}.`);
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !autosave || !loaded || !safeToSave.current) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setErrorMessage('');
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
      }).catch(error => {
        console.error(error);
        if (requestId.current === currentRequest) {
          setErrorMessage(error instanceof Error ? error.message : `Unable to save ${key}.`);
        }
      }).finally(() => {
        if (requestId.current === currentRequest) setSaving(false);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [autosave, enabled, key, loaded, value]);

  return [value, setValue, {loaded, saving, errorMessage}] as const;
}

export function AdminDashboard() {
  const [adminSession] = useState(readAdminSession);
  const [tab, setTab] = useState<AdminTab>('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const catalogEnabled = canAccessAdminTab(adminSession.role, 'Templates');
  const ordersEnabled = canAccessAdminTab(adminSession.role, 'Orders');
  const teamEnabled = canAccessAdminTab(adminSession.role, 'Team');
  const settingsEnabled = canAccessAdminTab(adminSession.role, 'Settings');
  const [templates, setTemplates, templatesState] = useAdminState<AdminTemplate[]>('templates', initialTemplates, {autosave: false, enabled: catalogEnabled});
  const [categories, setCategories, categoriesState] = useAdminState<Category[]>('categories', [], {autosave: false, enabled: catalogEnabled});
  const [collections, setCollections, collectionsState] = useAdminState<Collection[]>('collections', [], {autosave: false, enabled: catalogEnabled});
  const [media, setMedia, mediaState] = useAdminState<AdminMedia[]>('media', initialMedia, {autosave: false, enabled: catalogEnabled});
  const [orders, setOrders, ordersState] = useAdminState<AdminOrder[]>('orders', [], {autosave: false, enabled: ordersEnabled});
  const [team, setTeam, teamState] = useAdminState<AdminTeamMember[]>('team', defaultAdminTeam, {autosave: false, enabled: teamEnabled});
  const [settings, setSettings, settingsState] = useAdminState<StoreSettings>('settings', initialSettings, {enabled: settingsEnabled});
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null | 'new'>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null | 'new'>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null | 'new'>(null);
  const [editingTeam, setEditingTeam] = useState<AdminTeamMember | null | 'new'>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [toast, setToast] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [mutationSaving, setMutationSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredTemplates = templates.filter(template => {
    const matchesQuery = `${template.title} ${template.category} ${template.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || template.status === statusFilter);
  });
  const filteredCategories = categories.filter(category => {
    const matchesQuery = `${category.name} ${category.slug} ${category.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || category.status === statusFilter);
  });
  const filteredCollections = collections.filter(collection => {
    const matchesQuery = `${collection.name} ${collection.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || collection.status === statusFilter);
  });
  const pendingOrders = orders.filter(order => order.status === 'Pending verification').length;
  const paidRevenue = orders.filter(order => order.status === 'Verified' || order.status === 'Access sent').reduce((sum, order) => sum + order.total, 0);
  const customerCount = new Set(orders.map(order => order.email)).size;
  const visibleTabs = adminTabs.filter(item => canAccessAdminTab(adminSession.role, item.label));
  const adminInitials = adminSession.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const stateEntries = [templatesState, categoriesState, collectionsState, mediaState, ordersState, teamState, settingsState];
  const persistenceError = mutationError || stateEntries.find(state => state.errorMessage)?.errorMessage || '';
  const isSaving = mutationSaving || stateEntries.some(state => state.saving);
  const allLoaded = stateEntries.every(state => state.loaded);

  const openTab = (nextTab: AdminTab) => {
    if (!canAccessAdminTab(adminSession.role, nextTab)) return;
    setTab(nextTab);
    setSidebarOpen(false);
    setQuery('');
    setStatusFilter('All statuses');
  };

  const persistCatalogItem = async (resource: 'products' | 'categories' | 'collections', item: {id: string}) => {
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/catalog/${resource}/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({item}),
      });
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Unable to save the catalog item.');
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to save the catalog item.');
      return false;
    } finally {
      setMutationSaving(false);
    }
  };

  const removeCatalogItem = async (resource: 'products' | 'categories' | 'collections', id: string) => {
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/catalog/${resource}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Unable to delete the catalog item.');
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to delete the catalog item.');
      return false;
    } finally {
      setMutationSaving(false);
    }
  };

  const uploadRegisteredAsset = async (file: File, type: AdminMedia['type']) => {
    const uploaded = await uploadAdminAsset(file, type);
    const response = await fetch('/api/admin/media', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: file.name, type, storagePath: uploaded.storagePath, publicUrl: uploaded.publicUrl}),
    });
    const payload = await response.json() as {asset?: AdminMedia; error?: string};
    if (!response.ok || !payload.asset) {
      const bucket = type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
      await getSupabaseBrowserClient().storage.from(bucket).remove([uploaded.storagePath]);
      throw new Error(payload.error || 'The uploaded file could not be registered.');
    }
    setMedia(current => [payload.asset!, ...current.filter(item => item.id !== payload.asset!.id)]);
    return payload.asset;
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
    if (!category) {
      setToast('Create at least one category before adding a template.');
      return;
    }
    const slug = current?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let coverName = current?.coverName || '';
    let deliveryName = current?.deliveryName || '';
    let coverUrl = String(form.get('coverUrl') || current?.coverUrl || '');
    try {
      if (cover?.size) {
        const result = await uploadRegisteredAsset(cover, 'Cover');
        coverName = result.storagePath;
        coverUrl = result.publicUrl;
      }
      if (delivery?.size) deliveryName = (await uploadRegisteredAsset(delivery, 'Delivery')).storagePath;
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
      collectionId: String(form.get('collectionId') || ''),
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
      coverUrl,
      updatedAt: new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
    };
    if (!await persistCatalogItem('products', nextTemplate)) return;
    setTemplates(currentTemplates => current ? currentTemplates.map(template => template.id === current.id ? nextTemplate : template) : [nextTemplate, ...currentTemplates]);
    setEditingTemplate(null);
    setToast(current ? 'Template changes saved.' : 'Template created as requested.');
  };

  const duplicateTemplate = async (template: AdminTemplate) => {
    const copy = {...template, id: `tpl-${Date.now()}`, slug: `${template.slug}-copy`, title: `${template.title} Copy`, status: 'Draft' as const};
    if (!await persistCatalogItem('products', copy)) return;
    setTemplates(current => [copy, ...current]);
    setToast('Template duplicated as a draft.');
  };

  const toggleTemplateArchive = async (template: AdminTemplate) => {
    const nextStatus: AdminTemplate['status'] = template.status === 'Archived' ? 'Draft' : 'Archived';
    const nextTemplate = {...template, status: nextStatus};
    if (!await persistCatalogItem('products', nextTemplate)) return;
    setTemplates(current => current.map(item => item.id === template.id ? nextTemplate : item));
    setToast(nextStatus === 'Archived' ? 'Template archived.' : 'Template restored as a draft.');
  };

  const deleteTemplate = async (template: AdminTemplate) => {
    if (!window.confirm(`Delete “${template.title}”? This cannot be undone.`)) return;
    if (!await removeCatalogItem('products', template.id)) return;
    setTemplates(current => current.filter(item => item.id !== template.id));
    setToast('Template deleted.');
  };

  const updateOrder = async (id: string, status: AdminOrderStatus) => {
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status}),
      });
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Unable to update the order.');
      setOrders(current => current.map(order => order.id === id ? {...order, status} : order));
      setSelectedOrder(current => current?.id === id ? {...current, status} : current);
      setToast(status === 'Access sent' ? 'Customer access marked as sent.' : `Order marked ${status.toLowerCase()}.`);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to update the order.');
    } finally {
      setMutationSaving(false);
    }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    const current = editingCategory === 'new' || !editingCategory ? null : editingCategory;
    const slug = String(form.get('slug')).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (categories.some(category => category.id !== current?.id && category.slug === slug)) {
      setToast('Another category already uses that slug.');
      return;
    }
    let imageUrl = String(form.get('imageUrl') || current?.imageUrl || '');
    const image = form.get('image') as File | null;
    try {
      if (image?.size) imageUrl = (await uploadRegisteredAsset(image, 'Cover')).publicUrl;
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Category image upload failed.');
      return;
    }
    const nextCategory: Category = {
      id: current?.id || `cat-${Date.now()}`,
      slug,
      name,
      description: String(form.get('description')).trim(),
      status: String(form.get('status')) as Category['status'],
      productCount: current?.productCount || 0,
      imageUrl,
    };
    if (!await persistCatalogItem('categories', nextCategory)) return;
    setCategories(all => current ? all.map(category => category.id === current.id ? nextCategory : category) : [nextCategory, ...all]);
    setEditingCategory(null);
    setToast(current ? 'Category changes saved.' : 'Category created.');
  };

  const saveCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingCollection === 'new' || !editingCollection ? null : editingCollection;
    let imageUrl = String(form.get('imageUrl') || current?.imageUrl || '');
    const image = form.get('image') as File | null;
    try {
      if (image?.size) imageUrl = (await uploadRegisteredAsset(image, 'Cover')).publicUrl;
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Collection image upload failed.');
      return;
    }
    const nextCollection: Collection = {
      id: current?.id || `col-${Date.now()}`,
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      status: String(form.get('status')) as Collection['status'],
      categoryIds: form.getAll('categoryIds').map(String),
      imageUrl,
    };
    if (!await persistCatalogItem('collections', nextCollection)) return;
    setCollections(all => current ? all.map(collection => collection.id === current.id ? nextCollection : collection) : [nextCollection, ...all]);
    setEditingCollection(null);
    setToast(current ? 'Collection changes saved.' : 'Collection created.');
  };

  const toggleCategoryStatus = async (category: Category) => {
    const nextCategory = {...category, status: category.status === 'Active' ? 'Hidden' as const : 'Active' as const};
    if (!await persistCatalogItem('categories', nextCategory)) return;
    setCategories(current => current.map(item => item.id === category.id ? nextCategory : item));
    setToast(nextCategory.status === 'Active' ? 'Category activated.' : 'Category hidden.');
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete ${category.name}? Assigned kits will remain available but become uncategorised until you assign a new category.`)) return;
    if (!await removeCatalogItem('categories', category.id)) return;
    setCategories(current => current.filter(item => item.id !== category.id));
    setToast('Category deleted.');
  };

  const toggleCollectionStatus = async (collection: Collection) => {
    const nextCollection = {...collection, status: collection.status === 'Published' ? 'Draft' as const : 'Published' as const};
    if (!await persistCatalogItem('collections', nextCollection)) return;
    setCollections(current => current.map(item => item.id === collection.id ? nextCollection : item));
    setToast(nextCollection.status === 'Published' ? 'Collection published.' : 'Collection moved to draft.');
  };

  const deleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Delete ${collection.name}? Templates will remain in the catalog without this collection assignment.`)) return;
    if (!await removeCatalogItem('collections', collection.id)) return;
    setCollections(current => current.filter(item => item.id !== collection.id));
    setToast('Collection deleted.');
  };

  const uploadMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    setMediaUploading(true);
    setMutationError('');
    const additions: AdminMedia[] = [];
    try {
      for (const file of Array.from(files)) {
        const type: AdminMedia['type'] = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/pdf' ? 'Delivery' : file.type.startsWith('video/') ? 'Video' : 'Cover';
        additions.push(await uploadRegisteredAsset(file, type));
      }
      setToast(`${additions.length} asset${additions.length === 1 ? '' : 's'} uploaded and added to the media library.`);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Asset upload failed.');
    } finally {
      setMediaUploading(false);
    }
  };

  const assignMedia = async (assetId: string, assignment: MediaAssignmentOption) => {
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(assetId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(assignment),
      });
      const payload = await response.json() as {error?: string; publicUrl?: string};
      if (!response.ok || !payload.publicUrl) throw new Error(payload.error || 'Unable to assign the image.');
      const publicUrl = payload.publicUrl;
      const asset = media.find(item => item.id === assetId);
      if (assignment.target.startsWith('product-')) {
        const product = templates.find(item => item.id === assignment.targetId);
        if (product) {
          setTemplates(current => current.map(item => item.id === product.id ? assignment.target === 'product-cover'
            ? {...item, coverUrl: publicUrl, coverName: asset?.storagePath || item.coverName}
            : {...item, previewUrl: item.previewUrl || publicUrl, previewUrls: [...new Set([...(item.previewUrls || []), publicUrl])]} : item));
          setMedia(current => current.map(item => item.id === assetId ? {...item, type: assignment.target === 'product-cover' ? 'Cover' : 'Preview', linkedTo: product.slug} : item));
        }
      } else if (assignment.target === 'category') {
        setCategories(current => current.map(item => item.id === assignment.targetId ? {...item, imageUrl: publicUrl} : item));
      } else if (assignment.target === 'collection') {
        setCollections(current => current.map(item => item.id === assignment.targetId ? {...item, imageUrl: publicUrl} : item));
      } else {
        const field = assignment.target === 'hero-1' ? 'heroImage1' : assignment.target === 'hero-2' ? 'heroImage2' : 'heroImage3';
        setSettings(current => ({...current, [field]: publicUrl}));
      }
      setToast('Image assigned and the storefront cache refreshed.');
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to assign the image.');
      return false;
    } finally {
      setMutationSaving(false);
    }
  };

  const deleteMedia = async (asset: AdminMedia) => {
    if (!window.confirm(`Delete “${asset.name}”? Any storefront placement using it will be cleared.`)) return;
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(asset.id)}`, {method: 'DELETE', credentials: 'same-origin'});
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Unable to delete the media asset.');
      setMedia(current => current.filter(item => item.id !== asset.id));
      setTemplates(current => current.map(item => ({
        ...item,
        coverUrl: item.coverUrl === asset.publicUrl ? '' : item.coverUrl,
        coverName: item.coverUrl === asset.publicUrl ? '' : item.coverName,
        previewUrl: item.previewUrl === asset.publicUrl ? undefined : item.previewUrl,
        previewUrls: item.previewUrls?.filter(url => url !== asset.publicUrl),
      })));
      setCategories(current => current.map(item => item.imageUrl === asset.publicUrl ? {...item, imageUrl: ''} : item));
      setCollections(current => current.map(item => item.imageUrl === asset.publicUrl ? {...item, imageUrl: ''} : item));
      setSettings(current => ({
        ...current,
        heroImage1: current.heroImage1 === asset.publicUrl ? '' : current.heroImage1,
        heroImage2: current.heroImage2 === asset.publicUrl ? '' : current.heroImage2,
        heroImage3: current.heroImage3 === asset.publicUrl ? '' : current.heroImage3,
      }));
      setToast('Media asset deleted and its storefront placements cleared.');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to delete the media asset.');
    } finally {
      setMutationSaving(false);
    }
  };

  const saveTeamMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingTeam === 'new' || !editingTeam ? null : editingTeam;
    const body = current ? {
      name: String(form.get('name') || ''),
      role: String(form.get('role') || ''),
      status: String(form.get('status') || ''),
    } : {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      temporaryPassword: String(form.get('temporaryPassword') || ''),
      role: String(form.get('role') || ''),
    };
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(current ? `/api/admin/team/${encodeURIComponent(current.id)}` : '/api/admin/team', {
        method: current ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const payload = await response.json() as {member?: AdminTeamMember; error?: string};
      if (!response.ok || !payload.member) throw new Error(payload.error || 'Unable to save the team member.');
      setTeam(all => current ? all.map(member => member.id === current.id ? payload.member! : member) : [payload.member!, ...all]);
      setEditingTeam(null);
      setToast(current ? 'Team member updated.' : 'Team invitation created.');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to save the team member.');
    } finally {
      setMutationSaving(false);
    }
  };

  const changeTeamStatus = async (member: AdminTeamMember, status: AdminTeamMember['status']) => {
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/team/${encodeURIComponent(member.id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: member.name, role: member.role, status}),
      });
      const payload = await response.json() as {member?: AdminTeamMember; error?: string};
      if (!response.ok || !payload.member) throw new Error(payload.error || 'Unable to change team access.');
      setTeam(current => current.map(item => item.id === member.id ? payload.member! : item));
      setToast(status === 'Active' ? 'Team access activated.' : 'Team access suspended.');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to change team access.');
    } finally {
      setMutationSaving(false);
    }
  };

  const removeTeamAccess = async (member: AdminTeamMember) => {
    if (!window.confirm(`Remove administrator access for ${member.name}? Their account will be suspended.`)) return;
    setMutationSaving(true);
    setMutationError('');
    try {
      const response = await fetch(`/api/admin/team/${encodeURIComponent(member.id)}`, {method: 'DELETE', credentials: 'same-origin'});
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Unable to remove team access.');
      setTeam(current => current.map(item => item.id === member.id ? {...item, status: 'Suspended'} : item));
      setToast('Team access suspended.');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to remove team access.');
    } finally {
      setMutationSaving(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let heroImage1 = String(form.get('heroImage1Url') || settings.heroImage1 || '');
    let heroImage2 = String(form.get('heroImage2Url') || settings.heroImage2 || '');
    let heroImage3 = String(form.get('heroImage3Url') || settings.heroImage3 || '');
    try {
      const file1 = form.get('heroImage1') as File | null;
      const file2 = form.get('heroImage2') as File | null;
      const file3 = form.get('heroImage3') as File | null;
      if (file1?.size) heroImage1 = (await uploadRegisteredAsset(file1, 'Cover')).publicUrl;
      if (file2?.size) heroImage2 = (await uploadRegisteredAsset(file2, 'Cover')).publicUrl;
      if (file3?.size) heroImage3 = (await uploadRegisteredAsset(file3, 'Cover')).publicUrl;
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Image upload failed.');
      return;
    }
    setSettings({storeName: String(form.get('storeName')), supportEmail: String(form.get('supportEmail')), upiId: String(form.get('upiId')), verificationSla: String(form.get('verificationSla')), senderName: String(form.get('senderName')), heroImage1, heroImage2, heroImage3});
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
        <header className="admin-v3-topbar"><div><span>ANYKIT LAB / {adminSession.role.toUpperCase()}</span><h1>{tab}</h1></div><div className="admin-v3-top-actions">{tab === 'Templates' && <button type="button" onClick={() => setEditingTemplate('new')}><Plus aria-hidden="true" />Add template</button>}{tab === 'Categories' && <button type="button" onClick={() => setEditingCategory('new')}><Plus aria-hidden="true" />Add category</button>}{tab === 'Collections' && <button type="button" onClick={() => setEditingCollection('new')}><Plus aria-hidden="true" />Add collection</button>}<small className={`admin-save-state ${persistenceError ? 'error' : ''}`} aria-live="polite">{persistenceError ? 'Save failed' : !allLoaded ? 'Loading data…' : isSaving ? 'Saving…' : 'Changes saved'}</small><span aria-label={`Signed in as ${adminSession.name}`} title={`${adminSession.name} · ${adminSession.role}`}>{adminInitials}</span></div></header>
        <div className="admin-v3-content">
          {persistenceError && <div className="admin-persistence-error" role="alert"><XCircle aria-hidden="true" /><span><b>Your latest admin change was not saved.</b>{persistenceError}</span></div>}
          {tab === 'Overview' && <Overview templates={templates} categories={categories} media={media} orders={orders} paidRevenue={paidRevenue} customerCount={customerCount} role={adminSession.role} openTab={openTab} onSelectOrder={setSelectedOrder} />}
          {tab === 'Orders' && <OrdersView orders={orders} canManage={canManageOrderStatus(adminSession.role)} onSelect={setSelectedOrder} onUpdate={updateOrder} onExport={exportOrders} />}
          {tab === 'Templates' && <TemplatesView templates={filteredTemplates} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onEdit={setEditingTemplate} onDuplicate={duplicateTemplate} onArchive={toggleTemplateArchive} onDelete={deleteTemplate} />}
          {tab === 'Categories' && <CategoriesView categories={filteredCategories} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={() => setEditingCategory('new')} onEdit={setEditingCategory} onToggle={toggleCategoryStatus} onDelete={deleteCategory} />}
          {tab === 'Collections' && <CollectionsView collections={filteredCollections} categories={categories} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={() => setEditingCollection('new')} onEdit={setEditingCollection} onToggle={toggleCollectionStatus} onDelete={deleteCollection} />}
          {tab === 'Media' && <AdminMediaView media={media} products={templates} categories={categories} collections={collections} settings={settings} busy={mutationSaving} uploading={mediaUploading} onUpload={uploadMedia} onAssign={assignMedia} onDelete={deleteMedia} />}
          {tab === 'Customers' && <CustomersView orders={orders} />}
          {tab === 'Team' && <AdminTeamView team={team} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} busy={mutationSaving} editing={editingTeam} onAdd={() => setEditingTeam('new')} onEdit={setEditingTeam} onClose={() => setEditingTeam(null)} onSave={saveTeamMember} onToggle={member => changeTeamStatus(member, member.status === 'Active' ? 'Suspended' : 'Active')} onRemove={removeTeamAccess} />}
          {tab === 'Reports' && <ReportsView orders={orders} templates={templates} categories={categories} onExport={exportOrders} />}
          {tab === 'Settings' && <SettingsView settings={settings} media={media} onSave={saveSettings} />}
        </div>
      </section>

      {editingTemplate && <TemplateEditor template={editingTemplate === 'new' ? null : editingTemplate} categories={categories} collections={collections} media={media} onClose={() => setEditingTemplate(null)} onSave={saveTemplate} />}
      {editingCategory && <CategoryEditor category={editingCategory === 'new' ? null : editingCategory} media={media} onClose={() => setEditingCategory(null)} onSave={saveCategory} />}
      {editingCollection && <CollectionEditor collection={editingCollection === 'new' ? null : editingCollection} categories={categories} media={media} onClose={() => setEditingCollection(null)} onSave={saveCollection} />}
      {selectedOrder && <OrderDrawer order={selectedOrder} canManage={canManageOrderStatus(adminSession.role)} onClose={() => setSelectedOrder(null)} onUpdate={updateOrder} />}
      {toast && <div className="admin-toast" role="status"><Check aria-hidden="true" />{toast}</div>}
      {sidebarOpen && <button className="admin-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function Overview({templates, categories, media, orders, paidRevenue, customerCount, role, openTab, onSelectOrder}: {templates: AdminTemplate[]; categories: Category[]; media: AdminMedia[]; orders: AdminOrder[]; paidRevenue: number; customerCount: number; role: AdminRole; openTab: (tab: AdminTab) => void; onSelectOrder: (order: AdminOrder) => void}) {
  const pending = orders.filter(order => order.status === 'Pending verification');
  const catalogIssues = templates.filter(template => !template.coverUrl || !template.deliveryName).length;
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
        <div className="admin-health-list"><span><b>Cover media assigned</b><em>{templates.filter(template => template.coverUrl).length} / {templates.length}</em></span><span><b>Delivery files assigned</b><em>{templates.filter(template => template.deliveryName).length} / {templates.length}</em></span><span className={catalogIssues ? 'warning' : ''}><b>Templates needing attention</b><em>{catalogIssues}</em></span><span><b>Media library assets</b><em>{media.length}</em></span></div>
      </Panel>}
    </div>
    <Panel title="Operations shortcuts"><div className="admin-shortcuts">{canTemplates && <button type="button" onClick={() => openTab('Templates')}><Boxes aria-hidden="true" /><span><b>Catalog</b><small>Add, edit, duplicate, archive or delete templates.</small></span><ChevronRight aria-hidden="true" /></button>}{canMedia && <button type="button" onClick={() => openTab('Media')}><UploadCloud aria-hidden="true" /><span><b>Media & delivery</b><small>Upload covers, previews, video and protected files.</small></span><ChevronRight aria-hidden="true" /></button>}{canTeam && <button type="button" onClick={() => openTab('Team')}><ShieldCheck aria-hidden="true" /><span><b>Staff permissions</b><small>Manage owner, catalog, payment and support roles.</small></span><ChevronRight aria-hidden="true" /></button>}{canOrders && <button type="button" onClick={() => openTab('Orders')}><ShoppingBag aria-hidden="true" /><span><b>Order operations</b><small>Verify references and send customer access.</small></span><ChevronRight aria-hidden="true" /></button>}</div></Panel>
  </>;
}

function OrdersView({orders, canManage, onSelect, onUpdate, onExport}: {orders: AdminOrder[]; canManage: boolean; onSelect: (order: AdminOrder) => void; onUpdate: (id: string, status: AdminOrderStatus) => void; onExport: () => void}) {
  const [filter, setFilter] = useState<AdminOrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const visible = orders.filter(order => (filter === 'All' || order.status === filter) && `${order.id} ${order.name} ${order.email} ${order.reference}`.toLowerCase().includes(search.toLowerCase()));
  return <Panel title="Order management" action={<button type="button" onClick={onExport}><Download aria-hidden="true" />Export CSV</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer or reference" aria-label="Search orders" /></label><select value={filter} onChange={event => setFilter(event.target.value as AdminOrderStatus | 'All')} aria-label="Filter orders by status"><option>All</option><option>Awaiting payment</option><option>Pending verification</option><option>Verified</option><option>Access sent</option><option>Rejected</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(order => <tr key={order.id}><td><button className="admin-link-button" type="button" onClick={() => onSelect(order)}>{order.id}</button><small>{order.date}</small></td><td><b>{order.name}</b><small>{order.email}</small></td><td>{order.items}</td><td><b>{money(order.total)}</b></td><td><code>{order.reference || 'Not submitted'}</code></td><td><Status value={order.status} /></td><td><div className="row-actions">{canManage && <>{order.status === 'Awaiting payment' && <button className="danger" type="button" onClick={() => onUpdate(order.id, 'Rejected')} aria-label={`Close unpaid order ${order.id}`} title={`Close unpaid order ${order.id}`}><XCircle aria-hidden="true" /></button>}{order.status === 'Pending verification' && <><button type="button" onClick={() => onUpdate(order.id, 'Verified')} aria-label={`Verify ${order.id}`} title={`Verify payment for ${order.id}`}><CheckCircle2 aria-hidden="true" /></button><button className="danger" type="button" onClick={() => onUpdate(order.id, 'Rejected')} aria-label={`Reject ${order.id}`} title={`Reject payment for ${order.id}`}><XCircle aria-hidden="true" /></button></>} {order.status === 'Verified' && <button type="button" onClick={() => onUpdate(order.id, 'Access sent')}>Send access</button>}</>}<button type="button" onClick={() => onSelect(order)}>Details</button></div></td></tr>)}</tbody></table></TableWrap>
    {!visible.length && <Empty icon={ShoppingBag} title="No matching orders" copy="Change the search or status filter to see more orders." />}
  </Panel>;
}

function TemplatesView({templates, query, setQuery, statusFilter, setStatusFilter, onEdit, onDuplicate, onArchive, onDelete}: {templates: AdminTemplate[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onEdit: (template: AdminTemplate | 'new') => void; onDuplicate: (template: AdminTemplate) => void; onArchive: (template: AdminTemplate) => void; onDelete: (template: AdminTemplate) => void}) {
  return <Panel title="Template catalog" action={<button type="button" onClick={() => onEdit('new')}><Plus aria-hidden="true" />Add template</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search templates" aria-label="Search templates" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter templates by status"><option>All statuses</option><option>Published</option><option>Draft</option><option>Archived</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Template</th><th>Category</th><th>Layouts</th><th>Price</th><th>Assets</th><th>Status</th><th>Actions</th></tr></thead><tbody>{templates.map(template => <tr key={template.id}><td><b>{template.title}</b><small>{template.id} · Updated {template.updatedAt}</small></td><td>{template.category}</td><td>{template.layoutCount}</td><td><b>{money(template.price)}</b><small>Compare {money(template.mrp)}</small></td><td><span className="asset-count"><ImageIcon aria-hidden="true" />{template.coverName ? 'Cover ready' : 'No cover'}</span><small>{template.deliveryName ? 'Delivery ready' : 'No delivery file'}</small></td><td><Status value={template.status} /></td><td><div className="row-actions"><button type="button" onClick={() => onEdit(template)} aria-label={`Edit ${template.title}`} title={`Edit ${template.title}`}><Pencil aria-hidden="true" /></button><button type="button" onClick={() => onDuplicate(template)} aria-label={`Duplicate ${template.title}`} title={`Duplicate ${template.title}`}><Copy aria-hidden="true" /></button><button type="button" onClick={() => onArchive(template)} aria-label={`${template.status === 'Archived' ? 'Restore' : 'Archive'} ${template.title}`} title={`${template.status === 'Archived' ? 'Restore' : 'Archive'} ${template.title}`}><Archive aria-hidden="true" /></button><button className="danger" type="button" onClick={() => onDelete(template)} aria-label={`Delete ${template.title}`} title={`Delete ${template.title}`}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap>
  </Panel>;
}

function CategoriesView({categories, query, setQuery, statusFilter, setStatusFilter, onAdd, onEdit, onToggle, onDelete}: {categories: Category[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onAdd: () => void; onEdit: (category: Category | 'new') => void; onToggle: (category: Category) => void; onDelete: (category: Category) => void}) {
  return <Panel title="Category catalog" action={<button type="button" onClick={onAdd}><Plus aria-hidden="true" />Add category</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search categories" aria-label="Search categories" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter categories by status"><option>All statuses</option><option>Active</option><option>Hidden</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Category</th><th>Slug</th><th>Artwork</th><th>Kits</th><th>Status</th><th>Actions</th></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td><b>{category.name}</b><small>{category.description}</small></td><td><code>{category.slug}</code></td><td>{category.imageUrl ? <img className="admin-catalog-thumb" src={category.imageUrl} alt={category.name} /> : <span className="admin-asset-empty"><ImageIcon aria-hidden="true" />No artwork</span>}</td><td>{category.productCount}</td><td><Status value={category.status} /></td><td><div className="row-actions"><button type="button" onClick={() => onEdit(category)} aria-label={`Edit ${category.name}`} title={`Edit ${category.name}`}><Pencil aria-hidden="true" /></button><button type="button" onClick={() => onToggle(category)}>{category.status === 'Active' ? 'Hide' : 'Activate'}</button><button className="danger" type="button" aria-label={`Delete ${category.name}`} title={`Delete ${category.name}`} onClick={() => onDelete(category)}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap>
    {!categories.length && <Empty icon={FolderTree} title="No matching categories" copy="Change the search or status filter, or add a new category." />}
  </Panel>;
}

function CollectionsView({collections, categories, query, setQuery, statusFilter, setStatusFilter, onAdd, onEdit, onToggle, onDelete}: {collections: Collection[]; categories: Category[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onAdd: () => void; onEdit: (collection: Collection | 'new') => void; onToggle: (collection: Collection) => void; onDelete: (collection: Collection) => void}) {
  const categoryNames = new Map(categories.map(category => [category.id, category.name]));
  return <Panel title="Collection catalog" action={<button type="button" onClick={onAdd}><Plus aria-hidden="true" />Add collection</button>}>
    <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search collections" aria-label="Search collections" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter collections by status"><option>All statuses</option><option>Published</option><option>Draft</option></select></div>
    <TableWrap><table className="admin-table"><thead><tr><th>Collection</th><th>Artwork</th><th>Categories</th><th>Status</th><th>Actions</th></tr></thead><tbody>{collections.map(collection => <tr key={collection.id}><td><b>{collection.name}</b><small>{collection.description}</small></td><td>{collection.imageUrl ? <img className="admin-catalog-thumb" src={collection.imageUrl} alt={collection.name} /> : <span className="admin-asset-empty"><ImageIcon aria-hidden="true" />No artwork</span>}</td><td>{collection.categoryIds.length ? collection.categoryIds.map(id => categoryNames.get(id) || id).join(', ') : 'All categories'}</td><td><Status value={collection.status} /></td><td><div className="row-actions"><button type="button" onClick={() => onEdit(collection)} aria-label={`Edit ${collection.name}`} title={`Edit ${collection.name}`}><Pencil aria-hidden="true" /></button><button type="button" onClick={() => onToggle(collection)}>{collection.status === 'Published' ? 'Unpublish' : 'Publish'}</button><button className="danger" type="button" aria-label={`Delete ${collection.name}`} title={`Delete ${collection.name}`} onClick={() => onDelete(collection)}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></TableWrap>
    {!collections.length && <Empty icon={PackageCheck} title="No matching collections" copy="Change the search or status filter, or add a new collection." />}
  </Panel>;
}

function CustomersView({orders}: {orders: AdminOrder[]}) {
  const customers = Array.from(new Map(orders.map(order => [order.email, order])).values()).map(customer => {const customerOrders = orders.filter(order => order.email === customer.email); return {...customer, orderCount: customerOrders.length, lifetimeValue: customerOrders.reduce((sum, order) => sum + order.total, 0)};});
  return <Panel title="Customer directory"><TableWrap><table className="admin-table"><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Lifetime value</th><th>Latest order</th><th>Status</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.email}><td><b>{customer.name}</b></td><td>{customer.email}</td><td>{customer.orderCount}</td><td><b>{money(customer.lifetimeValue)}</b></td><td>{customer.id}<small>{customer.date}</small></td><td><Status value="Active" /></td></tr>)}</tbody></table></TableWrap></Panel>;
}

function ReportsView({orders, templates, categories, onExport}: {orders: AdminOrder[]; templates: AdminTemplate[]; categories: Category[]; onExport: () => void}) {
  const revenue = orders.filter(order => order.status !== 'Rejected').reduce((sum, order) => sum + order.total, 0);
  const catalogTotal = Math.max(templates.length, 1);
  const categoryStats = categories.map(category => {const count = templates.filter(template => template.categoryId === category.id).length; return {name: category.name, count, value: Math.round((count / catalogTotal) * 100)};});
  return <><section className="admin-metric-grid report-metrics"><article><span>Total submitted revenue</span><b>{money(revenue)}</b><small>All non-rejected orders</small></article><article><span>Average order value</span><b>{money(Math.round(revenue / Math.max(orders.length, 1)))}</b><small>Across {orders.length} orders</small></article><article><span>Catalog size</span><b>{templates.length}</b><small>{templates.filter(template => template.status === 'Draft').length} templates in draft</small></article><article><span>Payment approval rate</span><b>{Math.round((orders.filter(order => order.status !== 'Pending verification' && order.status !== 'Rejected').length / Math.max(orders.length, 1)) * 100)}%</b><small>Verified or delivered</small></article></section><div className="admin-dashboard-grid"><Panel title="Catalog by category"><div className="admin-bars">{categoryStats.map(stat => <div key={stat.name}><span><b>{stat.name}</b><em>{stat.count} kit{stat.count === 1 ? '' : 's'}</em></span><i><b style={{width: `${stat.value}%`}} /></i></div>)}</div></Panel><Panel title="Generate report"><div className="admin-report-form"><label>From<input type="date" /></label><label>To<input type="date" /></label><button className="admin-primary" type="button" onClick={onExport}><Download aria-hidden="true" />Export order CSV</button></div></Panel></div></>;
}

function SettingsView({settings, media, onSave}: {settings: StoreSettings; media: AdminMedia[]; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <Panel title="Store and delivery settings"><form className="admin-settings-form" onSubmit={onSave}>
    <section><h2>Store identity</h2><p>Customer-facing contact and sender details.</p></section>
    <div><label>Store name<input required name="storeName" defaultValue={settings.storeName} /></label><label>Support email<input required type="email" name="supportEmail" defaultValue={settings.supportEmail} /></label><label>Email sender name<input required name="senderName" defaultValue={settings.senderName} /></label></div>
    <section><h2>Payment verification</h2><p>Manual payment instructions used by operations.</p></section>
    <div><label>UPI ID<input required name="upiId" defaultValue={settings.upiId} /></label><label>Verification SLA<input required name="verificationSla" defaultValue={settings.verificationSla} /></label></div>
    <section><h2>Home page hero images</h2><p>Select uploaded media for each home-page card, or upload a new image directly.</p></section>
    <div className="admin-settings-media">
      <div><MediaLibraryField key={`hero-1-${settings.heroImage1}`} media={media} name="heroImage1Url" label="Hero card 1" value={settings.heroImage1} /><label className="admin-inline-upload">Upload replacement<input type="file" accept="image/*" name="heroImage1" /></label></div>
      <div><MediaLibraryField key={`hero-2-${settings.heroImage2}`} media={media} name="heroImage2Url" label="Hero card 2" value={settings.heroImage2} /><label className="admin-inline-upload">Upload replacement<input type="file" accept="image/*" name="heroImage2" /></label></div>
      <div><MediaLibraryField key={`hero-3-${settings.heroImage3}`} media={media} name="heroImage3Url" label="Hero card 3" value={settings.heroImage3} /><label className="admin-inline-upload">Upload replacement<input type="file" accept="image/*" name="heroImage3" /></label></div>
    </div>
    <button className="admin-primary" type="submit"><Save aria-hidden="true" />Save settings</button>
  </form></Panel>;
}

function TemplateEditor({template, categories, collections, media, onClose, onSave}: {template: AdminTemplate | null; categories: Category[]; collections: Collection[]; media: AdminMedia[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="template-editor-title"><header><div><span>TEMPLATE CATALOG</span><h2 id="template-editor-title">{template ? 'Edit template' : 'Add a new template'}</h2></div><button type="button" onClick={onClose} aria-label="Close template editor"><X aria-hidden="true" /></button></header><form className="template-editor-form" onSubmit={onSave}>
    <label className="wide">Template title<input required name="title" defaultValue={template?.title} /></label>
    <label>Category<select required name="categoryId" defaultValue={template?.categoryId || categories[0]?.id}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Collection<select name="collectionId" defaultValue={template?.collectionId || ''}><option value="">No collection</option>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
    <label>Price<input required name="price" type="number" min="0" defaultValue={template?.price || 699} /></label>
    <label>Compare-at price<input required name="mrp" type="number" min="0" defaultValue={template?.mrp || 1299} /></label>
    <label>Layouts<input required name="layoutCount" type="number" min="1" defaultValue={template?.layoutCount || 60} /></label>
    <label>Status<select name="status" defaultValue={template?.status || 'Draft'}><option>Draft</option><option>Published</option><option>Archived</option></select></label>
    <label className="wide">Badge<input name="badge" defaultValue={template?.badge || 'NEW'} /></label>
    <label className="wide">Short description<textarea required name="description" rows={5} defaultValue={template?.description} /></label>
    <MediaLibraryField key={`template-${template?.id || 'new'}-${template?.coverUrl || ''}`} media={media} name="coverUrl" label="Choose cover from Media" value={template?.coverUrl} help="The selected image becomes the template cover after saving." />
    <label className="file-field wide"><ImageIcon aria-hidden="true" /><span><b>Or upload a new cover</b><small>{template?.coverName || 'The upload will be added to Supabase storage.'}</small>{template?.coverUrl && <img className="admin-editor-preview" src={template.coverUrl} alt="Current template cover" />}</span><input type="file" accept="image/*" name="cover" /></label>
    <label className="file-field wide"><FileArchive aria-hidden="true" /><span><b>Protected delivery file</b><small>{template?.deliveryName || 'Upload ZIP or PDF customer delivery.'}</small></span><input type="file" accept=".zip,.pdf" name="delivery" /></label>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit"><Save aria-hidden="true" />{template ? 'Save template' : 'Create template'}</button></footer>
  </form></section></div>;
}

function CategoryEditor({category, media, onClose, onSave}: {category: Category | null; media: AdminMedia[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="category-editor-title"><header><div><span>CATEGORY CATALOG</span><h2 id="category-editor-title">{category ? 'Edit category' : 'Add a new category'}</h2></div><button type="button" onClick={onClose} aria-label="Close category editor"><X aria-hidden="true" /></button></header><form className="template-editor-form" onSubmit={onSave}>
    <label className="wide">Category name<input required name="name" defaultValue={category?.name} placeholder="e.g. Education & Courses" /></label>
    <label className="wide">URL slug<input name="slug" defaultValue={category?.slug} placeholder="Generated from the category name" /><small>Lowercase letters, numbers and hyphens only.</small></label>
    <label>Status<select name="status" defaultValue={category?.status || 'Active'}><option>Active</option><option>Hidden</option></select></label>
    <label className="wide">Description<textarea required name="description" rows={6} defaultValue={category?.description} placeholder="Who this category is for and what visitors will find." /></label>
    <MediaLibraryField key={`category-${category?.id || 'new'}-${category?.imageUrl || ''}`} media={media} name="imageUrl" label="Choose category artwork from Media" value={category?.imageUrl} />
    <label className="file-field wide"><ImageIcon aria-hidden="true" /><span><b>Or upload new category artwork</b><small>{category?.imageUrl ? 'Uploading replaces the selected/current artwork.' : 'The upload will be stored in the media library.'}</small></span><input type="file" accept="image/*" name="image" /></label>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit"><Save aria-hidden="true" />{category ? 'Save category' : 'Create category'}</button></footer>
  </form></section></div>;
}

function CollectionEditor({collection, categories, media, onClose, onSave}: {collection: Collection | null; categories: Category[]; media: AdminMedia[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="collection-editor-title"><header><div><span>COLLECTION CATALOG</span><h2 id="collection-editor-title">{collection ? 'Edit collection' : 'Add a new collection'}</h2></div><button type="button" onClick={onClose} aria-label="Close collection editor"><X aria-hidden="true" /></button></header><form className="template-editor-form" onSubmit={onSave}>
    <label className="wide">Collection name<input required name="name" defaultValue={collection?.name} placeholder="e.g. Summer Launch Kits" /></label>
    <label>Status<select name="status" defaultValue={collection?.status || 'Draft'}><option>Draft</option><option>Published</option></select></label>
    <label className="wide">Description<textarea required name="description" rows={6} defaultValue={collection?.description} placeholder="Explain the theme and purpose of this collection." /></label>
    <label className="wide">Included categories<select className="admin-multi-select" multiple name="categoryIds" defaultValue={collection?.categoryIds || []} size={Math.min(Math.max(categories.length, 3), 6)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><small>Use Ctrl or Cmd to select multiple categories. Leave empty to make the collection available across all categories.</small></label>
    <MediaLibraryField key={`collection-${collection?.id || 'new'}-${collection?.imageUrl || ''}`} media={media} name="imageUrl" label="Choose collection artwork from Media" value={collection?.imageUrl} />
    <label className="file-field wide"><ImageIcon aria-hidden="true" /><span><b>Or upload new collection artwork</b><small>{collection?.imageUrl ? 'Uploading replaces the selected/current artwork.' : 'The upload will be stored in the media library.'}</small></span><input type="file" accept="image/*" name="image" /></label>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit"><Save aria-hidden="true" />{collection ? 'Save collection' : 'Create collection'}</button></footer>
  </form></section></div>;
}

function OrderDrawer({order, canManage, onClose, onUpdate}: {order: AdminOrder; canManage: boolean; onClose: () => void; onUpdate: (id: string, status: AdminOrderStatus) => void}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer order-drawer" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title"><header><div><span>ORDER DETAILS</span><h2 id="order-drawer-title">{order.id}</h2></div><button type="button" onClick={onClose} aria-label="Close order details"><X aria-hidden="true" /></button></header><div className="order-detail-body"><div className="order-detail-status"><Status value={order.status} /><span>{order.date}</span></div><dl><div><dt>Customer</dt><dd>{order.name}<small>{order.email}</small></dd></div><div><dt>Order total</dt><dd>{money(order.total)}</dd></div><div><dt>Items</dt><dd>{order.items}</dd></div><div><dt>UPI reference</dt><dd><code>{order.reference}</code></dd></div></dl><section><h3>Operations timeline</h3><ol><li className="done"><CheckCircle2 aria-hidden="true" /><span><b>Order submitted</b><small>Customer completed checkout.</small></span></li><li className={order.status !== 'Pending verification' && order.status !== 'Rejected' ? 'done' : ''}><ShieldCheck aria-hidden="true" /><span><b>Payment verification</b><small>Confirm amount and unique transaction reference.</small></span></li><li className={order.status === 'Access sent' ? 'done' : ''}><PackageCheck aria-hidden="true" /><span><b>Template access</b><small>Send protected access and customer instructions.</small></span></li></ol></section><footer>{canManage && <>{order.status === 'Pending verification' && <><button className="admin-danger" type="button" onClick={() => onUpdate(order.id, 'Rejected')}><XCircle aria-hidden="true" />Reject payment</button><button className="admin-primary" type="button" onClick={() => onUpdate(order.id, 'Verified')}><CheckCircle2 aria-hidden="true" />Verify payment</button></>}{order.status === 'Verified' && <button className="admin-primary" type="button" onClick={() => onUpdate(order.id, 'Access sent')}><PackageCheck aria-hidden="true" />Mark access sent</button>}</>}</footer></div></section></div>;
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
