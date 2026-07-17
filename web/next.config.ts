import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile elsewhere doesn't get picked up.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
