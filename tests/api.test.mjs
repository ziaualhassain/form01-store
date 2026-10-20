import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadApi(fetch, { mock = false, globals = {} } = {}) {
  const filename = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, fetch, AbortSignal, URLSearchParams, ...globals,
    require(name) {
      if (name === "./store-config") return { apiBaseUrl: "https://api.example.test/api/v1", isMockMode: mock };
      if (name === "./mock-data") return {};
      throw new Error(`Unexpected import ${name}`);
    },
  }, { filename });
  return exports;
}

test("validation errors include field names without exposing submitted values", () => {
  const { ApiError, apiErrorMessage } = loadApi();
  const error = new ApiError(422, JSON.stringify({ error: {
    message: "The request could not be processed.",
    details: [{ loc: ["body", "shipping_address_id"], msg: "Field required", input: "private" }],
  } }));
  assert.equal(apiErrorMessage(error), "shipping_address_id: Field required");
});

test("draft PDF downloads authenticate, encode order references and revoke object URLs", async () => {
  let received, downloaded = false, removed = false, revoked;
  const anchor = { click: () => { downloaded = true; }, remove: () => { removed = true; } };
  const { downloadDraftInvoice } = loadApi(async (url, options) => {
    received = { url, options };
    return new Response("%PDF-1.4 test", { headers: { "content-type": "application/pdf" } });
  }, { globals: {
    window: { setTimeout: (callback) => callback() }, localStorage: { getItem: () => "fixture-token" },
    document: { createElement: () => anchor, body: { appendChild: () => {} } },
    URL: { createObjectURL: () => "blob:fixture", revokeObjectURL: (url) => { revoked = url; } },
  } });
  await downloadDraftInvoice("FO-/1");
  assert.equal(received.url, "https://api.example.test/api/v1/me/orders/FO-%2F1/draft-invoice");
  assert.equal(received.options.headers.Authorization, "Bearer fixture-token");
  assert.equal(received.options.cache, "no-store");
  assert.equal(anchor.download, "draft-FO-_1.pdf");
  assert.equal(anchor.href, "blob:fixture");
  assert.ok(downloaded && removed);
  assert.equal(revoked, "blob:fixture");
});

test("draft PDF failures remain visible and mock mode never requests a document", async () => {
  const unavailable = loadApi(async () => new Response('{"detail":"Historical snapshot unavailable"}', { status: 409 }));
  await assert.rejects(unavailable.downloadDraftInvoice("FO-1"), (error) =>
    error.status === 409 && unavailable.apiErrorMessage(error) === "Historical snapshot unavailable");
  const invalid = loadApi(async () => Response.json({ status: "ok" }));
  await assert.rejects(invalid.downloadDraftInvoice("FO-1"), /Expected a PDF/);
  const mock = loadApi(() => { throw new Error("Must not fetch"); }, { mock: true });
  await assert.rejects(mock.downloadDraftInvoice("FO-1"), /mock mode/);
});

test("standard middleware errors and legacy HTTP errors remain readable", () => {
  const { ApiError, apiErrorMessage } = loadApi();
  assert.equal(apiErrorMessage(new ApiError(401, '{"error":{"message":"Invalid credentials"}}')), "Invalid credentials");
  assert.equal(apiErrorMessage(new ApiError(409, '{"detail":"Not approved"}')), "Not approved");
  assert.equal(apiErrorMessage(new ApiError(503, "Service unavailable")), "Service unavailable");
});

test("checkout quote includes the selected delivery address", async () => {
  let received;
  const { storeApi } = loadApi(async (url, options) => {
    received = { url, options };
    return Response.json({ total_minor: 19800 });
  });
  const quote = await storeApi.quote("test-address");
  assert.equal(quote.total_minor, 19800);
  assert.equal(received.url, "https://api.example.test/api/v1/checkout/quote");
  assert.deepEqual(JSON.parse(received.options.body), { shipping_address_id: "test-address" });
});

test("wishlist mutations use backend product IDs and handle empty DELETE responses", async () => {
  const requests = [];
  const { storeApi } = loadApi(async (url, options) => {
    requests.push({ url, options });
    return options.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ product_id: "product-1" });
  });

  await storeApi.addWishlist("product-1");
  assert.deepEqual(JSON.parse(requests[0].options.body), { product_id: "product-1" });
  assert.equal(await storeApi.removeWishlist("product-1"), undefined);
  assert.equal(requests[1].url, "https://api.example.test/api/v1/me/wishlist/product-1");
  assert.equal(requests[1].options.method, "DELETE");
});

test("coupon code is sent to both quote and final checkout without client discount amounts", async () => {
  const requests = [];
  const { storeApi } = loadApi(async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return Response.json({ total_minor: 90000, discount_minor: 10000, coupon_code: "SAVE10" });
  });
  await storeApi.quote("address", "SAVE10");
  await storeApi.checkout("attempt-with-coupon", "address", "SAVE10");
  assert.equal(requests[0].body.coupon_code, "SAVE10");
  assert.equal(requests[1].body.coupon_code, "SAVE10");
  assert.equal(requests[1].body.idempotency_key, "attempt-with-coupon");
  assert.equal(requests[1].body.discount_minor, undefined);
  assert.equal(requests[1].body.total_minor, undefined);
});
