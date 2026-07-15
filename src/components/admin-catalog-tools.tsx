'use client';

import {FormEvent, useCallback, useEffect, useMemo, useState} from 'react';
import {Check, ImageIcon, LayoutTemplate, Pencil, RefreshCw, Trash2, X} from 'lucide-react';

type ProductRow = {id: string; slug: string; title: string; status: 'Published' | 'Draft' | 'Archived'; category_id: string; collection_id: string | null; cover_url: string};
type CategoryRow = {id: string; slug: string; name: string; description: string; status: 'Active' | 'Hidden'};
type CollectionRow = {id: string; name: string; description: string; status: 'Published' | 'Draft'; category_ids: string[]};
type MediaRow = {id: string; name: string; asset_type: 'Cover' | 'Preview' | 'Video' | 'Delivery'; product_slug: string | null; storage_path: string; public_url: string; status: string};
type CatalogPayload = {products: ProductRow[]; categories: CategoryRow[]; collections: CollectionRow[]; media: MediaRow[]};
type ToolTab = 'Templates' | 'Categories' | 'Collections' | 'Media';

async function api<T>(method: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/admin/entities', {
    method,
    credentials: 'same-origin',
    headers: body ? {'Content-Type': 'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json() as T & {error?: string; requiresCascade?: boolean};
  if (!response.ok) {
    const error = new Error(payload.error || 'Catalog action failed.') as Error & {status?: number; requiresCascade?: boolean};
    error.status = response.status;
    error.requiresCascade = payload.requiresCascade;
    throw error;
  }
  return payload;
}

export function AdminCatalogTools() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab>('Templates');
  const [data, setData] = useState<CatalogPayload>({products: [], categories: [], collections: [], media: []});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [coverId, setCoverId] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [editing, setEditing] = useState<{kind: 'category' | 'collection'; id: string} | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<CatalogPayload>('GET'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load catalog tools.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [load, open]);
  useEffect(() => {
    if (!selectedMedia.includes(coverId)) setCoverId(selectedMedia[0] || '');
  }, [coverId, selectedMedia]);

  const assignableMedia = useMemo(() => data.media.filter(item => item.asset_type === 'Cover' || item.asset_type === 'Preview'), [data.media]);

  async function update(kind: 'template' | 'category' | 'collection', id: string, values: Record<string, unknown>) {
    setBusy(true);
    try {
      await api('PATCH', {kind, id, values});
      setNotice('Changes saved and storefront refreshed.');
      setEditing(null);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: 'template' | 'category' | 'collection' | 'media', id: string, label: string) {
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api('DELETE', {kind, id});
      setNotice(`${label} deleted.`);
      await load();
    } catch (error) {
      const typed = error as Error & {requiresCascade?: boolean};
      if (kind === 'category' && typed.requiresCascade && window.confirm(`${typed.message}\n\nDelete the category and all templates inside it?`)) {
        try {
          await api('DELETE', {kind, id, cascade: true});
          setNotice(`${label} and its templates deleted.`);
          await load();
        } catch (cascadeError) {
          setNotice(cascadeError instanceof Error ? cascadeError.message : 'Cascade deletion failed.');
        }
      } else {
        setNotice(typed.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function assignMedia() {
    setBusy(true);
    try {
      await api('POST', {action: 'assign-media', productSlug, mediaIds: selectedMedia, coverId});
      setSelectedMedia([]);
      setCoverId('');
      setNotice('Images assigned. The cover and product gallery are now live.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Media assignment failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="catalog-tools-launcher" type="button" onClick={() => setOpen(true)}><LayoutTemplate aria-hidden="true" />Catalog tools</button>
      {open && <div className="catalog-tools-backdrop" role="presentation">
        <section className="catalog-tools-panel" role="dialog" aria-modal="true" aria-labelledby="catalog-tools-title">
          <header><div><span>LIVE DATA CONTROL</span><h2 id="catalog-tools-title">Catalog tools</h2><p>Publish templates, manage categories and collections, and assign real media.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close catalog tools"><X aria-hidden="true" /></button></header>
          <nav aria-label="Catalog tools sections">{(['Templates', 'Categories', 'Collections', 'Media'] as ToolTab[]).map(item => <button type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}<button type="button" onClick={() => void load()} title="Refresh"><RefreshCw aria-hidden="true" /></button></nav>
          {notice && <p className="catalog-tools-notice" role="status">{notice}</p>}
          <div className="catalog-tools-body">
            {loading ? <p>Loading live catalog…</p> : tab === 'Templates' ? <TemplateTools products={data.products} busy={busy} onUpdate={update} onDelete={remove} /> : tab === 'Categories' ? <CategoryTools rows={data.categories} editing={editing} setEditing={setEditing} busy={busy} onUpdate={update} onDelete={remove} /> : tab === 'Collections' ? <CollectionTools rows={data.collections} editing={editing} setEditing={setEditing} busy={busy} onUpdate={update} onDelete={remove} /> : <MediaTools media={assignableMedia} products={data.products} selected={selectedMedia} setSelected={setSelectedMedia} coverId={coverId} setCoverId={setCoverId} productSlug={productSlug} setProductSlug={setProductSlug} busy={busy} onAssign={assignMedia} onDelete={remove} />}
          </div>
        </section>
      </div>}
    </>
  );
}

function TemplateTools({products, busy, onUpdate, onDelete}: {products: ProductRow[]; busy: boolean; onUpdate: (kind: 'template', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'template', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{products.map(product => <article key={product.id}><div>{product.cover_url ? <img src={product.cover_url} alt="" /> : <span><ImageIcon aria-hidden="true" /></span>}<p><b>{product.title}</b><small>/{product.slug}</small></p></div><select value={product.status} disabled={busy} onChange={event => void onUpdate('template', product.id, {status: event.target.value})}><option>Published</option><option>Draft</option><option>Archived</option></select><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('template', product.id, product.title)}><Trash2 aria-hidden="true" />Delete</button></article>)}{!products.length && <p>No templates exist yet.</p>}</div>;
}

function CategoryTools({rows, editing, setEditing, busy, onUpdate, onDelete}: {rows: CategoryRow[]; editing: {kind: 'category' | 'collection'; id: string} | null; setEditing: (value: {kind: 'category'; id: string} | null) => void; busy: boolean; onUpdate: (kind: 'category', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'category', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{rows.map(row => editing?.kind === 'category' && editing.id === row.id ? <EditRow key={row.id} name={row.name} description={row.description} status={row.status} statuses={['Active', 'Hidden']} busy={busy} onCancel={() => setEditing(null)} onSave={values => onUpdate('category', row.id, values)} /> : <article key={row.id}><div><span><LayoutTemplate aria-hidden="true" /></span><p><b>{row.name}</b><small>/{row.slug} · {row.status}</small></p></div><button type="button" onClick={() => setEditing({kind: 'category', id: row.id})}><Pencil aria-hidden="true" />Edit</button><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('category', row.id, row.name)}><Trash2 aria-hidden="true" />Delete</button></article>)}</div>;
}

function CollectionTools({rows, editing, setEditing, busy, onUpdate, onDelete}: {rows: CollectionRow[]; editing: {kind: 'category' | 'collection'; id: string} | null; setEditing: (value: {kind: 'collection'; id: string} | null) => void; busy: boolean; onUpdate: (kind: 'collection', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'collection', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{rows.map(row => editing?.kind === 'collection' && editing.id === row.id ? <EditRow key={row.id} name={row.name} description={row.description} status={row.status} statuses={['Published', 'Draft']} busy={busy} onCancel={() => setEditing(null)} onSave={values => onUpdate('collection', row.id, values)} /> : <article key={row.id}><div><span><LayoutTemplate aria-hidden="true" /></span><p><b>{row.name}</b><small>{row.status} · {row.category_ids.length} categories</small></p></div><button type="button" onClick={() => setEditing({kind: 'collection', id: row.id})}><Pencil aria-hidden="true" />Edit</button><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('collection', row.id, row.name)}><Trash2 aria-hidden="true" />Delete</button></article>)}</div>;
}

function EditRow({name, description, status, statuses, busy, onCancel, onSave}: {name: string; description: string; status: string; statuses: string[]; busy: boolean; onCancel: () => void; onSave: (values: Record<string, unknown>) => Promise<void>}) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await onSave({name: form.get('name'), description: form.get('description'), status: form.get('status')}); }
  return <form className="catalog-tools-edit" onSubmit={submit}><input name="name" defaultValue={name} required /><textarea name="description" defaultValue={description} rows={2} /><select name="status" defaultValue={status}>{statuses.map(item => <option key={item}>{item}</option>)}</select><button type="submit" disabled={busy}><Check aria-hidden="true" />Save</button><button type="button" onClick={onCancel}><X aria-hidden="true" />Cancel</button></form>;
}

function MediaTools({media, products, selected, setSelected, coverId, setCoverId, productSlug, setProductSlug, busy, onAssign, onDelete}: {media: MediaRow[]; products: ProductRow[]; selected: string[]; setSelected: (value: string[]) => void; coverId: string; setCoverId: (value: string) => void; productSlug: string; setProductSlug: (value: string) => void; busy: boolean; onAssign: () => Promise<void>; onDelete: (kind: 'media', id: string, label: string) => Promise<void>}) {
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  return <div><div className="catalog-media-assignment"><label>Assign selected images to<select value={productSlug} onChange={event => setProductSlug(event.target.value)}><option value="">Choose a template…</option>{products.map(product => <option value={product.slug} key={product.id}>{product.title}</option>)}</select></label><button type="button" disabled={busy || !productSlug || !selected.length || !coverId} onClick={() => void onAssign()}>Assign {selected.length || ''} image{selected.length === 1 ? '' : 's'}</button><small>Select multiple images below, then choose exactly one as the cover. The rest become product previews.</small></div><div className="catalog-media-grid">{media.map(asset => <article className={selected.includes(asset.id) ? 'selected' : ''} key={asset.id}><button className="catalog-media-image" type="button" onClick={() => toggle(asset.id)}>{asset.public_url ? <img src={asset.public_url} alt={asset.name} /> : <ImageIcon aria-hidden="true" />}</button><label><input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggle(asset.id)} />Select</label>{selected.includes(asset.id) && <label><input type="radio" name="cover-media" checked={coverId === asset.id} onChange={() => setCoverId(asset.id)} />Use as cover</label>}<b>{asset.name}</b><small>{asset.product_slug ? `Assigned to ${asset.product_slug}` : 'Unassigned'}</small><button className="danger" type="button" onClick={() => void onDelete('media', asset.id, asset.name)}><Trash2 aria-hidden="true" /></button></article>)}</div></div>;
}
