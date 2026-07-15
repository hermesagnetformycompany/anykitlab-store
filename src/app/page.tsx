import type {Metadata} from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  Check,
  Clock3,
  CloudUpload,
  Gem,
  LayoutTemplate,
  Mail,
  Palette,
  PencilRuler,
  Rocket,
  ShoppingCart,
  Store,
  WalletCards,
} from 'lucide-react';
import {AddButton, ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, faqJsonLd} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: undefined,
  description: 'Canva template kits and digital launch assets for small businesses, creators, founders and service providers.',
  path: '/',
  keywords: ['Canva templates', 'template kits', 'Instagram templates', 'digital products', 'small business templates'],
});

const delivery = [
  {number: '01', title: 'Choose your kit', copy: 'Browse and add your favourite kit to cart.', icon: ShoppingCart},
  {number: '02', title: 'Pay via UPI', copy: 'Complete payment using UPI.', icon: WalletCards},
  {number: '03', title: 'Submit reference', copy: 'Share your UPI transaction reference.', icon: CloudUpload},
  {number: '04', title: 'We verify manually', copy: 'Our team verifies the payment reference.', icon: BadgeCheck},
  {number: '05', title: 'Access your kit', copy: 'Approved purchases appear in your customer account.', icon: Mail},
  {number: '06', title: 'Edit in Canva', copy: 'Open your files and customise them.', icon: Palette},
];

const faqs: [string, string][] = [
  ['How do I receive my kit after purchase?', 'Once payment is verified, the order is updated in your customer account and delivery instructions become available.'],
  ['Do I need a Canva Pro account?', 'Check the individual product details before buying. Any Pro-only requirement should be stated there.'],
  ['Can I use the templates for my clients?', 'You may customise finished designs for your own business or client work. Editable source templates cannot be resold or redistributed.'],
  ['What is your refund policy?', 'Digital purchases are generally final, but faulty or inaccessible files should be reported to support.'],
];

export default async function Home() {
  const {products, categories, collections} = await getCatalogData();
  const featured = products.slice(0, 6);
  const homeFaqs = faqs.map(([question, answer]) => ({question, answer}));

  return (
    <div className="reference-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd(homeFaqs))}} />
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-stamp">PRACTICAL BY DESIGN. BUILT FOR BUILDERS.</span>
          <h1>Ready-made kits<br />for <u>anything</u> you’re<br />building.</h1>
          <p>Canva template kits and digital launch assets for small businesses, creators, founders and service providers.</p>
          <div className="hero-actions"><Link className="primary-action" href="/shop">Shop All Kits <span>→</span></Link>{collections[0] && <Link className="secondary-action" href={`/collections/${collections[0].id}`}>Explore Collections</Link>}</div>
        </div>
        <div className="hero-visual">
          {featured[0] ? <ProductArt p={featured[0]} large /> : <div className="store-empty-visual"><LayoutTemplate aria-hidden="true" /><b>Your first published kit will appear here.</b><small>Create and publish a template in the admin workspace.</small></div>}
        </div>
        <div className="hero-benefits">
          <span><PencilRuler aria-hidden="true" />Editable formats</span><span><BadgeCheck aria-hidden="true" />Real product data</span><span><Clock3 aria-hidden="true" />Saves time</span><span><Rocket aria-hidden="true" />Launch faster</span><span><Store aria-hidden="true" />Built for business</span>
        </div>
      </section>

      {featured.length > 0 && <section className="home-block featured-block">
        <div className="block-heading"><h2>Featured Template Kits</h2><Link href="/shop">View all kits <span>→</span></Link></div>
        <div className="featured-grid">
          {featured.map(product => <article className="home-product" key={product.slug}>
            <Link className="home-product-image" href={`/products/${product.slug}`}><ProductArt p={product} /></Link>
            <div className="home-product-copy"><Link href={`/products/${product.slug}`}><h3>{product.title}</h3></Link><span>{product.layoutCount}+ Layouts</span><strong>{money(product.price)}</strong><div><Link className="view-kit" href={`/products/${product.slug}`}>View Kit</Link><AddButton slug={product.slug} label="Add to Cart" /></div></div>
          </article>)}
        </div>
      </section>}

      {categories.length > 0 && <section className="home-block category-block">
        <div className="block-heading"><h2>Shop by Category</h2></div>
        <div className="category-grid">
          {categories.map(category => <Link href={`/categories/${category.slug}`} key={category.id}><span className="line-icon"><LayoutTemplate aria-hidden="true" /></span><b>{category.name}</b></Link>)}
          <Link className="all-categories" href="/shop"><span className="line-icon"><Store aria-hidden="true" /></span><b>View all<br />categories</b></Link>
        </div>
      </section>}

      {collections.length > 0 && <section className="home-block collection-block">
        <div className="block-heading"><h2>Collections</h2></div>
        <div className="collection-grid">
          {collections.slice(0, 3).map(collection => <Link href={`/collections/${collection.id}`} key={collection.id}><div><h3>{collection.name}</h3><p>{collection.description}</p><span>Explore collection →</span></div><div className="collection-placeholder"><BadgeCheck aria-hidden="true" /><small>LIVE COLLECTION</small></div></Link>)}
        </div>
      </section>}

      <section className="home-block delivery-block" id="delivery">
        <div className="block-heading"><h2>How delivery works</h2></div>
        <div className="delivery-grid">
          {delivery.map(step => {const Icon = step.icon; return <div className="delivery-step" key={step.number}><div className="step-mark"><span className="line-icon"><Icon aria-hidden="true" /></span><b>{step.number}</b></div><h3>{step.title}</h3><p>{step.copy}</p></div>;})}
        </div>
      </section>

      <section className="value-ribbon">
        <div><Check aria-hidden="true" /><span><strong>Complete template kits</strong><small>Everything listed comes from real product records.</small></span></div><div><Clock3 aria-hidden="true" /><span><strong>Save hours of work</strong><small>Ready-to-customise systems.</small></span></div><div><Gem aria-hidden="true" /><span><strong>Professional & on-brand</strong><small>Clear covers and previews.</small></span></div><div><PencilRuler aria-hidden="true" /><span><strong>Designed for real use</strong><small>No demo products in the live catalog.</small></span></div><div><Rocket aria-hidden="true" /><span><strong>Launch with confidence</strong><small>Publish once and show everywhere.</small></span></div>
      </section>

      <section className="home-block"><div className="faq" id="faqs"><div className="block-heading"><h2>Frequently asked questions</h2></div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}<Link href="/help#faqs">View all FAQs →</Link></div></section>
    </div>
  );
}
