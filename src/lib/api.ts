import type { User, SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Context = { supabase: SupabaseClient; user: User | null };

export async function api(request: Request, work: (context: Context) => Promise<unknown>, authenticated = false) {
  try {
    if (!isSupabaseConfigured()) throw new HttpError(503, "Store database is not configured yet");
    if (!["GET", "HEAD"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Request origin is not allowed");
      if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "JSON request required");
    }
    const supabase = await createClient();
    let user: User | null = null;
    if (authenticated) {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      if (result.error || !user) throw new HttpError(401, "Sign in with Google to continue");
    }
    return Response.json(await work({ supabase, user }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error("Store API request failed", error);
    return Response.json({ error: error instanceof HttpError ? error.message : "Something went wrong. Please try again." }, {
      status, headers: { "Cache-Control": "private, no-store" },
    });
  }
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new HttpError(400, "Invalid JSON body"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "An object body is required");
  return body as Record<string, unknown>;
}

export function textField(value: unknown, label: string, min = 1, max = 300) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new HttpError(400, `Enter a valid ${label}`);
  }
  return value.trim();
}

export function uuidField(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return value;
}

export function databaseError(error: PostgrestError | null) {
  if (!error) return;
  if (error.code === "28000" || error.code === "42501") throw new HttpError(403, "You cannot access this resource");
  if (error.code === "22023") throw new HttpError(400, error.message);
  if (error.code === "23514") throw new HttpError(400, "Cart quantity must stay between 1 and 20");
  throw error;
}
