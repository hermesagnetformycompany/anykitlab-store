import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Layers3, Sparkles} from 'lucide-react';
import {ProductCard} from '@/components/site';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, breadcrumbJsonLd, SITE_URL} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const {collections} = await getCatalogData();
  const collection = collections.find(item => item.id === id);
  if (!collection) return buildMetadata({title: 'Collection Not Found', path: `/collections/${id}`, noIndex: true});
  return buildMetadata({
    title: collection.name,
    description: collection.description,
    path: `/collections/${id}`,
    keywords: [collection.name, 'template collection', 'Canva templates', 'template kits'],
  });
}

export default async function CollectionPage({params}: {params: Promise<{id: string}>}) {
  const [{id}, catalog] = await Promise.all([params, getCatalogData()]);
  const {collections, products, categories} = catalog;
  const collection = collections.find(item => item.id === id);

  if (!collection) {
    if (catalog.source === 'fallback' || collections.length === 0) {
      return (
        <div className="catalog-empty" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',textAlign:'center',padding:'2rem'}}>
          <Layers3 aria-hidden="true" style={{width:'3rem',height:'3rem',marginBottom:'1rem',opacity:.4}} />
          <h2>Collection not available yet</h2>
          <p style={{color:'#666',maxWidth:'400px'}}>We're setting up our catalog. Please check back soon.</p>
          <Link href="/shop" style={{marginTop:'1rem',padding:'0.75rem 1.5rem',background:'var(--accent,#f0642f)',color:'#fff',borderRadius:'8px',textDecoration:'none',fontWeight:600}}>Browse all kits</Link>
        </div>
      );
    }
    notFound();
  }
  const items = products.filter(product => product.collectionId === collection.id);
  const categoryIds = new Set(items.map(item => item.categoryId));
  const includedCategories = categories.filter(category => categoryIds.has(category.id));
  const layoutTotal = items.reduce((total, product) => total + product.layoutCount, 0);
  const collectionBreadcrumbs = breadcrumbJsonLd([
    {name: 'Home', url: SITE_URL},
    {name: 'Collections', url: `${SITE_URL}/shop`},
    {name: collection.name, url: `${SITE_URL}/collections/${id}`},
  ]);

  return (
    <div className="collection-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(collectionBreadcrumbs)}} />
      <div className="breadcrumbs"><Link href="/">Home</Link><b>›</b><Link href="/shop">Collections</Link><b>›</b><span>{collection.name}</span></div>
      <section className="collection-hero">
        <div>
          <span>COLLECTION</span>
          <h1>{collection.name}</h1>
          <p>{collection.description}</p>
          <div className="collection-stats"><b>{items.length}<small>{items.length === 1 ? 'Product' : 'Products'}</small></b><b>{includedCategories.length}<small>{includedCategories.length === 1 ? 'Category' : 'Categories'}</small></b><b>{layoutTotal}<small>Layouts</small></b></div>
          <div className="collection-promises"><span>● Published collection<small>Only available products are shown</small></span><span>◷ Verified delivery<small>Access follows payment review</small></span></div>
        </div>
        <div className="collection-hero-art"><div className="collection-hero-placeholder"><Layers3 aria-hidden="true" /><strong>{collection.name}</strong><span>DIGITAL TEMPLATE COLLECTION</span></div><i><Sparkles aria-hidden="true" /></i></div>
      </section>
      {includedCategories.length > 0 && <nav className="collection-categories" aria-label="Included categories"><b>Includes Categories:</b>{includedCategories.map(category => <Link key={category.id} href={`/categories/${category.slug}`}>{category.name}</Link>)}<Link href="/shop">View all categories →</Link></nav>}
      <section className="collection-products-section">
        <div className="collection-products-head"><h2>All {items.length} Products</h2></div>
        {items.length > 0 ? <div className="collection-products">{items.map((product, index) => <ProductCard key={product.slug} p={product} index={index} />)}</div> : <div className="catalog-empty"><Layers3 aria-hidden="true" /><h2>No published kits yet</h2><p>This collection is ready for products to be added from the administrator workspace.</p><Link href="/shop">Browse all kits</Link></div>}
      </section>
      <section className="collection-why"><div><h2>Why this<br />collection works</h2></div><span>▥ <b>Proven to grow</b><small>Built with strategies that increase reach and engagement.</small></span><span>✎ <b>Editable in Canva</b><small>Easily customise colours, fonts, images, and copy.</small></span><span>◷ <b>Save hours of work</b><small>Done-for-you designs you can launch in minutes.</small></span><span>◎ <b>Made for business</b><small>Professional, on-brand content that builds trust.</small></span></section>
      {collections.length > 1 && <section className="related-collections"><div><h2>Related Collections</h2><Link href="/shop">View all collections →</Link></div>{collections.filter(item => item.id !== id).slice(0, 5).map(item => <Link href={`/collections/${item.id}`} key={item.id}><span className="related-collection-mark"><Layers3 aria-hidden="true" /></span><span><b>{item.name}</b><small>{products.filter(product => product.collectionId === item.id).length} Products</small></span></Link>)}</section>}
    </div>
  );
}