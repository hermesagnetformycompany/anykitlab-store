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

export const metadata: Metadata = buildMetadata({
  title: undefined,
  description: 'Canva template kits and digital launch assets for small businesses, creators, founders and service providers.',
  path: '/',
  keywords: ['Canva templates', 'template kits', 'Instagram templates', 'digital products', 'small business templates'],
});

const categoryItems = [
  {name: 'Fitness & Wellness', slug: 'fitness', icon: Dumbbell},
  {name: 'Beauty & Service', slug: 'beauty', icon: Scissors},
  {name: 'Auto Detailing', slug: 'automotive', icon: CarFront},
  {name: 'Food & Hospitality', slug: 'food', icon: Utensils},
  {name: 'Real Estate', slug: 'real-estate', icon: Building2},
  {name: 'Coaches & Consultants', slug: 'coaching', icon: BriefcaseBusiness},
];

const delivery = [
  {number: '01', title: 'Choose your kit', copy: 'Browse and add your favourite kit to cart.', icon: ShoppingCart},
  {number: '02', title: 'Pay via UPI', copy: 'Complete payment using UPI.', icon: WalletCards},
  {number: '03', title: 'Submit reference', copy: 'Share your UPI transaction reference.', icon: CloudUpload},
  {number: '04', title: 'We verify manually', copy: 'Our team verifies payment within 12–24 hrs.', icon: BadgeCheck},
  {number: '05', title: 'Access your kit', copy: 'You receive access instructions by email.', icon: Mail},
  {number: '06', title: 'Edit in Canva', copy: 'Open in Canva and customise it.', icon: Palette},
];

const faqs: [string, string][] = [
  ['How do I receive my kit after purchase?', 'Once payment is verified, access appears in your customer account and you receive a delivery confirmation by email.'],
  ['Do I need a Canva Pro account?', 'No. Every included layout is designed to work with a free Canva account unless a kit clearly says otherwise.'],
  ['Can I use the templates for my clients?', 'Yes. You can use and adapt the templates for your own business as often as you like. Resale, sharing or redistribution of the template files is not permitted.'],
  ['What’s your refund policy?', 'Because digital products cannot be returned, purchases are generally final. If a file is faulty or inaccessible, contact support and we will make it right.'],
];

