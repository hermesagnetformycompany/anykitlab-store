export type AdminMediaType = 'Cover' | 'Preview' | 'Video' | 'Delivery';
export type AdminMediaStatus = 'Ready' | 'Processing';

export type AdminMedia = {
  id: string;
  name: string;
  type: AdminMediaType;
  linkedTo: string;
  status: AdminMediaStatus;
  storagePath: string;
  publicUrl: string;
};

export type MediaAssignmentTarget =
  | 'product-cover'
  | 'product-preview'
  | 'category'
  | 'collection'
  | 'hero-1'
  | 'hero-2'
  | 'hero-3';

const mediaTypes = new Set<AdminMediaType>(['Cover', 'Preview', 'Video', 'Delivery']);
const imageTargets = new Set<MediaAssignmentTarget>([
  'product-cover',
  'product-preview',
  'category',
  'collection',
  'hero-1',
  'hero-2',
  'hero-3',
]);

function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request body.');
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maximum: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maximum) throw new Error(`${label} is too long.`);
  return text;
}

export function parseMediaCreateInput(value: unknown) {
  const input = objectInput(value);
  const name = requiredText(input.name, 'File name', 255);
  const type = requiredText(input.type, 'Asset type', 20) as AdminMediaType;
  if (!mediaTypes.has(type)) throw new Error('Unsupported asset type.');
  const storagePath = requiredText(input.storagePath, 'Storage path', 1024);
  if (!/^catalog\/[a-z0-9._/-]+$/i.test(storagePath) || storagePath.includes('..')) {
    throw new Error('Invalid storage path.');
  }
  const publicUrl = typeof input.publicUrl === 'string' ? input.publicUrl.trim() : '';
  if (type !== 'Delivery') {
    try {
      const parsed = new URL(publicUrl);
      if (parsed.protocol !== 'https:') throw new Error();
    } catch {
      throw new Error('A valid public asset URL is required.');
    }
  }
  return {name, type, storagePath, publicUrl: type === 'Delivery' ? '' : publicUrl};
}

export function parseMediaAssignmentInput(value: unknown) {
  const input = objectInput(value);
  const target = requiredText(input.target, 'Assignment target', 30) as MediaAssignmentTarget;
  if (!imageTargets.has(target)) throw new Error('Unsupported image assignment target.');
  const targetId = typeof input.targetId === 'string' ? input.targetId.trim() : '';
  if (!target.startsWith('hero-') && !targetId) throw new Error('Choose where this image should be assigned.');
  if (targetId.length > 160) throw new Error('Assignment target is too long.');
  return {target, targetId};
}

export function toAdminMedia(row: Record<string, unknown>): AdminMedia {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    type: String(row.asset_type || 'Cover') as AdminMediaType,
    linkedTo: row.product_slug ? String(row.product_slug) : 'Shared library',
    status: String(row.status || 'Ready') as AdminMediaStatus,
    storagePath: String(row.storage_path || ''),
    publicUrl: String(row.public_url || ''),
  };
}
