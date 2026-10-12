import { api, databaseError, HttpError } from "@/lib/api";

export async function GET(request: Request) {
  return api(request, async ({ supabase }) => {
    const category = new URL(request.url).searchParams.get("category");
    if (category && !["all", "abayas", "hijabs"].includes(category)) throw new HttpError(400, "Invalid product category");
    let query = supabase.from("products").select("*").eq("active", true).order("created_at").order("slug").limit(100);
    if (category && category !== "all") query = query.eq("category", category);
    const { data, error } = await query;
    databaseError(error);
    return { products: data };
  });
}
