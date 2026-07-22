'use client';

import {FileArchive, ImageIcon, Search, Trash2, UploadCloud} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {Category, Collection, Product} from '@/lib/data';
import type {AdminMedia, MediaAssignmentTarget} from '@/lib/admin-media';

export type MediaAssignmentOption = {
  target: MediaAssignmentTarget;
  targetId: string;
};

type SettingsImages = {heroImage1?: string; heroImage2?: string; heroImage3?: string};

function usageLabel(asset: AdminMedia, products: Product[], categories: Category[], collections: Collection[], settings: SettingsImages) {
  const uses: string[] = [];
  for (const product of products) {
    if (product.coverUrl === asset.publicUrl) uses.push(`${product.title} cover`);
    if (product.previewUrls?.includes(asset.publicUrl)) uses.push(`${product.title} preview`);
  }
  for (const category of categories) if (category.imageUrl === asset.publicUrl) uses.push(`${category.name} category`);
  for (const collection of collections) if (collection.imageUrl === asset.publicUrl) uses.push(`${collection.name} collection`);
  if (settings.heroImage1 === asset.publicUrl) uses.push('Homepage hero 1');
  if (settings.heroImage2 === asset.publicUrl) uses.push('Homepage hero 2');
  if (settings.heroImage3 === asset.publicUrl) uses.push('Homepage hero 3');
  if (!uses.length && asset.linkedTo !== 'Shared library' && asset.linkedTo !== 'Unassigned') uses.push(asset.linkedTo);
  return uses.length ? uses.join(', ') : 'Shared library';
}

export function AdminMediaView({
  media,
  products,
  categories,
  collections,
  settings,
  busy,
  uploading,
  onUpload,
  onAssign,
  onDelete,
}: {
  media: AdminMedia[];
  products: Product[];
  categories: Category[];
  collections: Collection[];
  settings: SettingsImages;
  busy: boolean;
  uploading: boolean;
  onUpload: (files: FileList | null) => Promise<void>;
  onAssign: (assetId: string, assignment: MediaAssignmentOption) => Promise<boolean>;
  onDelete: (asset: AdminMedia) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [target, setTarget] = useState<MediaAssignmentTarget>('product-cover');
  const [targetId, setTargetId] = useState('');
  const filtered = useMemo(() => media.filter(asset => `${asset.name} ${asset.type} ${asset.linkedTo}`.toLowerCase().includes(query.toLowerCase())), [media, query]);
  const selected = media.find(asset => asset.id === selectedId);
  const assignable = selected && selected.publicUrl && (selected.type === 'Cover' || selected.type === 'Preview');
  const needsTargetId = !target.startsWith('hero-');

  const destinations = target.startsWith('product-')
    ? products.map(item => ({id: item.id, label: item.title}))
    : target === 'category'
      ? categories.map(item => ({id: item.id, label: item.name}))
      : target === 'collection'
        ? collections.map(item => ({id: item.id, label: item.name}))
        : [];

  async function assign() {
    if (!selected || !assignable || (needsTargetId && !targetId)) return;
    const ok = await onAssign(selected.id, {target, targetId});
    if (ok) {
      setSelectedId('');
      setTargetId('');
    }
  }

  return (
    <>
      <section className="admin-panel admin-media-upload-panel">
        <header><div><h2>Upload assets</h2><p>Add reusable storefront artwork once, then assign it anywhere in AnyKit Lab.</p></div></header>
        <label className={`admin-dropzone ${uploading ? 'uploading' : ''}`}>
          <UploadCloud aria-hidden="true" />
          <b>{uploading ? 'Uploading and registering assets…' : 'Upload covers, previews, video or delivery files'}</b>
          <span>Images become visible in this library as soon as Supabase confirms the upload.</span>
          <input disabled={uploading} type="file" multiple accept="image/*,video/*,.zip,.pdf" onChange={event => {void onUpload(event.target.files); event.currentTarget.value = '';}} />
        </label>
      </section>

      <section className="admin-panel">
        <header><div><h2>Media library</h2><p>{media.length} uploaded asset{media.length === 1 ? '' : 's'} available across the store.</p></div></header>
        <div className="admin-media-toolbar">
          <label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search media" aria-label="Search media" /></label>
        </div>
        <div className="admin-media-assignment" aria-label="Assign selected media">
          <div>
            <span>SELECTED IMAGE</span>
            <b>{selected?.name || 'Choose an image card below'}</b>
            <small>{assignable ? 'Ready to assign across the storefront.' : selected ? 'Only cover and preview images can be assigned.' : 'Click an image card to select it.'}</small>
          </div>
          <label>Placement
            <select value={target} onChange={event => {setTarget(event.target.value as MediaAssignmentTarget); setTargetId('');}} disabled={!assignable || busy}>
              <option value="product-cover">Template cover</option>
              <option value="product-preview">Template preview/gallery</option>
              <option value="category">Category artwork</option>
              <option value="collection">Collection artwork</option>
              <option value="hero-1">Homepage hero card 1</option>
              <option value="hero-2">Homepage hero card 2</option>
              <option value="hero-3">Homepage hero card 3</option>
            </select>
          </label>
          {needsTargetId && <label>Destination
            <select value={targetId} onChange={event => setTargetId(event.target.value)} disabled={!assignable || busy}>
              <option value="">Choose destination…</option>
              {destinations.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>}
          <button className="admin-primary" type="button" disabled={!assignable || busy || (needsTargetId && !targetId)} onClick={() => void assign()}>
            <ImageIcon aria-hidden="true" />Assign image
          </button>
        </div>

        <div className="admin-media-library-grid">
          {filtered.map(asset => {
            const selectable = Boolean(asset.publicUrl && (asset.type === 'Cover' || asset.type === 'Preview'));
            const usage = usageLabel(asset, products, categories, collections, settings);
            return <article className={selectedId === asset.id ? 'selected' : ''} key={asset.id}>
              <button className="admin-media-card-preview" type="button" disabled={!selectable} aria-pressed={selectedId === asset.id} onClick={() => setSelectedId(asset.id)}>
                {asset.publicUrl && asset.type !== 'Delivery' ? <img src={asset.publicUrl} alt={asset.name} /> : <span>{asset.type === 'Delivery' ? <FileArchive aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}</span>}
              </button>
              <div className="admin-media-card-copy">
                <span>{asset.type}</span>
                <b title={asset.name}>{asset.name}</b>
                <small title={usage}>{usage}</small>
              </div>
              <span className={`admin-status ${asset.status.toLowerCase()}`}>{asset.status}</span>
              <button className="admin-media-delete danger" type="button" disabled={busy} onClick={() => void onDelete(asset)} aria-label={`Delete ${asset.name}`} title={`Delete ${asset.name}`}><Trash2 aria-hidden="true" /></button>
            </article>;
          })}
        </div>
        {!filtered.length && <div className="admin-empty"><ImageIcon aria-hidden="true" /><h3>No matching media</h3><p>Upload an asset or change your search.</p></div>}
      </section>
    </>
  );
}
