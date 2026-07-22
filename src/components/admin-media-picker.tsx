'use client';

import {ImageIcon} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {AdminMedia} from '@/lib/admin-media';

export function MediaLibraryField({
  media,
  name,
  label,
  value = '',
  help,
}: {
  media: AdminMedia[];
  name: string;
  label: string;
  value?: string;
  help?: string;
}) {
  const assignable = useMemo(
    () => media.filter(asset => asset.status === 'Ready' && asset.publicUrl && (asset.type === 'Cover' || asset.type === 'Preview')),
    [media],
  );
  const [selected, setSelected] = useState(value);
  const selectedAsset = assignable.find(asset => asset.publicUrl === selected);

  return (
    <fieldset className="admin-media-picker wide">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={selected} />
      <div className="admin-media-picker-current">
        {selected ? <img src={selected} alt="Selected artwork" /> : <span><ImageIcon aria-hidden="true" /></span>}
        <div>
          <b>{selectedAsset?.name || (selected ? 'Current artwork' : 'No library image selected')}</b>
          <small>{help || 'Choose an uploaded image, or upload a replacement below.'}</small>
        </div>
        {selected && <button type="button" onClick={() => setSelected('')}>Clear</button>}
      </div>
      {assignable.length ? (
        <div className="admin-media-picker-grid" aria-label={`${label} media options`}>
          {assignable.map(asset => (
            <button
              type="button"
              className={asset.publicUrl === selected ? 'selected' : ''}
              aria-pressed={asset.publicUrl === selected}
              onClick={() => setSelected(asset.publicUrl)}
              key={asset.id}
            >
              <img src={asset.publicUrl} alt="" />
              <span>{asset.name}</span>
            </button>
          ))}
        </div>
      ) : <p className="admin-media-picker-empty">Upload an image in Media to make it available here.</p>}
    </fieldset>
  );
}
