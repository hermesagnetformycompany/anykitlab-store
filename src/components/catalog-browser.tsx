'use client';

import {Grid3X3, List, Search, SlidersHorizontal, X} from 'lucide-react';
import {useMemo, useState} from 'react';
import {ProductCard} from '@/components/site';
import {money, type Category, type Product} from '@/lib/data';

type CatalogMode = 'shop' | 'category';

type CatalogBrowserProps = {
  products: Product[];
  mode: CatalogMode;
  categories?: Category[];
  subcategories?: string[];
  formats?: string[];
  initialCollection?: string;
  initialQuery?: string;
  initialSort?: string;
};

const collectionOptions = [
  {value: 'bestsellers', label: 'Bestsellers'},
  {value: 'new-arrivals', label: 'New Arrivals'},
  {value: 'col-social', label: 'Instagram Growth Kits'},
  {value: 'col-launch', label: 'Launch & Offer Kits'},
] as const;

const shopFormatOptions = [
  'Instagram Posts',
  'Stories',
  'Carousels',
  'Service & Price Menus',
  'Offers & Lead Magnets',
] as const;

const layoutOptions = [
  {value: 'under-60', label: 'Up to 60 layouts'},
  {value: '60-79', label: '60–79 layouts'},
  {value: '80-99', label: '80–99 layouts'},
  {value: '100-plus', label: '100+ layouts'},
] as const;

const normalize = (value: string) => value.toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, ' ').trim();

function containsConcept(product: Product, value: string) {
  const haystack = normalize([product.title, product.category, product.description, ...product.formats].join(' '));
  const concept = normalize(value);
  const aliases: Record<string, string[]> = {
    'instagram posts': ['post', 'feed', 'instagram'],
    stories: ['story', 'stories'],
    carousels: ['carousel'],
    'service and price menus': ['service', 'menu', 'price'],
    'offers and lead magnets': ['offer', 'lead magnet'],
    'before and after': ['before after'],
    'price lists': ['price'],
    'booking policies': ['booking', 'policy'],
    'highlight covers': ['highlight', 'cover'],
    'menu cards': ['menu'],
    'table displays': ['menu', 'display'],
    presentations: ['presentation', 'lead magnet'],
  };
  const terms = aliases[concept] || concept.split(' ').filter(word => word.length > 3);
  return terms.some(term => haystack.includes(normalize(term)));
}

function matchesCollection(product: Product, value: string) {
  if (value === 'bestsellers') return product.badge === 'BESTSELLER';
  if (value === 'new-arrivals') return product.badge === 'NEW';
  return product.collectionId === value;
}

function matchesLayout(product: Product, value: string) {
  if (value === 'under-60') return product.layoutCount < 60;
  if (value === '60-79') return product.layoutCount >= 60 && product.layoutCount < 80;
  if (value === '80-99') return product.layoutCount >= 80 && product.layoutCount < 100;
  return product.layoutCount >= 100;
}

