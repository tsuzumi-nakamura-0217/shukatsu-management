import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.11.27:3000" // PCやスマホ等、同一ネットワーク内からアクセスするための許可
      ]
    }
  }
};

export default nextConfig;
