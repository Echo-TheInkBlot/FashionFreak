import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Staff photo uploads. The staff app shrinks photos to about 0.5 MB first;
    // Vercel caps request bodies at 4.5 MB, so stay under that.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
