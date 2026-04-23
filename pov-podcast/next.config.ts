import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from common external sources used for persona avatars and banners.
    // Add additional domains as needed when new image sources are introduced.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Optimise image formats for modern browsers
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
