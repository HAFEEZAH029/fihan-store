import { api, databaseError, HttpError, readBody, textField, uuidField } from "@/lib/api";

export async function GET(request: Request) {
  return api(request, async ({ supabase, user }) => {
    const { data, error } = await supabase.from("cart_items").select("*, product:products(*)").eq("user_id", user!.id).order("created_at");
    databaseError(error);
    return { items: data };
  }, true);
}

async function change(request: Request, mode: "add" | "set" | "remove") {
  return api(request, async ({ supabase }) => {
    const body = await readBody(request);
    const productId = uuidField(body.productId, "product ID");
    const size = textField(body.size, "size", 1, 40);
    const quantity = mode === "remove" ? 0 : body.quantity;
    if (mode !== "remove" && (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20)) {
      throw new HttpError(400, "Quantity must be between 1 and 20");
    }
    const { error } = await supabase.rpc("change_cart_item", {
      p_product_id: productId, p_size: size, p_quantity: quantity, p_mode: mode,
    });
    databaseError(error);
    return { success: true };
  }, true);
}

export async function POST(request: Request) { return change(request, "add"); }
export async function PATCH(request: Request) { return change(request, "set"); }
export async function DELETE(request: Request) { return change(request, "remove"); }
