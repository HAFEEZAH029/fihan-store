# Phase Two Setup

The SQL and application routes are prepared locally. They are not automatically applied to your hosted Supabase project.

## 1. Database

In the Fihan Store Supabase project, open SQL Editor. Run the contents of `supabase/migrations/202610020001_store.sql` once, then run `supabase/seed.sql`. The migration is transactional; if it reports an error, the changes roll back. Do not rerun a successfully applied migration. The seed is safe to rerun and preserves existing product data.

There are four public tables: products, cart_items, orders, order_items. Supabase already stores Google users in `auth.users`; no separate customers table is required for this scope. Delivery details are saved on each order. Seed images are paths to assets that will be added during the UI phase.

All tables have RLS. Guests and signed-in users can read active products. Signed-in users can read only their own carts and orders. Table writes are denied to application users; authenticated RPC functions validate and perform cart updates and checkout. The functions derive the buyer ID from `auth.uid()` and do not accept a buyer ID or prices from the client.

## 2. Local Environment

Create `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find the URL in the project's connection/settings panel and the publishable key under API Keys. No service-role key is needed. Environment files are ignored by Git. Restart the dev server after adding values.

## 3. Google Cloud

Use your existing Google Cloud account and create/select the Fihan Store project. Open Google Auth Platform:

1. Configure Branding with the app name and support/developer email.
2. Set Audience to External. If the app is in Testing mode, add your Google account and your mentor's account as test users.
3. Configure Data Access with only `openid`, `userinfo.email`, and `userinfo.profile`.
4. Under Clients, create an OAuth client of type Web application.
5. Add `http://localhost:3000` to Authorized JavaScript origins.
6. In Supabase, open Authentication > Sign In / Providers > Google and copy the callback URL shown there. It normally has this format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
7. Add that exact callback to Google's Authorized redirect URIs, then save the client.

Google's redirect URI is the Supabase URL above, not the Next.js callback below.

## 4. Supabase Auth

In Authentication > Sign In / Providers, enable Google and enter the Google OAuth client ID and secret. Keep the secret in the provider settings. Disable the Email provider and anonymous sign-ins for Google-only authentication.

Under Authentication > URL Configuration, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. The application adds a `next` query parameter to return shoppers to their product or checkout after sign-in.

## 5. Verify Live Configuration

Run `npm run dev`. Visit `http://localhost:3000/auth/login?next=/` and complete Google sign-in. Then open `/api/auth` to see the signed-in profile. Supabase Authentication > Users should show the Google user.

Open `/api/products` to confirm the seed products load, and `/api/products?category=hijabs` to check filtering. Product details are available at `/api/products/ameera-embroidered-abaya`.

In a private browser window, `/api/cart` and `/api/orders` must return 401. `/checkout` starts Google sign-in; the checkout UI itself will be built in the next phase.

Local checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Database tests run the actual migration in a local PostgreSQL engine with mock Supabase auth roles; they do not modify your hosted database. Live OAuth still needs a browser check after configuration.

## API Contract

| Endpoint | Access | Result / input |
| --- | --- | --- |
| GET /api/products?category=all, abayas, or hijabs | Public | `{ products }` |
| GET /api/products/[slug] | Public | `{ product }` |
| GET /api/auth | Public | `{ user }`, null when signed out |
| GET /api/cart | Signed in | `{ items }`, each including a nested product |
| POST /api/cart | Signed in | `{ productId, size, quantity }`, adds quantity |
| PATCH /api/cart | Signed in | Same body, sets quantity |
| DELETE /api/cart | Signed in | `{ productId, size }` |
| POST /api/orders | Signed in | Body below; returns `{ order }` |
| GET /api/orders | Signed in | `{ orders }` with item snapshots |

Write requests require `Content-Type: application/json`. An unavailable product's nested cart product can be null; the UI must offer removal. Cart quantity is limited to 20 per product/size. All money is integer USD cents. There is no stock-management workflow in this mini store.

```json
{
  "requestId": "a UUID generated with crypto.randomUUID()",
  "name": "Customer Name",
  "phone": "+2348001234567",
  "shipping": {
    "address": "12 Example Street",
    "city": "Lagos",
    "country": "Nigeria",
    "postalCode": "100001"
  }
}
```

Generate the request ID once per checkout attempt and reuse it on retries. The database calculates totals, snapshots order items, and clears the customer's cart in one transaction. Payment status is `simulated`; no payment is charged and no email is sent.

## Deployment

After deployment, add the production origin in Google, add the production `/auth/callback` URL in Supabase, change Site URL to the production origin, and set the same Supabase environment values in the host. Keep localhost available during development.

References: [Google OAuth setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [SSR sessions](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
