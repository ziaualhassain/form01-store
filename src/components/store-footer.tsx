"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { policies } from "@/lib/policies";

export default function StoreFooter({ mobileVisible = false }: { mobileVisible?: boolean }) {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setYear(new Date().getFullYear()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const policyLink = (slug: string) => {
    return policies.filter((policy) => policy.slug === slug).map((policy) => <Link key={slug} href={`/policies/${slug}`}>{policy.title}</Link>);
  };
  return <footer className={`store-footer ${mobileVisible ? "store-footer-mobile" : ""}`}>
    <div className="store-footer-brand"><Link href="/" className="store-footer-wordmark">FORM/01</Link><p>Built beyond trends.</p></div>
    <div className="store-footer-columns">
      <nav aria-label="Customer care"><h2>Customer care</h2><Link href="/policies/contact-and-grievance#customer-support">Contact us</Link>{["shipping-and-delivery", "returns-and-refunds"].map(policyLink)}</nav>
      <nav aria-label="Information"><h2>Information</h2>{["terms-and-conditions", "privacy", "payment-and-cancellation", "contact-and-grievance"].map(policyLink)}</nav>
    </div>
    <div className="store-footer-bottom"><address><span>Hyderabad, Telangana, India</span><a href="mailto:support@form01.com">support@form01.com</a></address><span>© {year} FORM/01</span></div>
  </footer>;
}
