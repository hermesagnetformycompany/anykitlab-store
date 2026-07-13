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
import {categories as staticCategories} from '@/lib/data';
import {getCatalogData} from '@/lib/catalog';

export function generateStaticParams() {
  return staticCategories.map(category => ({slug: category.slug}));
}

type CategoryPresentation = {
  icon: LucideIcon;
  kicker: string;
  tagline: string;
  subcategories: string[];
  formats: string[];
};

const categoryPresentations: Record<string, CategoryPresentation> = {
  fitness: {
    icon: Dumbbell,
    kicker: 'MOVE WITH PURPOSE',
    tagline: 'For gyms, trainers, studios and wellness professionals.',
    subcategories: ['Gym & Fitness', 'Yoga & Mindfulness', 'Nutrition & Meal Plans', 'Wellness Coaching', 'Recovery & Mobility'],
    formats: ['Instagram Posts', 'Stories', 'Carousels', 'Offer Graphics', 'Presentations'],
  },
  beauty: {
    icon: Scissors,
    kicker: 'BOOKED & BEAUTIFUL',
    tagline: 'For salons, artists, studios and appointment-led brands.',
    subcategories: ['Lash & Brow', 'Hair & Salon', 'Nails', 'Skincare', 'Beauty Education'],
    formats: ['Instagram Posts', 'Stories', 'Price Lists', 'Booking Policies', 'Highlight Covers'],
  },
  automotive: {
    icon: CarFront,
    kicker: 'BUILT TO IMPRESS',
    tagline: 'For detailers, garages and automotive specialists.',
    subcategories: ['Auto Detailing', 'Ceramic Coating', 'Car Care', 'Garages', 'Mobile Detailers'],
    formats: ['Before & After', 'Service Menus', 'Instagram Posts', 'Stories', 'Offer Graphics'],
  },
  food: {
    icon: UtensilsCrossed,
    kicker: 'MADE TO BE CRAVED',
    tagline: 'For restaurants, cafés and food-first businesses.',
    subcategories: ['Restaurants', 'Cafés', 'Bakeries', 'Cloud Kitchens', 'Catering'],
    formats: ['Menu Cards', 'Instagram Posts', 'Stories', 'Offer Graphics', 'Table Displays'],
  },
  'real-estate': {
    icon: Building2,
    kicker: 'LIST WITH CONFIDENCE',
    tagline: 'For agents, brokers and property businesses.',
    subcategories: ['Residential', 'Commercial', 'Property Launches', 'Agent Branding', 'Rental Listings'],
    formats: ['Property Posts', 'Listing Cards', 'Stories', 'Agent Profiles', 'Presentations'],
  },
  coaching: {
    icon: BriefcaseBusiness,
    kicker: 'LEAD WITH AUTHORITY',
    tagline: 'For coaches, consultants and service-led experts.',
    subcategories: ['Business Coaching', 'Life Coaching', 'Consulting', 'Personal Branding', 'Lead Magnets'],
    formats: ['Authority Posts', 'Carousels', 'Offer Cards', 'Lead Magnets', 'Presentations'],
  },
};

const benefits = [
  {label: 'Editable in Canva', icon: LayoutTemplate},
  {label: 'Practical & proven', icon: CheckCircle2},
  {label: 'Saves hours', icon: Clock3},
  {label: 'Launch faster', icon: Rocket},
  {label: 'Reusable systems', icon: Sparkles},
  {label: 'Built for business', icon: BriefcaseBusiness},
];

export default async function CategoryPage({params}: {params: Promise<{slug: string}>}) {
  const [{slug}, catalog] = await Promise.all([params, getCatalogData()]);
  const {categories, products} = catalog;
  const category = categories.find(item => item.slug === slug);
  const presentation = categoryPresentations[slug];
  if (!category || !presentation) notFound();

  const items = products.filter(product => product.categoryId === category.id && product.status === 'Published');
  const layoutTotal = items.reduce((total, product) => total + product.layoutCount, 0);
  const CategoryIcon = presentation.icon;

  return (
    <div className="category-page">
      <div className="breadcrumbs"><Link href="/">Home</Link><b>›</b><Link href="/shop">Categories</Link><b>›</b><span>{category.name}</span></div>
      <section className="category-hero">
        <div className="category-hero-copy">
          <span>{category.name.toUpperCase()}</span>
          <h1>{category.name}<br />Templates</h1>
          <p>{category.description} Browse focused, ready-to-edit Canva systems designed to keep your brand consistent and help you publish faster.</p>
          <div className="category-stats"><b>{items.length}<small>{items.length === 1 ? 'Kit' : 'Kits'}</small></b><b>{layoutTotal}+<small>Layouts</small></b><b>100%<small>Editable</small></b><b>Canva<small>Easy to use</small></b></div>
        </div>
        <div className="category-hero-art">
          <div className="category-art-placeholder"><CategoryIcon aria-hidden="true" /><span>{category.name.toUpperCase()}<br />VISUAL COMING SOON</span><small>Your final category artwork will live here.</small></div>
          <span>{presentation.kicker}</span><i><Sparkles aria-hidden="true" /></i>
        </div>
      </section>
      <section className="category-benefits" aria-label="Template benefits">
        {benefits.map(({label, icon: Icon}) => <span key={label}><Icon aria-hidden="true" />{label}</span>)}
      </section>

      <CatalogBrowser products={items} mode="category" subcategories={presentation.subcategories} formats={presentation.formats} />
      <section className="related-categories"><b>Explore more</b>{categories.filter(item => item.id !== category.id).slice(0, 4).map(item => <Link href={`/categories/${item.slug}`} key={item.id}>{item.name}</Link>)}<Link href="/shop">All templates →</Link></section>
    </div>
  );
}
