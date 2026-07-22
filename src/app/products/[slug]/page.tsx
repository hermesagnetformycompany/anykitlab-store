import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AddButton, ProductArt} from '@/components/site';
import {ProductGallery} from '@/components/product-gallery';
import {ProductTabs, type Tab} from '@/components/product-tabs';
import {WishlistButton} from '@/components/wishlist-button';
import {money} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, productJsonLd, breadcrumbJsonLd, faqJsonLd, SITE_URL} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const {products} = await getCatalogData();
  const product = products.find(item => item.slug === slug && item.status === 'Published');
  if (!product) return buildMetadata({title: 'Product Not Found', path: `/products/${slug}`, noIndex: true});
  return buildMetadata({
    title: product.title,
    description: product.description,
    path: `/products/${slug}`,
    image: product.coverUrl,
    type: 'product',
    keywords: [product.category, 'Canva templates', product.title, 'template kit'],
  });
}

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, catalog] = await Promise.all([params, getCatalogData()]);
  const publishedProducts = catalog.products.filter(item => item.status === 'Published');
  const product = publishedProducts.find(item => item.slug === slug);
  if (!product) notFound();

  const recommended = publishedProducts
    .filter(item => item.slug !== slug && item.categoryId === product.categoryId)
    .concat(publishedProducts.filter(item => item.slug !== slug && item.categoryId !== product.categoryId))
    .slice(0, 5);
  const included = product.includes.length ? product.includes : [`${product.layoutCount}+ editable layouts`, ...product.formats];
  const description = product.long.trim() || product.description.trim();
  const productFaqs = [
    {question: 'How do I receive my templates after purchase?', answer: 'After your UPI payment is reviewed, the order status is updated in your customer account. Delivery instructions are then provided for the purchased kit.'},
    {question: 'Do I need a Canva Pro account?', answer: 'Check the listed formats and product description before buying. Any Pro-only requirement should be stated in the kit details.'},
    {question: 'Can I use these templates for clients?', answer: 'You may customise finished designs for your own business or client work. The editable source templates may not be resold, shared or redistributed.'},
    {question: 'Is this a digital product?', answer: 'Yes. No physical product is shipped. Access is provided after payment verification.'},
  ];
  const structuredData = [
    productJsonLd({title: product.title, description: product.description, price: product.price, mrp: product.mrp, slug: product.slug, category: product.category, includes: included}),
    breadcrumbJsonLd([
      {name: 'Home', url: SITE_URL},
      {name: 'Shop', url: `${SITE_URL}/shop`},
      {name: product.category, url: `${SITE_URL}/categories/${catalog.categories.find(category => category.id === product.categoryId)?.slug || ''}`},
      {name: product.title, url: `${SITE_URL}/products/${product.slug}`},
    ]),
    faqJsonLd(productFaqs),
  ];
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  const tabs: Tab[] = [
    {
      id: 'description',
      label: 'Description',
      content: <div className="product-description"><div><p>{description}</p></div><aside><h3>Payment & Verification</h3><span>▣ Pay using the UPI details shown at checkout</span><span>▧ Submit the exact transaction reference</span><span>◷ Payment is reviewed manually</span><span>✉ Delivery details follow approval</span></aside></div>,
    },
    {
      id: 'included',
      label: "What's included",
      content: <div className="product-description"><div><ul>{included.map(item => <li key={item}>✓ {item}</li>)}</ul></div></div>,
    },
    ...(product.formats.length ? [{
      id: 'formats',
      label: 'Formats',
      content: <div className="product-description"><div><ul>{product.formats.map(item => <li key={item}>▧ {item}</li>)}</ul></div></div>,
    } satisfies Tab] : []),
    {
      id: 'faqs',
      label: 'FAQs',
      content: <div className="product-description"><div>{productFaqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div>,
    },
    {
      id: 'delivery',
      label: 'Delivery & Access',
      content: <div className="product-description"><div><p>After the UPI transaction reference is verified, the order status is updated and delivery instructions are made available for the purchased kit.</p><ul><li>Digital product — no physical shipping</li><li>Manual payment verification</li><li>Keep your order number for support</li></ul></div></div>,
    },
    {
      id: 'license',
      label: 'License',
      content: <div className="product-description"><div><p>You may customise finished designs for your own business or client work. Resale, sharing or redistribution of the editable source templates is not permitted.</p></div></div>,
    },
  ];

  return (
    <div className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
      <div className="breadcrumbs"><Link href="/">Home</Link><b>›</b><Link href="/shop">Shop</Link><b>›</b><Link href={`/categories/${catalog.categories.find(category => category.id === product.categoryId)?.slug || ''}`}>{product.category}</Link><b>›</b><span>{product.title}</span></div>
      <section className="product-main">
        <div className="product-gallery-shell"><ProductGallery product={product} /><WishlistButton slug={product.slug} /></div>
        <div className="product-summary">
          <span className="product-type"><b>•</b> {product.category}</span>
          <h1>{product.title}</h1>
          <p>{description}</p>
          <div className="product-price"><strong>{money(product.price)}</strong>{product.mrp > product.price && <><s>{money(product.mrp)}</s><b>{discount}% OFF</b></>}</div>
          <div className="product-availability"><span>● Digital product</span><span>◷ Access after verification</span></div>
          <div className="product-actions"><AddButton slug={product.slug} label="Add to Cart" /><Link href="/cart">Review cart</Link></div>
          <div className="product-service-row"><span>⇩<small>Digital delivery</small></span><span>✣<small>{product.formats.length ? product.formats.join(', ') : 'Editable kit'}</small></span><span>◇<small>UPI verification</small></span></div>
        </div>
      </section>

      <section className="product-highlights">
        <div><h2>Product Highlights</h2><ul>{(product.includes.length ? product.includes : [`${product.layoutCount}+ editable layouts`]).map(item => <li key={item}>✓ {item}</li>)}</ul></div>
        <div><h2>What&apos;s Inside</h2><ul>{included.map(item => <li key={item}>✓ {item}</li>)}</ul></div>
        <div><h2>Before You Buy</h2><ul><li>◇ Review the listed formats and included files</li><li>◇ This is a digital product with no physical shipping</li><li>◇ Editable source files cannot be resold or redistributed</li></ul></div>
      </section>

      <ProductTabs tabs={tabs} />

      {recommended.length > 0 && <section className="recommended-products"><div><h2>You May Also Like</h2><Link href="/shop">View all →</Link></div><div>{recommended.map(item => <Link key={item.slug} href={`/products/${item.slug}`}><ProductArt p={item} compact /><strong>{item.title}</strong><span>{money(item.price)}{item.mrp > item.price && <>　<s>{money(item.mrp)}</s></>}</span></Link>)}</div></section>}
    </div>
  );
}
