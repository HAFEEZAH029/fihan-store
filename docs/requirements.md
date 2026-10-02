# Fihan Store Scope

- Next.js, TypeScript, Tailwind, Supabase database and Google-only authentication.
- Public home, shop, product details; server-protected checkout.
- Header on every page: brand left; Home and Shop centered; Sign up/profile and cart right.
- Google sign-in replaces Sign up with a profile icon. No password login or logout control.
- Simple shared footer. No newsletter, Mailgun, or confirmation emails.
- Home products are display-only. Shop abayas/hijabs open the corresponding shop filter. View all pieces opens All.
- Shop filters: All, Abayas, Hijabs. Product cards open details; only details can add to cart.
- Cart opens below its header icon. Disable opening when empty; badge shows total quantity.
- Cart rows show image, name, options, price, quantity controls and remove action, followed by total and Go to checkout.
- Preserve guest carts locally through refresh and OAuth; merge into Supabase after sign-in.
- Persist products, customer data, signed-in carts, orders and order items in Supabase.
- Signed-out checkout starts Google sign-in and returns to checkout after success.
- Checkout requires customer/delivery details and shows the order summary. Simulate payment without collecting card details.
- Verify the user and calculate prices on the server. Save orders and items together and prevent duplicate submissions.
- Show loading, then a success modal only after the order saves. Clear cart and redirect home. Keep cart on errors.
- Follow the supplied design with simplified content and responsive layouts.

## Delivery Order

1. Complete and verify setup; pause for the user's GitHub commit.
2. Supabase schema, products and Google OAuth configuration.
3. Shared layout, home, filtered shop and product details.
4. Cart, auth return flow and protected simulated checkout.
5. Verify mobile layout and the complete order flow; deploy and prepare final commit.

## Configuration

Set the Supabase URL and publishable key in `.env.local`. Enter Google's client ID and secret directly in Supabase provider settings. Register Supabase's callback in Google and allow local/deployed app callbacks in Supabase. Product image assets and the deployment URL are needed for the final implementation.

GitHub hosts the source repository; deploy the running Next.js app to a compatible host such as Vercel.
