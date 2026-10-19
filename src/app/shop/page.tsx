import type { Metadata } from "next";
import Storefront from "@/components/storefront";

export const metadata: Metadata = {
  title: "Shop | FORM/01",
  description: "Thoughtful pieces for everyday lives. Explore all available FORM/01 products by category.",
};

export default function ShopPage() {
  return <Storefront shopPage />;
}
