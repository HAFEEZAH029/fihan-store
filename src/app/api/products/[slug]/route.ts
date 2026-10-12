import { api, databaseError, HttpError } from "@/lib/api";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return api(request, async ({ supabase }) => {
    const { slug } = await context.params;
    const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
    databaseError(error);
    if (!data) throw new HttpError(404, "Product not found");
    return { product: data };
  });
}
