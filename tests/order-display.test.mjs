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
const filename = fileURLToPath(new URL("../src/components/order-history.tsx", import.meta.url));
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const exports = {};
vm.runInNewContext(outputText, {
  exports,
  require(name) {
    if (name === "@/lib/store-config") return { isMockMode: false };
    if (name === "next/image") return { default: () => null };
    if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    return require(name);
  },
}, { filename });
const OrderHistory = exports.default;

for (const status of ["FULFILLED", "PROCESSING", "CANCELLED", "DELIVERED"]) {
  test(`customer order badge shows ${status} rather than stale fulfilment/shipment status`, () => {
    const html = renderToStaticMarkup(React.createElement(OrderHistory, {
      products: [],
      orders: [{
        id: "order-1", order_number: "TEST-1", status,
        fulfilment_status: "UNFULFILLED", payment_status: "PAID",
        currency: "INR", total_minor: 9900, items: [], shipments: [{ id: "shipment-1", status: "CREATED" }],
      }],
    }));
    assert.match(html, new RegExp(`class="account-order-status[^"]*">${status.toLowerCase()}</span>`));
    assert.doesNotMatch(html, /class="account-order-status[^"]*">unfulfilled</);
    assert.match(html, /Refresh orders/);
  });
}

test("empty history guides customers to the shop without fabricating orders", () => {
  const html = renderToStaticMarkup(React.createElement(OrderHistory, { orders: [], products: [] }));
  assert.match(html, /Your next chapter is waiting/);
  assert.match(html, /href="\/shop"/);
  assert.doesNotMatch(html, /order-card-heading/);
});

test("order card shows snapshots, quantities, minor-unit prices and safe tracking", () => {
  const order = {
    id: "order-1", order_number: "TEST-1", status: "SHIPPED", fulfilment_status: "FULFILLED",
    payment_status: "PAID", currency: "INR", subtotal_minor: 19800, total_minor: 19800,
    placed_at: "2026-10-19T10:00:00Z",
    items: [{ id: "line-1", product_name_snapshot: "Original product title", sku_snapshot: "SKU-1", quantity: 2, line_total_minor: 19800 }],
    shipments: [{ id: "shipment-1", status: "SHIPPED", tracking_url: "https://tracking.example.test/parcel", carrier: "Test carrier" }],
    payments: [],
  };
  const render = (value) => renderToStaticMarkup(React.createElement(OrderHistory, { orders: [value], products: [] }));
  const html = render(order);
  assert.match(html, /Original product title/);
  assert.match(html, /Qty 2/);
  assert.match(html, /₹198/);
  assert.match(html, /href="https:\/\/tracking.example.test\/parcel"/);
  assert.match(html, /aria-current="step"/);
  assert.doesNotMatch(html, /Arriving by/);
  assert.doesNotMatch(render({ ...order, shipments: [{ ...order.shipments[0], tracking_url: "javascript:alert(1)" }] }), /href="javascript:/);
});

test("fulfilled is not misrepresented as delivered or given an inferred delivery date", () => {
  const html = renderToStaticMarkup(React.createElement(OrderHistory, {
    products: [],
    orders: [{ id: "complete", order_number: "COMPLETE", status: "FULFILLED", payment_status: "PAID", fulfilment_status: "FULFILLED", currency: "INR", subtotal_minor: 10000, total_minor: 10000, items: [], payments: [], shipments: [] }],
  }));
  assert.match(html, /Delivery is not yet confirmed/);
  assert.doesNotMatch(html, /aria-label="Order progress"/);
  assert.doesNotMatch(html, /Delivered on/);
});
