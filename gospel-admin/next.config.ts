import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standard build for Netlify (not static export)
  // This allows API routes to work as Netlify Functions
  
  // Disable image optimization for Netlify
  images: {
    unoptimized: true
  },
  
  // Optional: Add trailing slash for better hosting compatibility  
  trailingSlash: true,
};

export default nextConfig;
