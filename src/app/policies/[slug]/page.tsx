import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Storefront from "@/components/storefront";
import { policies } from "@/lib/policies";

export function generateStaticParams() {
  return policies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies.find((item) => item.slug === slug);
  return { title: `${policy?.title || "Policy"} | FORM/01`, robots: { index: false, follow: true } };
}

export default async function Page({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  if (!policies.some((item) => item.slug === slug)) notFound();
  return <Storefront policySlug={slug} />;
}
