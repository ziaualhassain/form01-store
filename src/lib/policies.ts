export const policies = [
  { slug: "terms-and-conditions", title: "Terms & conditions" },
  { slug: "shipping-and-delivery", title: "Shipping & delivery" },
  { slug: "returns-and-refunds", title: "Returns & refunds" },
  { slug: "privacy", title: "Privacy policy" },
  { slug: "payment-and-cancellation", title: "Payments & cancellations" },
  { slug: "contact-and-grievance", title: "Grievance redressal" },
];

export type PolicyDocument = { slug: string; title: string; published: boolean; last_updated: string; content_markdown: string };
