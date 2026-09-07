import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.SAHAJIV_BASE_PATH ?? "/sahajiv-ui",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
