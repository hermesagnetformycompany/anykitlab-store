import {describe, expect, it} from 'vitest';
import {parseMediaAssignmentInput, parseMediaCreateInput, toAdminMedia} from '@/lib/admin-media';
import {parseTeamCreateInput, parseTeamUpdateInput} from '@/lib/admin-team';

describe('admin media validation', () => {
  it('accepts a registered storefront image', () => {
    expect(parseMediaCreateInput({
      name: 'Launch cover.png',
      type: 'Cover',
      storagePath: 'catalog/launch-cover.png',
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/akl-previews/catalog/launch-cover.png',
    })).toEqual(expect.objectContaining({type: 'Cover', storagePath: 'catalog/launch-cover.png'}));
  });

  it('rejects traversal paths and missing public image URLs', () => {
    expect(() => parseMediaCreateInput({name: 'x.png', type: 'Cover', storagePath: 'catalog/../x.png', publicUrl: 'https://example.com/x.png'})).toThrow('Invalid storage path');
    expect(() => parseMediaCreateInput({name: 'x.png', type: 'Preview', storagePath: 'catalog/x.png', publicUrl: ''})).toThrow('valid public asset URL');
  });

  it('validates assignments across templates, categories, collections and hero cards', () => {
    expect(parseMediaAssignmentInput({target: 'collection', targetId: 'col-launch'})).toEqual({target: 'collection', targetId: 'col-launch'});
    expect(parseMediaAssignmentInput({target: 'hero-2'})).toEqual({target: 'hero-2', targetId: ''});
    expect(() => parseMediaAssignmentInput({target: 'category'})).toThrow('Choose where');
  });

  it('normalizes database rows for an immediately visible media card', () => {
    expect(toAdminMedia({id: 'med-1', name: 'Cover', asset_type: 'Cover', product_slug: null, storage_path: 'catalog/cover.png', public_url: 'https://example.com/cover.png', status: 'Ready'})).toEqual({
      id: 'med-1', name: 'Cover', type: 'Cover', linkedTo: 'Shared library', status: 'Ready', storagePath: 'catalog/cover.png', publicUrl: 'https://example.com/cover.png',
    });
  });
});

describe('admin team validation', () => {
  it('creates a scoped staff account input', () => {
    expect(parseTeamCreateInput({name: 'Priya Sharma', email: 'PRIYA@example.com', temporaryPassword: 'secure-pass-123', role: 'Catalog manager'})).toEqual(expect.objectContaining({
      name: 'Priya Sharma', email: 'priya@example.com', role: 'Catalog manager', databaseRole: 'catalog_manager',
    }));
  });

  it('never allows another owner to be created from the team form', () => {
    expect(() => parseTeamCreateInput({name: 'Owner Two', email: 'owner@example.com', temporaryPassword: 'secure-pass-123', role: 'Owner'})).toThrow('valid staff role');
  });

  it('validates status and database mappings for edits', () => {
    expect(parseTeamUpdateInput({name: 'Reviewer', role: 'Payment reviewer', status: 'Suspended'})).toEqual({
      name: 'Reviewer', role: 'Payment reviewer', databaseRole: 'payment_reviewer', status: 'Suspended', databaseStatus: 'suspended',
    });
    expect(() => parseTeamUpdateInput({name: 'Reviewer', role: 'Payment reviewer', status: 'Deleted'})).toThrow('valid team-member status');
  });
});
