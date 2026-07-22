# AnyKit Lab deployment checklist

AnyKit Lab deploys through the repository's Vercel Git integration. Do not run a separate CLI deployment for this change.

## Required server configuration

Configure these values in the intended Vercel environment before promoting the release:

- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — browser-safe Supabase key.
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) — server-only key required by authenticated order and admin mutation routes. Never prefix this variable with `NEXT_PUBLIC_`.

The approved UPI payee must be stored in the `storefront` row of `akl_site_settings`; it must not be hard-coded in browser code.

## Database prerequisite

Apply the reviewed migration below to the same Supabase project before promoting the application build:

- `supabase/migrations/20260722114018_order_payment_intents.sql`

The migration adds the `Awaiting payment` state, nullable pre-verification payment references, customer-scoped checkout idempotency keys, and the transactional `akl_create_payment_intent` RPC.

## Pre-merge verification

```bash
npm ci
npm run validate
npm audit
```

Required functional checks:

1. Anonymous order creation returns `401`.
2. Anonymous and customer accounts cannot access admin mutation routes.
3. A signed-in customer creates one payment intent even after retrying the same checkout request.
4. Stored order total, displayed total, UPI URI amount, QR-decoded amount, and order reference match.
5. Submitting a UTR only moves the order to `Pending verification`; it does not grant product access.
6. Admin transitions follow `Pending verification → Verified → Access sent`.
7. Product access is granted only during the explicit `Access sent` transition.
8. Catalog mutations persist after reload and are reflected by `/api/catalog`.

## Release and rollback

- Merge the reviewed PR and let the existing Vercel Git integration create the production release.
- Do not approve the release if the migration or server-only Supabase key is missing.
- If application verification fails, roll Vercel back to the previous successful deployment. The migration is intentionally additive/backward-compatible and should not be manually reversed during an incident.
- If payment verification is uncertain, leave the order pending. A QR scan, app launch, or customer-supplied UTR is not proof of settlement.
