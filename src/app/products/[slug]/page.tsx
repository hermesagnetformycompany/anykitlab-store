import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ImageOff} from 'lucide-react';
import {AddButton, ProductArt} from '@/components/site';
import {ProductTabs} from '@/components/product-tabs';
import {WishlistButton} from '@/components/wishlist-button';
import {money, products as staticProducts} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, productJsonLd, breadcrumbJsonLd, faqJsonLd, SITE_URL} from '@/lib/seo';

export function generateStaticParams() {
  return staticProducts.map(product => ({slug: product.slug}));
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const product = staticProducts.find(p => p.slug === slug);
  if (!product) return buildMetadata({title: 'Product Not Found', path: `/products/${slug}`, noIndex: true});
  return buildMetadata({
    title: product.title,
    description: product.description,
    path: `/products/${slug}`,
    type: 'product',
    keywords: [product.category, 'Canva templates', product.title, 'template kit'],
  });
}

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, catalog] = await Promise.all([params, getCatalogData()]);
  const {products} = catalog;
  const product = products.find(item => item.slug === slug);
  if (!product) notFound();
  const recommended = products.filter(item => item.slug !== slug).slice(0, 5);
  const productFaqs = [
    {question: 'How do I receive my templates after purchase?', answer: 'Once your UPI payment is verified (usually within 12–24 hours), access links appear in your customer account under Downloads & Access, and a delivery confirmation is sent to your email.'},
    {question: 'Do I need a Canva Pro account?', answer: 'No. Every layout in this kit is designed to work with a free Canva account.'},
    {question: 'Can I use these templates for my clients?', answer: 'Yes. You can use and adapt the templates for your own business or clients. Resale, sharing or redistribution of the template files is not permitted.'},
    {question: 'Is this a digital product?', answer: 'Yes. All template kits are digital products. No physical items will be shipped. Access is delivered after payment verification.'},
  ];
  const structuredData = [
    productJsonLd({title: product.title, description: product.description, price: product.price, mrp: product.mrp, slug: product.slug, category: product.category, includes: product.includes}),
    breadcrumbJsonLd([
      {name: 'Home', url: SITE_URL},
      {name: 'Templates', url: `${SITE_URL}/shop`},
      {name: product.category, url: `${SITE_URL}/categories/${product.categoryId.replace('cat-', '')}`},
      {name: product.title, url: `${SITE_URL}/products/${product.slug}`},
    ]),
    faqJsonLd(productFaqs),
  ];

  return (
    <div className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Templates</span><b>›</b><span>{product.category}</span><b>›</b><span>{product.title}</span></div>
      <section className="product-main">
        <div className="product-gallery">
          <div className="product-feature-image"><ProductArt p={product} large /><WishlistButton slug={product.slug} /></div>
          <div className="product-thumbnails">{[0, 1, 2, 3].map(index => <button type="button" key={index} aria-label={`Preview placeholder ${index + 1}`}><ImageOff aria-hidden="true" /><small>Preview {index + 1}</small></button>)}<button type="button" className="more-thumbnails">+12<br /><small>MORE</small></button></div>
        </div>
        <div className="product-summary">
          <span className="product-type">Templates <b>•</b> {product.category}</span>
          <h1>{product.title}</h1>
          <div className="product-rating"><b>★★★★★</b></div>
          <p>{product.long}</p>
          <div className="product-price"><strong>{money(product.price)}</strong><s>{money(product.mrp)}</s><b>{Math.round((1 - product.price / product.mrp) * 100)}% OFF</b></div>
          <div className="product-availability"><span>● In stock</span><span>◷ Access after verification</span></div>
          <div className="product-actions"><AddButton slug={product.slug} label="Add to Cart" /><Link href="/cart">⚡ Buy Now</Link></div>
          <div className="product-service-row"><span>⇩<small>Digital product</small></span><span>✣<small>Made for Canva</small></span><span>◇<small>Secure checkout</small></span></div>
        </div>
      </section>

      <section className="product-highlights">
        <div><h2>Product Highlights</h2><ul>{['Ready-to-use layouts', `${product.layoutCount}+ editable templates`, 'Multiple formats', 'Canva compatible', 'High resolution exports', 'Commercial-use licence'].map(item => <li key={item}>▧ {item}</li>)}</ul></div>
        <div><h2>What&apos;s Inside</h2><ul>{product.includes.concat(['Content prompts', 'Quick-start guide']).map(item => <li key={item}>✓ {item}</li>)}</ul></div>
        <div><h2>Why You&apos;ll Love It</h2><ul>{['Professionally designed for your niche', 'Save hours with ready-to-use content', 'Fully customisable to match your brand'].map(item => <li key={item}>◇ {item}</li>)}</ul><div className="canva-note"><b>Canva</b><span><strong>Made for Canva</strong><small>Edit everything in Canva with drag-and-drop ease.</small></span></div></div>
      </section>

      <ProductTabs tabs={[
        {
          id: 'description',
          label: 'Description',
          content: <div className="product-description"><div><p>{product.long}</p></div><aside><h3>Secure Payment & Verification</h3><span>▣ 100% secure checkout</span><span>▧ Pay via UPI, cards, netbanking & more</span><span>◷ Manual payment verification</span><span>✉ Access after confirmation</span><div>VISA　●　RuPay　UPI</div></aside></div>,
        },
        {
          id: 'included',
          label: "What's included",
          content: <div className="product-description"><div><ul>{product.includes.concat(['Content prompts', 'Quick-start guide']).map(item => <li key={item}>✓ {item}</li>)}</ul></div></div>,
        },
        {
          id: 'faqs',
          label: 'FAQs',
          content: <div className="product-description"><div>{productFaqs.map((faq, i) => <details key={i}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div>,
        },
        {
          id: 'delivery',
          label: 'Delivery & Access',
          content: <div className="product-description"><div><p>Once your UPI payment is verified (usually within 12–24 hours), access links appear in your customer account under Downloads & Access, and a delivery confirmation is sent to your email.</p><ul><li>Digital product — no physical shipping</li><li>Access links delivered after payment verification</li><li>Download available from your account dashboard</li></ul></div></div>,
        },
        {
          id: 'license',
          label: 'License',
          content: <div className="product-description"><div><p>You can use and adapt the templates for your own business or clients. Resale, sharing or redistribution of the template files is not permitted.</p></div></div>,
        },
        {
          id: 'reviews',
          label: 'Reviews',
          content: <div className="product-description"><div><p>Reviews coming soon.</p></div></div>,
        },
      ]} />

      <section className="recommended-products"><div><h2>You May Also Like</h2><Link href="/shop">View all →</Link></div><div>{recommended.map(item => <Link key={item.slug} href={`/products/${item.slug}`}><ProductArt p={item} compact /><strong>{item.title}</strong><span>{money(item.price)}　<s>{money(item.mrp)}</s></span></Link>)}</div></section>
    </div>
  );
}
