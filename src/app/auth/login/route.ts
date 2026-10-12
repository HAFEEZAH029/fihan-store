import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Sign-in is not configured yet" }, { status: 503 });
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get("next"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(new URL(next, url.origin));
  const callback = new URL("/auth/callback", url.origin);
  callback.searchParams.set("next", next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google", options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/auth/error", url.origin));
  const response = NextResponse.redirect(data.url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
