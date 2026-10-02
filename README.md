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

This initial commit contains the app foundation. Store pages, Google authentication, the database schema, and checkout will be implemented after the requested GitHub commit checkpoint.

GitHub stores the source repository. A Next.js hosting service such as Vercel will run the deployed application.

See `docs/requirements.md` for the agreed scope and implementation order.