export default async function Home() {
  const {products} = await getCatalogData();
  const homeFaqs = [
    {question: 'How do I receive my kit after purchase?', answer: 'Once payment is verified, access appears in your customer account and you receive a delivery confirmation by email.'},
    {question: 'Do I need a Canva Pro account?', answer: 'No. Every included layout is designed to work with a free Canva account unless a kit clearly says otherwise.'},
    {question: 'Can I use the templates for my clients?', answer: 'Yes. Use and adapt the templates for your own business as often as you like. Resale, sharing or redistribution is not permitted.'},
    {question: 'What\u2019s your refund policy?', answer: 'Because digital products cannot be returned, purchases are generally final. If a file is faulty or inaccessible, contact support and we will make it right.'},
  ];
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
        <div className="hero-visual hero-visual-placeholder" aria-label="Product artwork coming soon">
          <div className="placeholder-stack"><span><small>FITNESS</small><b>Cover<br />visual</b></span><span><small>BEAUTY</small><b>Cover<br />visual</b></span><span><small>DETAILING</small><b>Cover<br />visual</b></span></div>
          <div className="quality-seal"><Sparkles aria-hidden="true" /><span>MADE TO EDIT<br />BUILT TO GROW</span></div>
          <p>New product artwork is being prepared.<br />The store structure is ready for your final covers.</p>
        </div>
        <div className="hero-benefits">
          <span><PencilRuler aria-hidden="true" />Editable in Canva</span><span><BadgeCheck aria-hidden="true" />Practical & proven</span><span><Clock3 aria-hidden="true" />Saves time</span><span><Rocket aria-hidden="true" />Launch faster</span><span><Gauge aria-hidden="true" />Usable systems</span>
        </div>
      </section>

      <section className="home-block featured-block">
        <div className="block-heading"><h2>Featured Template Kits</h2><Link href="/shop">View all kits <span>→</span></Link></div>
        <div className="featured-grid">
          {products.map(product => <article className="home-product" key={product.slug}>
            <Link className="home-product-image" href={`/products/${product.slug}`}><ProductArt p={product} /></Link>
            <div className="home-product-copy"><Link href={`/products/${product.slug}`}><h3>{product.title}</h3></Link><span>{product.layoutCount}+ Layouts</span><strong>{money(product.price)}</strong><div><Link className="view-kit" href={`/products/${product.slug}`}>View Kit</Link><AddButton slug={product.slug} label="Add to Cart" /></div></div>
          </article>)}
        </div>
      </section>

      <section className="home-block category-block">
        <div className="block-heading"><h2>Shop by Category</h2></div>
        <div className="category-grid">
          {categoryItems.map(category => {const Icon = category.icon; return <Link href={`/categories/${category.slug}`} key={category.slug}><span className="line-icon"><Icon aria-hidden="true" /></span><b>{category.name}</b></Link>;})}
          <Link className="all-categories" href="/shop"><span className="line-icon"><Store aria-hidden="true" /></span><b>View all<br />categories</b></Link>
        </div>
      </section>

      <section className="home-block collection-block">
        <div className="block-heading"><h2>Collections</h2></div>
        <div className="collection-grid">
          <Link href="/shop?collection=bestsellers"><div><h3>Bestsellers</h3><p>Customer favourites that get results.</p><span>Shop Bestsellers →</span></div><div className="collection-placeholder"><BadgeCheck aria-hidden="true" /><small>BESTSELLING KITS</small></div></Link>
          <Link href="/shop?collection=new-arrivals"><div><h3>New Arrivals</h3><p>Fresh kits to keep your brand ahead.</p><span>Shop New →</span></div><div className="collection-placeholder"><Sparkles aria-hidden="true" /><small>NEW TO THE LAB</small></div></Link>
          <Link href="/collections/col-launch"><div><h3>Starter Kits</h3><p>Perfect for getting started and launching fast.</p><span>Explore Starters →</span></div><div className="collection-placeholder"><Rocket aria-hidden="true" /><small>STARTER SYSTEMS</small></div></Link>
        </div>
      </section>

      <section className="home-block delivery-block" id="delivery">
        <div className="block-heading"><h2>How delivery works</h2></div>
        <div className="delivery-grid">
          {delivery.map(step => {const Icon = step.icon; return <div className="delivery-step" key={step.number}><div className="step-mark"><span className="line-icon"><Icon aria-hidden="true" /></span><b>{step.number}</b></div><h3>{step.title}</h3><p>{step.copy}</p></div>;})}
        </div>
        <p className="delivery-note">Manual verification ensures accuracy and helps us keep prices low for you.</p>
      </section>

      <section className="value-ribbon">
        <div><Check aria-hidden="true" /><span><strong>Complete template kits</strong><small>Everything you need in one place.</small></span></div><div><Clock3 aria-hidden="true" /><span><strong>Save hours of work</strong><small>Done-for-you systems you can customise.</small></span></div><div><Gem aria-hidden="true" /><span><strong>Professional & on-brand</strong><small>Look polished and build trust instantly.</small></span></div><div><PencilRuler aria-hidden="true" /><span><strong>Designed for real use</strong><small>Practical, editable and business-ready.</small></span></div><div><Rocket aria-hidden="true" /><span><strong>Launch with confidence</strong><small>Show up consistently and grow your brand.</small></span></div>
      </section>

      <section className="home-block">
        <div className="faq" id="faqs"><div className="block-heading"><h2>Frequently asked questions</h2></div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}<Link href="/help#faqs">View all FAQs →</Link></div>
      </section>
    </div>
  );
}
