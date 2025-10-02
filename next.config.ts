import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js to ignore ESLint errors during the build process.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;