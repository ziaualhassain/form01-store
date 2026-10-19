import type { Metadata } from "next";
import Storefront from "@/components/storefront";

export const metadata: Metadata = { title: "Your Cart | FORM/01", robots: { index: false, follow: false } };

export default function CartPage() {
  return <Storefront cartPage />;
}
