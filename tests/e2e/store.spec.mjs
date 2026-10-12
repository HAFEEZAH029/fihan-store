import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const products = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "ameera-embroidered-abaya", name: "Ameera Embroidered Abaya", category: "abayas", price_cents: 18500, color: "Espresso", sizes: ["S", "M", "L", "XL"], image_url: "/images/ameera-abaya.jpg", description: "A flowing espresso abaya with delicate embroidered details.", gallery_urls: [], currency: "USD" },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", slug: "layla-silk-sand-abaya", name: "Layla Silk Sand Abaya", category: "abayas", price_cents: 21000, color: "Sand", sizes: ["S", "M", "L", "XL"], image_url: "/images/layla-abaya.jpg", description: "A softly draped sand abaya.", gallery_urls: [], currency: "USD" },
  { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", slug: "lale-pleated-hijab", name: "Lale Pleated Hijab", category: "hijabs", price_cents: 3800, color: "Latte", sizes: ["One Size"], image_url: "/images/lale-hijab.jpg", description: "A lightweight pleated hijab.", gallery_urls: [], currency: "USD" },
];

async function fixtures(page, { signedIn = false, initialCart = [], failFirstOrder = false } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (signedIn) {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const claims = Buffer.from(JSON.stringify({ sub: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", exp: expires, iat: expires - 3600 })).toString("base64url");
    const session = { access_token: `${header}.${claims}.dGVzdC1zaWduYXR1cmU`, refresh_token: "fixture-refresh", expires_at: expires, expires_in: 3600, token_type: "bearer", user: { id: "11111111-1111-4111-8111-111111111111", email: "shopper@example.com" } };
    await page.context().addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax" }]);
  }
  let cart = structuredClone(initialCart);
  const orderRequests = [];
  await page.route("**/api/products**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/products") {
      const category = url.searchParams.get("category");
      await route.fulfill({ json: { products: !category || category === "all" ? products : products.filter((item) => item.category === category) } });
    } else {
      const product = products.find((item) => url.pathname.endsWith(`/${item.slug}`));
      await route.fulfill({ status: product ? 200 : 404, json: product ? { product } : { error: "Product not found" } });
    }
  });
  await page.route("**/api/cart", async (route) => {
    const method = route.request().method();
    if (method === "GET") { await route.fulfill({ json: { items: cart } }); return; }
    const body = route.request().postDataJSON();
    const product = products.find((item) => item.id === body.productId);
    const existing = cart.find((item) => item.product_id === body.productId && item.size === body.size);
    if (method === "DELETE") cart = cart.filter((item) => item !== existing);
    else if (existing) existing.quantity = method === "POST" ? existing.quantity + body.quantity : body.quantity;
    else cart.push({ id: "cart-item", product_id: product.id, size: body.size, quantity: body.quantity, product });
    await route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/orders", async (route) => {
    orderRequests.push(route.request().postDataJSON());
    if (failFirstOrder && orderRequests.length === 1) { await route.fulfill({ status: 503, json: { error: "Order could not be saved. Please try again." } }); return; }
    const total = cart.reduce((value, item) => value + item.quantity * item.product.price_cents, 0);
    cart = [];
    await route.fulfill({ json: { order: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", total_cents: total, currency: "USD", payment_status: "simulated" } } });
  });
  return { errors, orderRequests };
}

async function screenshot(page, testInfo, name) {
  await expect(page.locator(".profile-loading")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-${name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("home links filter the shop and home products remain display-only", async ({ page }, testInfo) => {
  const { errors } = await fixtures(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fihan Store", exact: true })).toBeVisible();
  await expect(page.locator(".highlights article.product-tile")).toHaveCount(3);
  await expect(page.locator(".highlights a.product-tile")).toHaveCount(0);
  await screenshot(page, testInfo, "home");
  await page.locator(".hero-actions").getByRole("link", { name: "Shop abayas" }).click();
  await expect(page).toHaveURL(/category=abayas/);
  await expect(page.locator(".shop-page .product-tile")).toHaveCount(2);
  await page.getByRole("navigation", { name: "Product categories" }).getByRole("link", { name: "Hijabs", exact: true }).click();
  await expect(page.locator(".shop-page .product-tile")).toHaveCount(1);
  await screenshot(page, testInfo, "shop");
  expect(errors).toEqual([]);
});

test("guests can inspect products but adding preserves choices through Google redirect", async ({ page }, testInfo) => {
  const { errors } = await fixtures(page);
  await page.goto("/products/ameera-embroidered-abaya");
  await expect(page.getByRole("heading", { name: products[0].name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Shopping bag, 0 items", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await screenshot(page, testInfo, "product");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/v1\/authorize/);
  const callback = new URL(new URL(page.url()).searchParams.get("redirect_to"));
  expect(callback.searchParams.get("next")).toBe("/products/ameera-embroidered-abaya?size=L&quantity=2");
  expect(errors).toEqual([]);
});

test("signed-in shoppers add, adjust and remove items in the cart popover", async ({ page }, testInfo) => {
  const { errors } = await fixtures(page, { signedIn: true });
  await page.goto("/products/ameera-embroidered-abaya");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const bag = page.getByRole("dialog", { name: "Your shopping bag" });
  await expect(bag).toBeVisible();
  await expect(page.locator(".cart-badge")).toHaveText("2");
  await expect(bag.getByRole("link", { name: "Go to checkout" })).toHaveAttribute("href", "/checkout");
  await bag.getByRole("button", { name: `Increase ${products[0].name} quantity` }).click();
  await expect(page.locator(".cart-badge")).toHaveText("3");
  await screenshot(page, testInfo, "cart");
  await bag.getByRole("button", { name: `Remove ${products[0].name}`, exact: true }).click();
  await expect(bag).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Shopping bag, 0 items", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("checkout retains the cart on failure and retries with the same order request ID", async ({ page }, testInfo) => {
  const cart = [{ id: "cart-item", product_id: products[0].id, size: "M", quantity: 2, product: products[0] }];
  const { errors, orderRequests } = await fixtures(page, { signedIn: true, initialCart: cart, failFirstOrder: true });
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout", exact: true })).toBeVisible();
  await page.getByLabel("Phone number", { exact: true }).fill("+2348001234567");
  await page.getByLabel("Street address", { exact: true }).fill("12 Sample Street");
  await page.getByLabel("City", { exact: true }).fill("Lagos");
  await screenshot(page, testInfo, "checkout");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.locator(".checkout-form").getByRole("alert")).toHaveText("Order could not be saved. Please try again.");
  await expect(page.locator(".cart-badge")).toHaveText("2");
  await page.getByRole("button", { name: /Place order/ }).click();
  const success = page.getByRole("dialog", { name: "Your order is created." });
  await expect(success).toBeVisible();
  await screenshot(page, testInfo, "success");
  const center = await success.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const page = document.body.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, expectedX: page.left + page.width / 2, expectedY: innerHeight / 2 };
  });
  expect(Math.abs(center.x - center.expectedX), JSON.stringify(center)).toBeLessThanOrEqual(2);
  expect(Math.abs(center.y - center.expectedY), JSON.stringify(center)).toBeLessThanOrEqual(2);
  expect(orderRequests).toHaveLength(2);
  expect(orderRequests[0].requestId).toBe(orderRequests[1].requestId);
  await expect(page.locator(".cart-toggle")).toBeDisabled();
  await expect(page).toHaveURL("http://localhost:3000/", { timeout: 10000 });
  expect(errors).toEqual([]);
});

test("checkout is protected and missing products have a useful recovery path", async ({ page }) => {
  const { errors } = await fixtures(page);
  await page.goto("/products/missing-piece");
  await expect(page.getByRole("heading", { name: "Piece not found" })).toBeVisible();
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/auth\/v1\/authorize/);
  const callback = new URL(new URL(page.url()).searchParams.get("redirect_to"));
  expect(callback.searchParams.get("next")).toBe("/checkout");
  expect(errors).toEqual([]);
});
