import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the hackathon template's AGENTS.md as-is instead of letting `next dev` rewrite it.
  agentRules: false,
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
