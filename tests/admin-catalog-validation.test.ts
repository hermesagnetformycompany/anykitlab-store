import {describe, expect, it} from 'vitest';
import {mapCatalogRow} from '../src/lib/admin-catalog-validation';

const product = {
  id: 'product-1',
  slug: 'product-one',
  title: 'Product One',
  categoryId: 'category-1',
  collectionId: 'collection-1',
  price: 399,
  mrp: 499,
  layoutCount: 8,
  description: 'Short description',
  long: 'Long description',
  accent: '#f0642f',
  dark: '#191917',
  status: 'Published',
  formats: ['Canva'],
  includes: ['Eight layouts'],
  coverUrl: 'https://cdn.example.com/cover.png',
};

describe('admin catalog payload validation', () => {
  it('maps a valid product to database column names', () => {
    expect(mapCatalogRow('products', 'product-1', product)).toEqual(expect.objectContaining({
      id: 'product-1',
      category_id: 'category-1',
      collection_id: 'collection-1',
      price: 399,
      cover_url: 'https://cdn.example.com/cover.png',
    }));
  });

  it('rejects an ID mismatch and malformed references', () => {
    expect(() => mapCatalogRow('products', 'product-2', product)).toThrow('does not match');
    expect(() => mapCatalogRow('products', 'product-1', {...product, categoryId: '../unsafe'})).toThrow('Category is invalid');
  });

  it('rejects insecure remote assets while accepting site-relative assets', () => {
    expect(() => mapCatalogRow('products', 'product-1', {...product, coverUrl: 'http://example.com/cover.png'})).toThrow('secure web');
    expect(mapCatalogRow('products', 'product-1', {...product, coverUrl: '/images/cover.png'})).toEqual(expect.objectContaining({cover_url: '/images/cover.png'}));
  });

  it('rejects invalid prices and unsafe colour values', () => {
    expect(() => mapCatalogRow('products', 'product-1', {...product, mrp: 100})).toThrow('cannot be lower');
    expect(() => mapCatalogRow('products', 'product-1', {...product, accent: 'url(javascript:bad)'})).toThrow('hex colour');
  });

  it('deduplicates bounded collection category IDs', () => {
    const row = mapCatalogRow('collections', 'collection-1', {
      id: 'collection-1',
      name: 'Collection One',
      status: 'Published',
      categoryIds: ['category-1', 'category-1', 'category-2'],
    });
    expect(row.category_ids).toEqual(['category-1', 'category-2']);
  });

  it('rejects overlong arrays and invalid collection statuses', () => {
    expect(() => mapCatalogRow('products', 'product-1', {...product, formats: Array.from({length: 51}, (_, index) => `Format ${index}`)})).toThrow('too many entries');
    expect(() => mapCatalogRow('collections', 'collection-1', {id: 'collection-1', name: 'Collection', status: 'Hidden'})).toThrow('Invalid collection status');
  });
});
