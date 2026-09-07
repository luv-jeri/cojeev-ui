import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.SAHAJIV_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  basePath: process.env.SAHAJIV_BASE_PATH ?? "/sahajiv-ui",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
