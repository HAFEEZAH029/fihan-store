import { ProductView } from "@/components/store-pages";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ size?: string; quantity?: string }> }) {
  const { slug } = await params;
  const { size, quantity } = await searchParams;
  const parsed = Number(quantity || 1);
  return <ProductView key={slug} slug={slug} initialSize={size || ""} initialQuantity={Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 1} />;
}
