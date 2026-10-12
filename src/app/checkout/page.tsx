import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/store-pages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout | Fihan Store" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login?next=%2Fcheckout");
  return <CheckoutView customerName={user.user_metadata.full_name || user.user_metadata.name || ""} customerEmail={user.email || ""} />;
}
