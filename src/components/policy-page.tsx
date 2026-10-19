"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, storeApi } from "@/lib/api";
import { policies, type PolicyDocument } from "@/lib/policies";
import { isMockMode } from "@/lib/store-config";

function PolicyContent({ markdown }: { markdown: string }) {
  const plain = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\\([[\]\\])/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return <div className="policy-content">{markdown.split(/\n\s*\n/).map((block, index) => {
    const heading = block.match(/^###\s+(.+)$/);
    if (heading) return <h2 key={index} id={heading[1].includes("Customer support") ? "customer-support" : undefined}>{plain(heading[1])}</h2>;
    if (/^-\s+/.test(block)) return <ul key={index}>{block.split(/\n(?=-\s)/).map((item, itemIndex) => <li key={itemIndex}>{plain(item.replace(/^-\s+/, "").replace(/\n\s+/g, " "))}</li>)}</ul>;
    return <p key={index}>{plain(block.replace(/\\\n/g, "\n").replace(/([^\n])\n([^\n])/g, "$1 $2"))}</p>;
  })}</div>;
}

export default function PolicyPage({ slug }: { slug: string }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "unpublished" | "error"; document?: PolicyDocument }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      if (isMockMode) { if (active) setState({ status: "unpublished" }); return; }
      if (active) setState({ status: "loading" });
      try {
        const document = await storeApi.policy(slug);
        if (active) setState({ status: document.published ? "ready" : "unpublished", document });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) { if (active) setState({ status: "unpublished" }); }
        else { console.error("Unable to load policy", error); if (active) setState({ status: "error" }); }
      }
    }
    void load();
    return () => { active = false; };
  }, [slug, attempt]);
  return <article className="policy-page">
    <Link className="policy-back" href="/account">Back to account</Link>
    <span className="policy-eyebrow">FORM/01 · Customer information</span>
    <h1>{state.document?.title || policies.find((item) => item.slug === slug)?.title || "Policy"}</h1>
    {state.status === "ready" && state.document ? <><p className="policy-updated">Last updated: {state.document.last_updated}</p><PolicyContent markdown={state.document.content_markdown} /></> : <section className="policy-status" aria-busy={state.status === "loading"}>
      <h2>{state.status === "loading" ? "Loading policy..." : state.status === "unpublished" ? "This policy is not published yet." : "We couldn't load this policy."}</h2>
      <p role="status">{state.status === "unpublished" ? "The policy is awaiting approval. Unfinished draft terms are not displayed. Please contact our team for assistance before placing an order." : state.status === "error" ? "Please try again or contact our support team." : "Fetching the latest approved policy."}</p>
      {state.status === "error" && <button onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
      {state.status !== "loading" && <a href="mailto:support@form01.com">support@form01.com</a>}
    </section>}
  </article>;
}
