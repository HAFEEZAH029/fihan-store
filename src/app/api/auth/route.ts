import { api } from "@/lib/api";

export async function GET(request: Request) {
  return api(request, async ({ supabase, user: verifiedUser }) => {
    const user = verifiedUser ?? (await supabase.auth.getUser()).data.user;
    return { user: user ? {
      id: user.id, email: user.email,
      name: user.user_metadata.full_name ?? user.user_metadata.name ?? "Customer",
      avatarUrl: user.user_metadata.avatar_url ?? null,
    } : null };
  });
}
