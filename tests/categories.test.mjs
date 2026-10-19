import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(fs.readFileSync(new URL("../src/lib/categories.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exports = {};
vm.runInNewContext(outputText, { exports });
const product = (product_type, overrides = {}) => ({ status: "ACTIVE", product_type, image_url: null, image_urls: [], variants: [{ available: 0 }], ...overrides });

test("categories only include published product types, retain sold-out products and group aliases", () => {
  const result = exports.catalogueCategories([product("SHIRT"), product("OVERSIZED_SHIRT"), product("CAP", { status: "DRAFT" }), product(null), product("NEW_TYPE")]);
  assert.equal(result.length, 2);
  assert.equal(result[0].key, "Tees");
  assert.equal(result[1].title, "new type");
});

test("CDN overrides take priority, with product images as fallback and no phantom categories", () => {
  const sections = [{ type: "category_grid", position: 1, content: { items: [
    { product_type: "SHIRT", image: { desktop_url: "https://cdn.example/shirt.webp", mobile_url: "https://cdn.example/mobile.webp", alt: "Shirts" } },
    { product_type: "CAP", image: { desktop_url: "https://cdn.example/cap.webp" } },
  ] } }];
  const result = exports.catalogueCategories([product("SHIRT", { image_url: "/shirt.png" }), product("HOODIE", { image_urls: ["/hoodie.png"] })], sections);
  assert.equal(result.length, 2);
  assert.equal(result[0].image, "https://cdn.example/shirt.webp");
  assert.equal(result[0].mobile, "https://cdn.example/mobile.webp");
  assert.equal(result[1].image, "/hoodie.png");
});

test("invalid category image URLs and malformed content are ignored safely", () => {
  const result = exports.catalogueCategories([product("SHIRT", { image_url: "/safe.png" })], [{ type: "category_grid", position: 1, content: { items: [null, { product_type: "SHIRT", image: { desktop_url: "//unapproved.example/image" } }] } }]);
  assert.equal(result[0].image, "/safe.png");
  assert.equal(exports.catalogueCategories([]).length, 0);
});
