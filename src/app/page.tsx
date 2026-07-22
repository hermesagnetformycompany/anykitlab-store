import type {Metadata} from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  Clock3,
  CloudUpload,
  Dumbbell,
  Gauge,
  Gem,
  Mail,
  Palette,
  PencilRuler,
  Rocket,
  Scissors,
  ShoppingCart,
  Sparkles,
  Store,
  Utensils,
  WalletCards,
} from 'lucide-react';
import {AddButton, ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, organizationJsonLd, websiteJsonLd, faqJsonLd} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: undefined,
  description: 'Canva template kits and digital launch assets for small businesses, creators, founders and service providers.',
  path: '/',
  keywords: ['Canva templates', 'template kits', 'Instagram templates', 'digital products', 'small business templates'],
});

const categoryIcons = {
  fitness: Dumbbell,
  beauty: Scissors,
  automotive: CarFront,
  food: Utensils,
  'real-estate': Building2,
  coaching: BriefcaseBusiness,
} as const;

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
  const {products, categories, collections, settings} = await getCatalogData();
  const heroImages = [settings.heroImage1, settings.heroImage2, settings.heroImage3].filter((value): value is string => Boolean(value));
  const usesBundledOgHero = heroImages.length === 3 && heroImages.every(src => src.startsWith('/reference/'));
  const hasRealHeroImages = heroImages.length > 0 && !usesBundledOgHero;
  const homeFaqs = faqs.map(([question, answer]) => ({question, answer}));
  const structuredData = [organizationJsonLd(), websiteJsonLd(), faqJsonLd(homeFaqs)];

  return (
    <div className="reference-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-stamp">PRACTICAL BY DESIGN. BUILT FOR BUILDERS.</span>
          <h1>Ready-made kits<br />for <u>anything</u> you’re<br />building.</h1>
          <p>Canva template kits and digital launch assets for small businesses, creators, founders and service providers.</p>
          <div className="hero-actions"><Link className="primary-action" href="/shop">Shop All Kits <span>→</span></Link><Link className="secondary-action" href="/collections/col-launch">Explore Starter Kits</Link></div>
        </div>
        <div className="hero-visual" aria-label="Featured AnyKit Lab template kits">
          {usesBundledOgHero ? <img className="hero-og-art" src="/reference/hero-kits.png" alt="AnyKit Lab template kit collection" /> : hasRealHeroImages ? <div className="placeholder-stack hero-product-covers">{heroImages.map((src, index) => <span key={src}><img src={src} alt={`Featured AnyKit Lab kit ${index + 1}`} /></span>)}</div> : <div className="placeholder-stack hero-product-covers"><span><small>FEATURED KIT</small><b>Canva Templates</b></span><span><small>EDITABLE KITS</small><b>Instagram Packs</b></span><span><small>READY TO LAUNCH</small><b>Business Assets</b></span></div>}
          <div className="quality-seal"><Sparkles aria-hidden="true" /><span>MADE TO EDIT<br />BUILT TO GROW</span></div>
          <p>Professional template systems for real businesses.<br />Choose a kit, customise it, and launch faster.</p>
        </div>
        <div className="hero-benefits">
          <span><PencilRuler aria-hidden="true" />Editable in Canva</span><span><BadgeCheck aria-hidden="true" />Practical & proven</span><span><Clock3 aria-hidden="true" />Saves time</span><span><Rocket aria-hidden="true" />Launch faster</span><span><Gauge aria-hidden="true" />Usable systems</span>
        </div>
      </section>

      <section className="home-block featured-block">
        <div className="block-heading"><h2>Featured Template Kits</h2><Link href="/shop">View all kits <span>→</span></Link></div>
        {products.length > 0 ? <div className="featured-grid">
          {products.slice(0, 6).map(product => <article className="home-product" key={product.slug}>
            <Link className="home-product-image" href={`/products/${product.slug}`}><ProductArt p={product} /></Link>
            <div className="home-product-copy"><Link href={`/products/${product.slug}`}><h3>{product.title}</h3></Link><span>{product.formats.length ? product.formats.join(', ') : `${product.layoutCount}+ Layouts`}</span><strong>{money(product.price)}</strong><div><Link className="view-kit" href={`/products/${product.slug}`}>View Kit</Link><AddButton slug={product.slug} label="Add to Cart" /></div></div>
          </article>)}
        </div> : <p className="home-empty-message">Published template kits will appear here once they are available.</p>}
      </section>

      <section className="home-block category-block">
        <div className="block-heading"><h2>Shop by Category</h2></div>
        <div className="category-grid">
          {categories.slice(0, 6).map(category => {const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Store; return <Link href={`/categories/${category.slug}`} key={category.slug}><span className="line-icon"><Icon aria-hidden="true" /></span><b>{category.name}</b></Link>;})}
          <Link className="all-categories" href="/shop"><span className="line-icon"><Store aria-hidden="true" /></span><b>View all<br />categories</b></Link>
        </div>
        {!categories.length && <p className="home-empty-message">Published categories will appear here once they are available.</p>}
      </section>

      <section className="home-block collection-block">
        <div className="block-heading"><h2>Collections</h2></div>
        <div className="collection-grid">
          {collections.slice(0, 3).map((collection, index) => <Link href={`/collections/${collection.id}`} key={collection.id}><div><h3>{collection.name}</h3><p>{collection.description}</p><span>Explore Collection →</span></div><div className="collection-placeholder">{collection.imageUrl ? <img src={collection.imageUrl} alt="" /> : index === 0 ? <BadgeCheck aria-hidden="true" /> : index === 1 ? <Sparkles aria-hidden="true" /> : <Rocket aria-hidden="true" />}<small>PUBLISHED COLLECTION</small></div></Link>)}
          {collections.length < 3 && <Link href="/shop"><div><h3>All Template Kits</h3><p>Browse every published kit in the store.</p><span>Shop All Kits →</span></div><div className="collection-placeholder"><Store aria-hidden="true" /><small>EXPLORE THE LAB</small></div></Link>}
        </div>
        {!collections.length && <p className="home-empty-message">Published collections will appear here once they are available.</p>}
      </section>

      <section className="home-block delivery-block" id="delivery">
        <div className="block-heading"><h2>How delivery works</h2></div>
        <div className="delivery-grid">
          {delivery.map(step => {const Icon = step.icon; return <div className="delivery-step" key={step.number}><div className="step-mark"><span className="line-icon"><Icon aria-hidden="true" /></span><b>{step.number}</b></div><h3>{step.title}</h3><p>{step.copy}</p></div>;})}
        </div>
      </section>

      <section className="value-ribbon">
        <div><Check aria-hidden="true" /><span><strong>Complete template kits</strong><small>Everything you need in one place.</small></span></div><div><Clock3 aria-hidden="true" /><span><strong>Save hours of work</strong><small>Done-for-you systems you can customise.</small></span></div><div><Gem aria-hidden="true" /><span><strong>Professional & on-brand</strong><small>Look polished and build trust instantly.</small></span></div><div><PencilRuler aria-hidden="true" /><span><strong>Designed for real use</strong><small>Practical, editable and business-ready.</small></span></div><div><Rocket aria-hidden="true" /><span><strong>Launch with confidence</strong><small>Show up consistently and grow your brand.</small></span></div>
      </section>

      <section className="home-block">
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <div className="card-icon"><PencilRuler aria-hidden="true" /></div>
            <h3>Editable in Canva</h3>
            <p>Every template is fully customisable — change colours, fonts, images and layout to match your brand in minutes.</p>
          </div>
          <div className="testimonial-card">
            <div className="card-icon"><Rocket aria-hidden="true" /></div>
            <h3>Launch Faster</h3>
            <p>Skip the design guesswork. Our kits give you a complete, professional system ready to deploy today.</p>
          </div>
          <div className="testimonial-card">
            <div className="card-icon"><BadgeCheck aria-hidden="true" /></div>
            <h3>Built for Real Use</h3>
            <p>Practical, proven layouts designed for actual business needs — not just pretty templates that sit unused.</p>
          </div>
        </div>
      </section>

      <section className="home-block">
        <div className="faq" id="faqs"><div className="block-heading"><h2>Frequently asked questions</h2></div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}<Link href="/help#faqs">View all FAQs →</Link></div>
      </section>
    </div>
  );
}
