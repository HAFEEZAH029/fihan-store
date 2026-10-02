import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { safeReturnPath } from "../src/lib/auth/redirect.ts";

test("OAuth return paths stay on the store", () => {
  for (const input of [null, "https://evil.example", "//evil.example", "/\\evil.example", "/auth/login", "/\n/evil.example"]) {
    assert.equal(safeReturnPath(input), "/");
  }
  assert.equal(safeReturnPath("/shop?category=hijabs"), "/shop?category=hijabs");
  assert.equal(safeReturnPath("/products/ameera-embroidered-abaya?size=M"), "/products/ameera-embroidered-abaya?size=M");
});

test("store SQL enforces ownership and atomic checkout", async (t) => {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  const requestId = "33333333-3333-4333-8333-333333333333";
  const secondRequestId = "44444444-4444-4444-8444-444444444444";
  const shipping = { address: "12 Sample Street", city: "Lagos", country: "Nigeria" };
  const asUser = async (id, work) => {
    await db.exec("begin; set local role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
    try {
      const result = await work();
      await db.exec("commit;");
      return result;
    } catch (error) {
      await db.exec("rollback;");
      throw error;
    }
  };
  const asGuest = async (work) => {
    await db.exec("begin; set local role anon;");
    try { return await work(); } finally { await db.exec("rollback;"); }
  };
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
    `);
    await db.query("insert into auth.users values ($1, 'alice@example.com'), ($2, 'bob@example.com')", [alice, bob]);
    await db.exec(await readFile(new URL("../supabase/migrations/202610020001_store.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
    const product = (await db.query("select * from public.products where slug = 'ameera-embroidered-abaya'")).rows[0];
    const cartChange = (quantity, mode = "add", size = "M") => db.query(
      "select public.change_cart_item($1, $2, $3, $4)", [product.id, size, quantity, mode],
    );
    const checkout = (id = requestId, address = shipping) => db.query(
      "select public.create_order($1, 'Sample Customer', '+2348001234567', $2::jsonb) as id", [id, JSON.stringify(address)],
    );

    await t.test("guests read products but cannot access carts or mutate them", async () => {
      assert.equal((await asGuest(() => db.query("select * from public.products"))).rows.length, 6);
      await assert.rejects(asGuest(() => db.query("select * from public.cart_items")), /permission denied/);
      await assert.rejects(asGuest(() => cartChange(1)), /permission denied/);
    });
    await t.test("inactive products are hidden from public readers", async () => {
      await db.query("update public.products set active = false where id = $1", [product.id]);
      assert.equal((await asGuest(() => db.query("select * from public.products"))).rows.length, 5);
      await db.query("update public.products set active = true where id = $1", [product.id]);
    });
    await t.test("each user only reads their own persistent cart", async () => {
      await asUser(alice, () => cartChange(2));
      await asUser(bob, () => cartChange(1));
      const rows = (await asUser(alice, () => db.query("select * from public.cart_items"))).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, alice);
      assert.equal(rows[0].quantity, 2);
      assert.equal((await asUser(bob, () => db.query("select * from public.cart_items"))).rows[0].quantity, 1);
    });
    await t.test("direct table writes and invalid cart values are denied", async () => {
      await assert.rejects(asUser(alice, () => db.query("update public.products set price_cents = 1")), /permission denied/);
      await assert.rejects(asUser(alice, () => db.query("delete from public.cart_items")), /permission denied/);
      await assert.rejects(asUser(alice, () => db.query("insert into public.cart_items(user_id, product_id, size, quantity) values ($1, $2, 'M', 1)", [bob, product.id])), /permission denied/);
      await assert.rejects(asUser(alice, () => cartChange(20)), /check constraint/);
      await assert.rejects(asUser(alice, () => cartChange(1, "add", "invalid")), /unavailable/);
      assert.equal((await asUser(alice, () => db.query("select quantity from public.cart_items"))).rows[0].quantity, 2);
    });
    await t.test("invalid delivery details preserve the cart and create no order", async () => {
      await assert.rejects(asUser(alice, () => checkout(requestId, { address: "12 Street", city: "Lagos" })), /required/);
      assert.equal((await db.query("select * from public.orders")).rows.length, 0);
      assert.equal((await asUser(alice, () => db.query("select * from public.cart_items"))).rows.length, 1);
    });
    let orderId;
    await t.test("checkout saves database prices and clears only the buyer's cart", async () => {
      orderId = (await asUser(alice, () => checkout())).rows[0].id;
      const order = (await asUser(alice, () => db.query("select * from public.orders"))).rows[0];
      assert.equal(Number(order.total_cents), 37000);
      assert.equal(order.customer_email, "alice@example.com");
      assert.equal(order.payment_status, "simulated");
      assert.equal((await asUser(alice, () => db.query("select * from public.cart_items"))).rows.length, 0);
      assert.equal((await asUser(bob, () => db.query("select * from public.cart_items"))).rows.length, 1);
      assert.equal((await asUser(bob, () => db.query("select * from public.orders"))).rows.length, 0);
      assert.equal((await asUser(bob, () => db.query("select * from public.order_items"))).rows.length, 0);
      await assert.rejects(asUser(alice, () => db.query("insert into public.orders default values")), /permission denied/);
    });
    await t.test("retry returns the same order; empty carts cannot create another", async () => {
      assert.equal((await asUser(alice, () => checkout())).rows[0].id, orderId);
      assert.equal((await db.query("select * from public.orders")).rows.length, 1);
      await assert.rejects(asUser(alice, () => checkout(secondRequestId)), /empty/);
    });
    await t.test("catalogue changes do not change the order snapshot", async () => {
      await db.query("update public.products set price_cents = 9900 where id = $1", [product.id]);
      const row = (await asUser(alice, () => db.query("select * from public.order_items"))).rows[0];
      assert.equal(row.unit_price_cents, 18500);
      assert.equal(row.quantity, 2);
    });
    await t.test("unavailable products prevent checkout without losing the cart", async () => {
      await db.query("update public.products set active = false where id = $1", [product.id]);
      await assert.rejects(asUser(bob, () => checkout(secondRequestId)), /unavailable/);
      assert.equal((await asUser(bob, () => db.query("select * from public.cart_items"))).rows.length, 1);
      await db.query("update public.products set active = true where id = $1", [product.id]);
    });
    await t.test("quantity changes and removals are scoped to the signed-in customer", async () => {
      await asUser(bob, () => cartChange(3, "set"));
      assert.equal((await asUser(bob, () => db.query("select quantity from public.cart_items"))).rows[0].quantity, 3);
      await asUser(alice, () => cartChange(0, "remove"));
      assert.equal((await asUser(bob, () => db.query("select * from public.cart_items"))).rows.length, 1);
      await asUser(bob, () => cartChange(0, "remove"));
      assert.equal((await asUser(bob, () => db.query("select * from public.cart_items"))).rows.length, 0);
    });
  } finally {
    await db.close();
  }
});
