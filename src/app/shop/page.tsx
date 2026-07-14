import type {Metadata} from 'next';
import {Sparkles} from 'lucide-react';
import {CatalogBrowser} from '@/components/catalog-browser';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shop All Kits',
  description: 'Browse professionally designed Canva template kits for creators, founders and small businesses. Filter by category, collection, format and price.',
  path: '/shop',
  keywords: ['shop template kits', 'Canva templates', 'buy templates', 'digital templates'],
});

type ShopSearchParams = Promise<{q?: string; collection?: string; sort?: string}>;

export default async function Shop({searchParams}: {searchParams: ShopSearchParams}) {
  const [filters, catalog] = await Promise.all([searchParams, getCatalogData()]);
  const {categories, products} = catalog;

  return (
    <div className="catalog-page">
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Shop All Kits</span></div>
      <section className="catalog-intro">
        <div>
          <h1>Shop All Kits</h1>
          <p>Professionally designed template kits for creators, founders and small businesses. Every search, category, collection, format, price and layout filter below updates the catalog immediately.</p>
        </div>
        <div className="catalog-stamps"><span>PRACTICAL BY DESIGN.<br />BUILT FOR BUILDERS.</span><b><Sparkles aria-hidden="true" /></b></div>
      </section>
      <CatalogBrowser
        products={products}
        categories={categories}
        mode="shop"
        initialCollection={filters.collection || ''}
        initialQuery={filters.q || ''}
        initialSort={filters.sort || 'featured'}
      />
      <section className="catalog-assurances">
        <span>01 <b>Editable in Canva</b><small>Easy for beginners</small></span>
        <span>02 <b>Practical & proven</b><small>Built for real use</small></span>
        <span>03 <b>Saves time & money</b><small>Ready to customise</small></span>
        <span>04 <b>Professionally designed</b><small>Polished and on-brand</small></span>
        <span>05 <b>Usable systems</b><small>For content that works</small></span>
        <span>06 <b>Launch faster</b><small>Show up consistently</small></span>
      </section>
    </div>
  );
}
