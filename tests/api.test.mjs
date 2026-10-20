import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadApi(fetch) {
  const filename = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, fetch, AbortSignal, URLSearchParams,
    require(name) {
      if (name === "./store-config") return { apiBaseUrl: "https://api.example.test/api/v1", isMockMode: false };
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
