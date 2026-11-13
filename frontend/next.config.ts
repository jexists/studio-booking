import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4 (Turbopack 로더)
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
