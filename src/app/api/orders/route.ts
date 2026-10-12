import { api, databaseError, HttpError, readBody, textField, uuidField } from "@/lib/api";

export async function POST(request: Request) {
  return api(request, async ({ supabase }) => {
    const body = await readBody(request);
    const requestId = uuidField(body.requestId, "order request ID");
    const name = textField(body.name, "full name", 2, 120);
    const phone = textField(body.phone, "phone number", 5, 40);
    const shipping = body.shipping;
    if (!shipping || typeof shipping !== "object" || Array.isArray(shipping)) throw new HttpError(400, "Enter a delivery address");
    const fields = shipping as Record<string, unknown>;
    const address = {
      address: textField(fields.address, "address"),
      city: textField(fields.city, "city"),
      country: textField(fields.country, "country"),
      ...(fields.postalCode ? { postalCode: textField(fields.postalCode, "postal code", 1, 40) } : {}),
    };
    const { data: id, error } = await supabase.rpc("create_order", {
      p_idempotency_key: requestId, p_customer_name: name, p_phone: phone, p_shipping_address: address,
    });
    databaseError(error);
    const result = await supabase.from("orders").select("id, total_cents, currency, payment_status, created_at").eq("id", id).single();
    databaseError(result.error);
    return { order: result.data };
  }, true);
}

export async function GET(request: Request) {
  return api(request, async ({ supabase, user }) => {
    const { data, error } = await supabase.from("orders").select("*, items:order_items(*)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    databaseError(error);
    return { orders: data };
  }, true);
}