function toggleSelection(value: string, setValues: React.Dispatch<React.SetStateAction<string[]>>) {
  setValues(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
}

export function CatalogBrowser({
  products,
  mode,
  categories = [],
  subcategories = [],
  formats = [],
  initialCollection = '',
  initialQuery = '',
  initialSort = 'featured',
}: CatalogBrowserProps) {
  const priceFloor = Math.min(499, ...products.map(product => product.price));
  const priceCeiling = Math.max(priceFloor, ...products.map(product => product.price));
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState('all');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(initialCollection ? [initialCollection] : []);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(priceCeiling);
  const [sort, setSort] = useState(['featured', 'newest', 'price-low', 'price-high', 'layouts'].includes(initialSort) ? initialSort : 'featured');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const visibleProducts = useMemo(() => {
    const normalizedQuery = normalize(query);
    const filtered = products.filter(product => {
      const searchable = normalize([product.title, product.category, product.description, ...product.formats].join(' '));
      const queryMatch = !normalizedQuery || searchable.includes(normalizedQuery);
      const categoryMatch = categoryId === 'all' || product.categoryId === categoryId;
      const subcategoryMatch = !selectedSubcategories.length || selectedSubcategories.some(value => containsConcept(product, value));
      const collectionMatch = !selectedCollections.length || selectedCollections.some(value => matchesCollection(product, value));
      const formatMatch = !selectedFormats.length || selectedFormats.some(value => containsConcept(product, value));
      const layoutMatch = !selectedLayouts.length || selectedLayouts.some(value => matchesLayout(product, value));
      return queryMatch && categoryMatch && subcategoryMatch && collectionMatch && formatMatch && layoutMatch && product.price <= maxPrice;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      if (sort === 'layouts') return b.layoutCount - a.layoutCount;
      return products.indexOf(a) - products.indexOf(b);
    });
  }, [categoryId, maxPrice, products, query, selectedCollections, selectedFormats, selectedLayouts, selectedSubcategories, sort]);

  const availableFormats = mode === 'shop' ? [...shopFormatOptions] : formats;
  const activeFilterCount = (query ? 1 : 0) + (categoryId !== 'all' ? 1 : 0) + selectedSubcategories.length + selectedCollections.length + selectedFormats.length + selectedLayouts.length + (maxPrice < priceCeiling ? 1 : 0);

  const clearFilters = () => {
    setQuery('');
    setCategoryId('all');
    setSelectedSubcategories([]);
    setSelectedCollections([]);
    setSelectedFormats([]);
    setSelectedLayouts([]);
    setMaxPrice(priceCeiling);
  };

  return (
    <div className={mode === 'shop' ? 'catalog-layout' : 'category-shop'}>
      <aside className={mode === 'shop' ? 'catalog-filters' : 'category-filters'} aria-label="Product filters">
        <div className="filter-heading"><span><SlidersHorizontal aria-hidden="true" />Filter Kits{activeFilterCount > 0 && <em>{activeFilterCount}</em>}</span><button type="button" onClick={clearFilters} disabled={!activeFilterCount}>Clear all</button></div>
        {mode === 'shop' && <label className="filter-search"><span>Search shop</span><span className="filter-search-control"><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search templates…" /></span></label>}
        {mode === 'shop' && <fieldset><legend>Categories</legend><label><input type="radio" name="category" checked={categoryId === 'all'} onChange={() => setCategoryId('all')} />All categories <em>{products.length}</em></label>{categories.map(category => <label key={category.id}><input type="radio" name="category" checked={categoryId === category.id} onChange={() => setCategoryId(category.id)} />{category.name}<em>{products.filter(product => product.categoryId === category.id).length}</em></label>)}</fieldset>}
        {mode === 'category' && <fieldset><legend>Subcategory</legend>{subcategories.map(item => <label key={item}><input type="checkbox" checked={selectedSubcategories.includes(item)} onChange={() => toggleSelection(item, setSelectedSubcategories)} />{item}</label>)}</fieldset>}
        <fieldset><legend>Collections</legend>{collectionOptions.map(item => <label key={item.value}><input type="checkbox" checked={selectedCollections.includes(item.value)} onChange={() => toggleSelection(item.value, setSelectedCollections)} />{item.label}<em>{products.filter(product => matchesCollection(product, item.value)).length}</em></label>)}</fieldset>
        <fieldset><legend>Template formats</legend>{availableFormats.map(item => <label key={item}><input type="checkbox" checked={selectedFormats.includes(item)} onChange={() => toggleSelection(item, setSelectedFormats)} />{item}<em>{products.filter(product => containsConcept(product, item)).length}</em></label>)}</fieldset>
        <fieldset><legend>Maximum price</legend><label className="price-output" htmlFor={`${mode}-price-range`}>Up to <output>{money(maxPrice)}</output></label><input id={`${mode}-price-range`} className="price-range" type="range" min={priceFloor} max={priceCeiling} step="100" value={maxPrice} onChange={event => setMaxPrice(Number(event.target.value))} /><div className="range-values"><span>{money(priceFloor)}</span><span>{money(priceCeiling)}</span></div></fieldset>
        <fieldset><legend>Number of layouts</legend>{layoutOptions.map(item => <label key={item.value}><input type="checkbox" checked={selectedLayouts.includes(item.value)} onChange={() => toggleSelection(item.value, setSelectedLayouts)} />{item.label}<em>{products.filter(product => matchesLayout(product, item.value)).length}</em></label>)}</fieldset>
        <button type="button" className="clear-filters" onClick={clearFilters} disabled={!activeFilterCount}><X aria-hidden="true" />Clear all filters</button>
      </aside>

      <section className={mode === 'shop' ? 'catalog-results' : 'category-results'} aria-live="polite">
        <div className="results-bar category-results-bar">
          <strong>{visibleProducts.length} {visibleProducts.length === 1 ? 'Kit' : 'Kits'} Found</strong>
          <div><label>Sort by <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="layouts">Most layouts</option></select></label><div className="view-switch" role="group" aria-label="Product view"><button type="button" className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')} title="Show products in a grid"><Grid3X3 aria-hidden="true" /><span>Grid</span></button><button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} title="Show products as a list"><List aria-hidden="true" /><span>List</span></button></div></div>
        </div>
        {mode === 'category' && <div className="format-chips"><b>Quick format:</b>{availableFormats.map(item => <button type="button" className={selectedFormats.includes(item) ? 'active' : ''} aria-pressed={selectedFormats.includes(item)} onClick={() => toggleSelection(item, setSelectedFormats)} key={item}>{item}</button>)}</div>}
        {visibleProducts.length ? <div className={`catalog-products ${view === 'list' ? 'list-view' : ''}`}>{visibleProducts.map((product, index) => <ProductCard key={product.slug} p={product} index={index} />)}</div> : <div className="catalog-empty"><Search aria-hidden="true" /><h2>{products.length ? 'No templates match these filters' : 'New template kits are being prepared'}</h2><p>{products.length ? 'Try raising the price limit or clearing one of the selected filters.' : 'Our first kits will appear here as soon as they are published.'}</p>{products.length > 0 && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>}
      </section>
    </div>
  );
}
