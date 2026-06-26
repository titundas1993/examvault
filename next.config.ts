import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Tell Next.js NOT to bundle firebase-admin — load it from node_modules at runtime.
  // This fixes the ESM import error with jose/jwks-rsa used by firebase-admin/auth on Vercel.
  serverExternalPackages: ["firebase-admin"],
  allowedDevOrigins: [
    "preview-chat-0945aee7-0c2c-45d5-90bd-71baa4de689d.space-z.ai",
    ".space-z.ai",
    ".z.ai",
    "preview-chat-0945aee7-0c2c-45d5-90bd-71baa4de689d.space-z.ai",
    "localhost",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
