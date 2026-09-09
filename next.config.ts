import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Next 16.3.4 can stall during the production cache flush at native shutdown.
  // Keep Turbopack while opting out of its build filesystem cache.
  experimental: { turbopackFileSystemCacheForBuild: false },
  distDir: process.env.COJEEV_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...(process.env.COJEEV_DEV_ORIGINS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  ],
  basePath: process.env.COJEEV_BASE_PATH ?? "/cojeev-ui",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
