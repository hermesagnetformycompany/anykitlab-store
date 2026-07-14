import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Layers3, Sparkles} from 'lucide-react';
import {ProductCard} from '@/components/site';
import {collections as staticCollections} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, breadcrumbJsonLd, SITE_URL} from '@/lib/seo';

export function generateStaticParams() {
  return staticCollections.map(collection => ({id: collection.id}));
}

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const collection = staticCollections.find(c => c.id === id);
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
  const {collections, products} = catalog;
  const collection = collections.find(item => item.id === id);
  if (!collection) notFound();
  const items = products.filter(product => product.collectionId === collection.id);
  const displayItems = id === 'col-social' ? products : items;
  const collectionBreadcrumbs = breadcrumbJsonLd([
    {name: 'Home', url: SITE_URL},
    {name: 'Collections', url: `${SITE_URL}/shop`},
    {name: collection.name, url: `${SITE_URL}/collections/${id}`},
  ]);

  return (
    <div className="collection-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(collectionBreadcrumbs)}} />
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Collections</span><b>›</b><span>{collection.name}</span></div>
      <section className="collection-hero">
        <div>
          <span>COLLECTION</span>
          <h1>{collection.name}</h1>
          <p>{id === 'col-social' ? 'Everything you need to grow your Instagram audience, boost engagement, and turn followers into loyal customers. Editable in Canva. Built for real results.' : collection.description}</p>
          <div className="collection-stats"><b>{id === 'col-social' ? 12 : displayItems.length}<small>Products</small></b><b>5+<small>Categories</small></b><b>300+<small>Layouts</small></b></div>
          <div className="collection-promises"><span>● Active Collection<small>Regularly updated with new templates</small></span><span>◷ Instant Access<small>Download and customise right away</small></span></div>
        </div>
        <div className="collection-hero-art"><div className="collection-hero-placeholder"><Layers3 aria-hidden="true" /><strong>{collection.name}</strong><span>COLLECTION ARTWORK COMING SOON</span></div><i><Sparkles aria-hidden="true" /></i></div>
      </section>
      <nav className="collection-categories" aria-label="Included categories"><b>Includes Categories:</b>{['Fitness & Wellness', 'Beauty & Service', 'Auto Detailing', 'Coaches & Consultants', 'Real Estate'].map((item, index) => <Link key={item} href={index === 0 ? '/categories/fitness' : '/shop'}>{item}</Link>)}<Link href="/shop">View all categories →</Link></nav>
      <section className="collection-products-section">
        <div className="collection-products-head"><h2>All {displayItems.length} Products</h2><label>Sort by <select><option>Featured</option><option>Newest</option></select></label></div>
        <div className="collection-products">{displayItems.map((product, index) => <ProductCard key={product.slug} p={product} index={index} />)}</div>
      </section>
      <section className="collection-why"><div><h2>Why this<br />collection works</h2></div><span>▥ <b>Proven to grow</b><small>Built with strategies that increase reach and engagement.</small></span><span>✎ <b>Editable in Canva</b><small>Easily customise colours, fonts, images, and copy.</small></span><span>◷ <b>Save hours of work</b><small>Done-for-you designs you can launch in minutes.</small></span><span>◎ <b>Made for business</b><small>Professional, on-brand content that builds trust.</small></span></section>
      <section className="related-collections"><div><h2>Related Collections</h2><Link href="/shop">View all collections →</Link></div>{['TikTok Growth Kits', 'YouTube Growth Kits', 'Email Marketing Kits', 'Website Template Kits', 'Business Launch Kits'].map(item => <Link href="/shop" key={item}><span className="related-collection-mark"><Layers3 aria-hidden="true" /></span><span><b>{item}</b><small>12 Products</small></span></Link>)}</section>
    </div>
  );
}
