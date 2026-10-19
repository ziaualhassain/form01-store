import type { NextConfig } from "next";

const mock = process.env.MOCK ?? process.env.NEXT_PUBLIC_MOCK ?? "true";
if (mock !== "true" && mock !== "false") {
  throw new Error("MOCK must be either true or false.");
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_MOCK: mock },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
