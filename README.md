# Fihan Store

A mini store for abayas and hijabs. Built with Next.js, TypeScript, Tailwind CSS, and Supabase. Google is the only sign-in provider. Checkout simulates payment; no money is charged and no confirmation emails are sent.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Environment variables are documented in `.env.example`; actual values belong in `.env.local` and must not be committed.

```sh
npm run lint
npm run typecheck
npm run build
```

## Setup checkpoint

The store UI includes home, category-filtered shop, product details, a persistent authenticated cart, and protected simulated checkout. Apply hosted configuration using `docs/supabase-setup.md`.

## Browser Checks

```sh
npx playwright install chromium
npm run test:e2e
```

Stop the local dev server first. Browser tests start an isolated session on port 3000 with a loopback auth fixture and intercepted product/cart/order APIs, so they create no hosted orders. Desktop/mobile screenshots are saved under the ignored `artifacts/` folder. Verify real Google sign-in manually with your account before submission.

The first-pass product photographs are displayed from the supplied reference image. Set a product's `image_url` to a new asset path or URL to use its own photograph. Seed placeholder image paths use reference imagery; add final product assets before treating the catalogue as a real shop.

GitHub stores the source repository. A Next.js hosting service such as Vercel will run the deployed application.

See `docs/requirements.md` for the agreed scope and implementation order.
