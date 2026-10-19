import type { Metadata } from "next";
import Script from "next/script";
import { isMockMode } from "@/lib/store-config";
import "./globals.css";
import "./homepage.css";
import "./shop.css";
import "./product.css";
import "./collections.css";
import "./account.css";
import "./cart.css";
import "./footer.css";

export const metadata: Metadata = {
  title: "FORM/01 — Built beyond trends.",
  description: "Thoughtful essentials for everyday lives. Discover FORM/01 collections and a higher tomorrow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        {!isMockMode && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
