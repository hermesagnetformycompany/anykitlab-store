# AnyKit Lab Store

Production storefront and multi-user operations dashboard for AnyKit Lab. The application is built with Next.js, Supabase, and Vercel.

## Included

- Responsive customer storefront, catalog, filtering, cart, checkout, and account area
- Supabase customer authentication, profiles, orders, wishlist, product access, and storage
- Role-based administrator workspace for products, categories, collections, media, orders, customers, and team access
- Separate customer and administrator sign-in flows
- Dark/light AnyKit Lab brand assets and supplied SVG footer icons

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add the project values:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   ```

   `SUPABASE_SECRET_KEY` is server-only and must never be exposed in client code or committed.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

The production deployment is available at [anykitlab-store.vercel.app](https://anykitlab-store.vercel.app).
