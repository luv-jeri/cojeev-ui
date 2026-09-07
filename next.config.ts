import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.SAHAJIV_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...(process.env.SAHAJIV_DEV_ORIGINS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  ],
  basePath: process.env.SAHAJIV_BASE_PATH ?? "/sahajiv-ui",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
