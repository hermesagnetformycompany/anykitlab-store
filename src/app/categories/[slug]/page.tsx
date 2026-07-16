import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {LucideIcon} from 'lucide-react';
import {
  BriefcaseBusiness,
  Building2,
  CarFront,
  CheckCircle2,
  Clock3,
  Dumbbell,
  LayoutTemplate,
  Rocket,
  Scissors,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import {CatalogBrowser} from '@/components/catalog-browser';
import {getCatalogData} from '@/lib/catalog';
import {buildMetadata, breadcrumbJsonLd, SITE_URL} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const {categories} = await getCatalogData();
  const category = categories.find(item => item.slug === slug);
  if (!category) return buildMetadata({title: 'Category Not Found', path: `/categories/${slug}`, noIndex: true});
  return buildMetadata({
    title: `${category.name} Templates`,
    description: category.description,
    path: `/categories/${slug}`,
    keywords: [category.name, 'Canva templates', 'template kits', category.slug],
  });
}

type CategoryPresentation = {
  icon: LucideIcon;
  kicker: string;
  tagline: string;
  subcategories: string[];
  formats: string[];
};

const categoryPresentations: Record<string, CategoryPresentation> = {
  fitness: {icon: Dumbbell, kicker: 'MOVE WITH PURPOSE', tagline: 'For gyms, trainers, studios and wellness professionals.', subcategories: ['Gym & Fitness', 'Yoga & Mindfulness', 'Nutrition & Meal Plans', 'Wellness Coaching', 'Recovery & Mobility'], formats: ['Instagram Posts', 'Stories', 'Carousels', 'Offer Graphics', 'Presentations']},
  beauty: {icon: Scissors, kicker: 'BOOKED & BEAUTIFUL', tagline: 'For salons, artists, studios and appointment-led brands.', subcategories: ['Lash & Brow', 'Hair & Salon', 'Nails', 'Skincare', 'Beauty Education'], formats: ['Instagram Posts', 'Stories', 'Price Lists', 'Booking Policies', 'Highlight Covers']},
  automotive: {icon: CarFront, kicker: 'BUILT TO IMPRESS', tagline: 'For detailers, garages and automotive specialists.', subcategories: ['Auto Detailing', 'Ceramic Coating', 'Car Care', 'Garages', 'Mobile Detailers'], formats: ['Before & After', 'Service Menus', 'Instagram Posts', 'Stories', 'Offer Graphics']},
  food: {icon: UtensilsCrossed, kicker: 'MADE TO BE CRAVED', tagline: 'For restaurants, cafés and food-first businesses.', subcategories: ['Restaurants', 'Cafés', 'Bakeries', 'Cloud Kitchens', 'Catering'], formats: ['Menu Cards', 'Instagram Posts', 'Stories', 'Offer Graphics', 'Table Displays']},
  'real-estate': {icon: Building2, kicker: 'LIST WITH CONFIDENCE', tagline: 'For agents, brokers and property businesses.', subcategories: ['Residential', 'Commercial', 'Property Launches', 'Agent Branding', 'Rental Listings'], formats: ['Property Posts', 'Listing Cards', 'Stories', 'Agent Profiles', 'Presentations']},
  coaching: {icon: BriefcaseBusiness, kicker: 'LEAD WITH AUTHORITY', tagline: 'For coaches, consultants and service-led experts.', subcategories: ['Business Coaching', 'Life Coaching', 'Consulting', 'Personal Branding', 'Lead Magnets'], formats: ['Authority Posts', 'Carousels', 'Offer Cards', 'Lead Magnets', 'Presentations']},
};

const benefits = [
  {label: 'Editable formats', icon: LayoutTemplate},
  {label: 'Clear kit details', icon: CheckCircle2},
  {label: 'Saves setup time', icon: Clock3},
  {label: 'Launch faster', icon: Rocket},
  {label: 'Reusable systems', icon: Sparkles},
  {label: 'Built for business', icon: BriefcaseBusiness},
];

export default async function CategoryPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, catalog] = await Promise.all([params, getCatalogData()]);
  const {categories, products} = catalog;
  const category = categories.find(item => item.slug === slug);

  if (!category) {
    if (catalog.source === 'fallback' || categories.length === 0) {
      return (
        <div className="catalog-empty" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',textAlign:'center',padding:'2rem'}}>
          <LayoutTemplate aria-hidden="true" style={{width:'3rem',height:'3rem',marginBottom:'1rem',opacity:.4}} />
          <h2>Category not available yet</h2>
          <p style={{color:'#666',maxWidth:'400px'}}>We're setting up our catalog. Please check back soon.</p>
          <Link href="/shop" style={{marginTop:'1rem',padding:'0.75rem 1.5rem',background:'var(--accent,#f0642f)',color:'#fff',borderRadius:'8px',textDecoration:'none',fontWeight:600}}>Browse all kits</Link>
        </div>
      );
    }
    notFound();
  }

  const items = products.filter(product => product.categoryId === category.id);
  const actualFormats = [...new Set(items.flatMap(product => product.formats))];
  const presentation = categoryPresentations[slug] || {
    icon: LayoutTemplate,
    kicker: 'BUILT TO LAUNCH',
    tagline: category.description,
    subcategories: [],
    formats: actualFormats,
  };
  const layoutTotal = items.reduce((total, product) => total + product.layoutCount, 0);
  const CategoryIcon = presentation.icon;
  const categoryBreadcrumbs = breadcrumbJsonLd([
    {name: 'Home', url: SITE_URL},
    {name: 'Categories', url: `${SITE_URL}/shop`},
    {name: category.name, url: `${SITE_URL}/categories/${slug}`},
  ]);

  return (
    <div className="category-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(categoryBreadcrumbs)}} />
      <div className="breadcrumbs"><Link href="/">Home</Link><b>›</b><Link href="/shop">Categories</Link><b>›</b><span>{category.name}</span></div>
      <section className="category-hero">
        <div className="category-hero-copy">
          <span>{category.name.toUpperCase()}</span>
          <h1>{category.name}<br />Templates</h1>
          <p>{category.description || presentation.tagline}</p>
          <div className="category-stats"><b>{items.length}<small>{items.length === 1 ? 'Kit' : 'Kits'}</small></b><b>{layoutTotal}<small>Layouts</small></b><b>{actualFormats.length}<small>Formats</small></b><b>Digital<small>Delivery</small></b></div>
        </div>
        <div className="category-hero-art">
          <div className="category-art-placeholder"><CategoryIcon aria-hidden="true" /><span>{category.name.toUpperCase()}<br />COLLECTION</span><small>{presentation.tagline}</small></div>
          <span>{presentation.kicker}</span><i><Sparkles aria-hidden="true" /></i>
        </div>
      </section>
      <section className="category-benefits" aria-label="Template benefits">{benefits.map(({label, icon: Icon}) => <span key={label}><Icon aria-hidden="true" />{label}</span>)}</section>
      <CatalogBrowser products={items} mode="category" subcategories={presentation.subcategories} formats={actualFormats.length ? actualFormats : presentation.formats} />
      <section className="related-categories"><b>Explore more</b>{categories.filter(item => item.id !== category.id).slice(0, 4).map(item => <Link href={`/categories/${item.slug}`} key={item.id}>{item.name}</Link>)}<Link href="/shop">All templates →</Link></section>
    </div>
  );
}
