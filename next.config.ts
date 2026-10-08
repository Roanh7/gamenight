import type { NextConfig } from "next";

// Alle pagina's zijn persoonlijk (ingelogde gebruiker), dus we renderen dynamisch.
const nextConfig: NextConfig = {
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
