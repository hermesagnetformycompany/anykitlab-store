import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ImageOff} from 'lucide-react';
import {AddButton, ProductArt} from '@/components/site';
import {WishlistButton} from '@/components/wishlist-button';
import {money, products as staticProducts} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';

export function generateStaticParams() {
  return staticProducts.map(product => ({slug: product.slug}));
}

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, catalog] = await Promise.all([params, getCatalogData()]);
  const {products} = catalog;
  const product = products.find(item => item.slug === slug);
  if (!product) notFound();
  const recommended = products.filter(item => item.slug !== slug).slice(0, 5);

  return (
    <div className="product-page">
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Templates</span><b>›</b><span>{product.category}</span><b>›</b><span>{product.title}</span></div>
      <section className="product-main">
        <div className="product-gallery">
          <div className="product-feature-image"><ProductArt p={product} large /><WishlistButton slug={product.slug} /></div>
          <div className="product-thumbnails">{[0, 1, 2, 3].map(index => <button type="button" key={index} aria-label={`Preview placeholder ${index + 1}`}><ImageOff aria-hidden="true" /><small>Preview {index + 1}</small></button>)}<button type="button" className="more-thumbnails">+12<br /><small>MORE</small></button></div>
        </div>
        <div className="product-summary">
          <span className="product-type">Templates <b>•</b> {product.category}</span>
          <h1>{product.title}</h1>
          <div className="product-rating"><b>★★★★★</b><span>4.9 (128 reviews)</span><span>2,145+ customers</span><em>● Bestseller</em></div>
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

      <section className="product-details-tabs">
        <nav><button type="button" className="active">Description</button><button type="button">What&apos;s included</button><button type="button">FAQs</button><button type="button">Delivery & Access</button><button type="button">License</button><button type="button">Reviews (128)</button></nav>
        <div className="product-description"><div><p>Take your brand to the next level with this premium collection of editable templates.</p><p>Designed for creators, personal trainers, fitness studios and wellness brands, these templates help you:</p><ul><li>Attract more followers and new clients</li><li>Promote workouts, classes and challenges</li><li>Build trust with professional, on-brand content</li><li>Save time with ready-to-customise designs</li></ul><p>Fully editable in Canva. No design skills needed.</p></div><aside><h3>Secure Payment & Verification</h3><span>▣ 100% secure checkout</span><span>▧ Pay via UPI, cards, netbanking & more</span><span>◷ Manual payment verification</span><span>✉ Access after confirmation</span><div>VISA　●　RuPay　UPI</div></aside></div>
      </section>

      <section className="recommended-products"><div><h2>You May Also Like</h2><Link href="/shop">View all →</Link></div><div>{recommended.map(item => <Link key={item.slug} href={`/products/${item.slug}`}><ProductArt p={item} compact /><strong>{item.title}</strong><span>{money(item.price)}　<s>{money(item.mrp)}</s></span></Link>)}</div></section>
    </div>
  );
}
