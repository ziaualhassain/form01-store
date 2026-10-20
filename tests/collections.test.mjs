import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const filename = fileURLToPath(new URL("../src/components/collections-page.tsx", import.meta.url));
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});

function load(react = React) {
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "next/image") return { default: () => null };
      if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
      if (name === "./shop-catalogue") return { default: () => null };
      return require(name);
    },
  }, { filename });
  return exports.default;
}

const props = {
  sections: [{
    id: "drop", type: "product_collection", position: 1, products: [],
    content: { title: "EST.01", campaign: { cta_label: "Join the Journey" } },
  }],
  products: [], status: "live", catalogueStatus: "live", wishlist: [],
  selectedId: "drop", onWishlist() {}, onProduct() {}, onRetry() {}, onDrop() {},
};

test("collection hero offers exploration, not the legacy signup or notification prompt", () => {
  const html = renderToStaticMarkup(React.createElement(load(), props));
  assert.match(html, /Explore the collection/);
  assert.match(html, /class="collection-body"[^>]*tabindex="-1"/);
  assert.doesNotMatch(html, /Join the Journey|Be part of the next chapter|Create a store account|subscriptions/);
});

test("exploration scrolls and focuses the current collection without changing routes or requesting authentication", () => {
  const calls = [];
  const body = {
    scrollIntoView(options) { calls.push(["scroll", options.block]); },
    focus(options) { calls.push(["focus", options.preventScroll]); },
  };
  const Component = load({
    ...React,
    useState: (initial) => [initial, () => {}],
    useId: () => "collection-panel",
    useRef: () => ({ current: body }),
  });
  const tree = Component(props);
  function find(node) {
    if (!React.isValidElement(node)) return undefined;
    if (node.props.className === "collection-notify") return node;
    for (const child of React.Children.toArray(node.props.children)) {
      const match = find(child);
      if (match) return match;
    }
  }
  const button = find(tree);
  assert.ok(button);
  assert.equal(button.type, "button");
  button.props.onClick();
  assert.deepEqual(calls, [["scroll", "start"], ["focus", true]]);
});

test("collections retain published empty, loading and unavailable states", () => {
  const Component = load();
  const render = (extra) => renderToStaticMarkup(React.createElement(Component, { ...props, ...extra }));
  assert.match(render({ sections: [] }), /No collections have been published yet/);
  assert.match(render({ status: "loading" }), /Loading collections/);
  assert.match(render({ status: "unavailable" }), /Try again/);
});

test("storefront no longer mounts or wires the removed early-access modal", () => {
  const source = fs.readFileSync(new URL("../src/components/storefront.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /earlyAccess|onNotify|Be part of the next chapter|Create a store account/);
});
