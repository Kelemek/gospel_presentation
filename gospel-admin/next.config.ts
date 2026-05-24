import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standard build for Netlify (not static export)
  // This allows API routes to work as Netlify Functions

  // Word-study API routes read JSON via fs; include gitignored data/stepbible in the serverless trace.
  outputFileTracingIncludes: {
    "/api/scripture/word-study": ["./data/stepbible/**/*"],
    "/api/scripture/lexicon": ["./data/stepbible/**/*"],
  },

  // Disable image optimization for Netlify
  images: {
    unoptimized: true
  },
  
  // Optional: Add trailing slash for better hosting compatibility  
  trailingSlash: true,
  
  // Disable source maps in production to avoid 404 errors in console
  productionBrowserSourceMaps: false,
};

export default nextConfig;
