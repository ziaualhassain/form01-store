import type { Metadata } from "next";
import Storefront from "@/components/storefront";

export const metadata: Metadata = { title: "My Account | FORM/01", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <Storefront accountPage />;
}
