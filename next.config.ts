import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./public/images/**", "./public/uploads/**"],
  },
};

export default nextConfig;
