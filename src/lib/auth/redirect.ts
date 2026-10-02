export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  const parsed = new URL(value, "https://fihan.invalid");
  if (parsed.origin !== "https://fihan.invalid" || parsed.pathname.startsWith("/auth/")) return "/";
  return `${parsed.pathname}${parsed.search}`;
}
