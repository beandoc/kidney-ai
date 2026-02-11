import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@langchain/google-genai"],
  serverExternalPackages: ["pdf-parse", "mammoth"],
  output: "standalone",
};

export default nextConfig;
