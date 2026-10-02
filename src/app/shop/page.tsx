import type { Metadata } from "next";
import { ShopView } from "@/components/store-pages";

export const metadata: Metadata = { title: "Shop | Fihan Store" };

export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <ShopView category={category || "all"} />;
}
