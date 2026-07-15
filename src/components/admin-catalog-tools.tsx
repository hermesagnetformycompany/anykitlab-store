'use client';

import {FormEvent, useMemo, useState, useTransition} from 'react';
import {Check, ImageIcon, LayoutTemplate, Pencil, RefreshCw, Trash2, X} from 'lucide-react';
import type {AdminCatalogData, AdminCatalogProduct, AdminCatalogCategory, AdminCatalogCollection, AdminCatalogMedia} from '@/lib/admin-catalog-data';
import {assignCatalogMediaAction, deleteCatalogEntityAction, refreshCatalogAction, updateCatalogEntityAction} from '@/app/admin/catalog-actions';

type ToolTab = 'Templates' | 'Categories' | 'Collections' | 'Media';
type EditTarget = {kind: 'category' | 'collection'; id: string} | null;
type ActionResult = {ok: boolean; data?: AdminCatalogData; error?: string; requiresCascade?: boolean};

export function AdminCatalogTools({initialData, initialError = ''}: {initialData: AdminCatalogData; initialError?: string}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab>('Templates');
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState(initialError);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [coverId, setCoverId] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [editing, setEditing] = useState<EditTarget>(null);
  const [pending, startTransition] = useTransition();

  const assignableMedia = useMemo(
    () => data.media.filter(item => item.asset_type === 'Cover' || item.asset_type === 'Preview'),
    [data.media],
  );
  const effectiveCoverId = selectedMedia.includes(coverId) ? coverId : (selectedMedia[0] || '');

  function applyResult(result: ActionResult, success: string) {
    if (!result.ok) {
      setNotice(result.error || 'Catalog action failed.');
      return false;
    }
    if (result.data) setData(result.data);
    setNotice(success);
    return true;
  }

  function refresh() {
    startTransition(async () => {
      applyResult(await refreshCatalogAction(), 'Catalog refreshed from Supabase.');
    });
  }

  function update(kind: 'template' | 'category' | 'collection', id: string, values: Record<string, unknown>) {
    return new Promise<void>(resolve => {
      startTransition(async () => {
        const ok = applyResult(await updateCatalogEntityAction({kind, id, values}), 'Changes saved and storefront refreshed.');
        if (ok) setEditing(null);
        resolve();
      });
    });
  }

  function remove(kind: 'template' | 'category' | 'collection' | 'media', id: string, label: string) {
    return new Promise<void>(resolve => {
      if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) {
        resolve();
        return;
      }
      startTransition(async () => {
        let result = await deleteCatalogEntityAction({kind, id});
        if (!result.ok && kind === 'category' && result.requiresCascade) {
          const confirmed = window.confirm(`${result.error}\n\nDelete the category and all templates inside it?`);
          if (confirmed) result = await deleteCatalogEntityAction({kind, id, cascade: true});
        }
        applyResult(result, `${label} deleted.`);
        resolve();
      });
    });
  }

  function assignMedia() {
    startTransition(async () => {
      const result = await assignCatalogMediaAction({productSlug, mediaIds: selectedMedia, coverId: effectiveCoverId});
      if (applyResult(result, 'Images assigned. The cover and product gallery are now connected.')) {
        setSelectedMedia([]);
        setCoverId('');
      }
    });
  }

  return (
    <>
      <button className="catalog-tools-launcher" type="button" onClick={() => setOpen(true)}><LayoutTemplate aria-hidden="true" />Catalog tools</button>
      {open && (
        <div className="catalog-tools-backdrop" role="presentation">
          <section className="catalog-tools-panel" role="dialog" aria-modal="true" aria-labelledby="catalog-tools-title">
            <header>
              <div><span>LIVE SUPABASE DATA</span><h2 id="catalog-tools-title">Catalog tools</h2><p>Manage templates, categories, collections and product media from one source of truth.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close catalog tools"><X aria-hidden="true" /></button>
            </header>
            <nav aria-label="Catalog tools sections">
              {(['Templates', 'Categories', 'Collections', 'Media'] as ToolTab[]).map(item => <button type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}
              <button type="button" onClick={refresh} title="Refresh from Supabase" disabled={pending}><RefreshCw aria-hidden="true" /></button>
            </nav>
            {notice && <p className="catalog-tools-notice" role="status">{notice}</p>}
            <div className="catalog-tools-body" aria-busy={pending}>
              {tab === 'Templates' ? (
                <TemplateTools products={data.products} busy={pending} onUpdate={update} onDelete={remove} />
              ) : tab === 'Categories' ? (
                <CategoryTools rows={data.categories} editing={editing} setEditing={setEditing} busy={pending} onUpdate={update} onDelete={remove} />
              ) : tab === 'Collections' ? (
                <CollectionTools rows={data.collections} editing={editing} setEditing={setEditing} busy={pending} onUpdate={update} onDelete={remove} />
              ) : (
                <MediaTools media={assignableMedia} products={data.products} selected={selectedMedia} setSelected={setSelectedMedia} coverId={effectiveCoverId} setCoverId={setCoverId} productSlug={productSlug} setProductSlug={setProductSlug} busy={pending} onAssign={assignMedia} onDelete={remove} />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TemplateTools({products, busy, onUpdate, onDelete}: {products: AdminCatalogProduct[]; busy: boolean; onUpdate: (kind: 'template', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'template', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{products.map(product => <article key={product.id}><div>{product.cover_url ? <img src={product.cover_url} alt="" /> : <span><ImageIcon aria-hidden="true" /></span>}<p><b>{product.title}</b><small>/{product.slug}</small></p></div><select value={product.status} disabled={busy} onChange={event => void onUpdate('template', product.id, {status: event.target.value})}><option>Published</option><option>Draft</option><option>Archived</option></select><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('template', product.id, product.title)}><Trash2 aria-hidden="true" />Delete</button></article>)}{!products.length && <p>No templates exist in Supabase yet.</p>}</div>;
}

function CategoryTools({rows, editing, setEditing, busy, onUpdate, onDelete}: {rows: AdminCatalogCategory[]; editing: EditTarget; setEditing: (value: EditTarget) => void; busy: boolean; onUpdate: (kind: 'category', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'category', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{rows.map(row => editing?.kind === 'category' && editing.id === row.id ? <EditRow key={row.id} name={row.name} description={row.description} status={row.status} statuses={['Active', 'Hidden']} busy={busy} onCancel={() => setEditing(null)} onSave={values => onUpdate('category', row.id, values)} /> : <article key={row.id}><div><span><LayoutTemplate aria-hidden="true" /></span><p><b>{row.name}</b><small>/{row.slug} · {row.status}</small></p></div><button type="button" disabled={busy} onClick={() => setEditing({kind: 'category', id: row.id})}><Pencil aria-hidden="true" />Edit</button><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('category', row.id, row.name)}><Trash2 aria-hidden="true" />Delete</button></article>)}</div>;
}

function CollectionTools({rows, editing, setEditing, busy, onUpdate, onDelete}: {rows: AdminCatalogCollection[]; editing: EditTarget; setEditing: (value: EditTarget) => void; busy: boolean; onUpdate: (kind: 'collection', id: string, values: Record<string, unknown>) => Promise<void>; onDelete: (kind: 'collection', id: string, label: string) => Promise<void>}) {
  return <div className="catalog-tools-list">{rows.map(row => editing?.kind === 'collection' && editing.id === row.id ? <EditRow key={row.id} name={row.name} description={row.description} status={row.status} statuses={['Published', 'Draft']} busy={busy} onCancel={() => setEditing(null)} onSave={values => onUpdate('collection', row.id, values)} /> : <article key={row.id}><div><span><LayoutTemplate aria-hidden="true" /></span><p><b>{row.name}</b><small>{row.status} · {row.category_ids.length} categories</small></p></div><button type="button" disabled={busy} onClick={() => setEditing({kind: 'collection', id: row.id})}><Pencil aria-hidden="true" />Edit</button><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('collection', row.id, row.name)}><Trash2 aria-hidden="true" />Delete</button></article>)}</div>;
}

function EditRow({name, description, status, statuses, busy, onCancel, onSave}: {name: string; description: string; status: string; statuses: string[]; busy: boolean; onCancel: () => void; onSave: (values: Record<string, unknown>) => Promise<void>}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({name: form.get('name'), description: form.get('description'), status: form.get('status')});
  }
  return <form className="catalog-tools-edit" onSubmit={submit}><input name="name" defaultValue={name} required /><textarea name="description" defaultValue={description} rows={2} /><select name="status" defaultValue={status}>{statuses.map(item => <option key={item}>{item}</option>)}</select><button type="submit" disabled={busy}><Check aria-hidden="true" />Save</button><button type="button" disabled={busy} onClick={onCancel}><X aria-hidden="true" />Cancel</button></form>;
}

function MediaTools({media, products, selected, setSelected, coverId, setCoverId, productSlug, setProductSlug, busy, onAssign, onDelete}: {media: AdminCatalogMedia[]; products: AdminCatalogProduct[]; selected: string[]; setSelected: (value: string[]) => void; coverId: string; setCoverId: (value: string) => void; productSlug: string; setProductSlug: (value: string) => void; busy: boolean; onAssign: () => void; onDelete: (kind: 'media', id: string, label: string) => Promise<void>}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter(item => item !== id);
      setSelected(next);
      if (coverId === id) setCoverId(next[0] || '');
    } else {
      const next = [...selected, id];
      setSelected(next);
      if (!coverId) setCoverId(id);
    }
  };
  return <div><div className="catalog-media-assignment"><label>Assign selected images to<select value={productSlug} onChange={event => setProductSlug(event.target.value)}><option value="">Choose a template…</option>{products.map(product => <option value={product.slug} key={product.id}>{product.title}</option>)}</select></label><button type="button" disabled={busy || !productSlug || !selected.length || !coverId} onClick={onAssign}>Assign {selected.length || ''} image{selected.length === 1 ? '' : 's'}</button><small>Select multiple images, choose one cover, and assign the rest as previews.</small></div><div className="catalog-media-grid">{media.map(asset => <article className={selected.includes(asset.id) ? 'selected' : ''} key={asset.id}><button className="catalog-media-image" type="button" disabled={busy} onClick={() => toggle(asset.id)}>{asset.public_url ? <img src={asset.public_url} alt={asset.name} /> : <ImageIcon aria-hidden="true" />}</button><label><input type="checkbox" checked={selected.includes(asset.id)} disabled={busy} onChange={() => toggle(asset.id)} />Select</label>{selected.includes(asset.id) && <label><input type="radio" name="cover-media" checked={coverId === asset.id} disabled={busy} onChange={() => setCoverId(asset.id)} />Use as cover</label>}<b>{asset.name}</b><small>{asset.product_slug ? `Assigned to ${asset.product_slug}` : 'Unassigned'}</small><button className="danger" type="button" disabled={busy} onClick={() => void onDelete('media', asset.id, asset.name)}><Trash2 aria-hidden="true" /></button></article>)}</div>{!media.length && <p>No assignable cover or preview images are available.</p>}</div>;
}
