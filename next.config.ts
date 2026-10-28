import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 페이지가 정적이라 Cloudflare Pages에 정적 사이트(out/)로 배포
  output: "export",
};

export default nextConfig;
