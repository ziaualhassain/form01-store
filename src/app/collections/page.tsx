import type { Metadata } from "next";
import Storefront from "@/components/storefront";

export const metadata: Metadata = {
  title: "Collections | FORM/01",
  description: "Discover the stories behind each FORM/01 drop. Thoughtful essentials inspired by a higher tomorrow.",
};

export default function Collections() {
  return <Storefront collectionsPage />;
}
