import type { Metadata } from "next";
import "./globals.css";
import { Footer, Header, StoreProvider } from "@/components/store-ui";

export const metadata: Metadata = {
  title: "Fihan Store",
  description: "Abayas and hijabs from Fihan Store.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><StoreProvider><Header />{children}<Footer /></StoreProvider></body>
    </html>
  );
}
