import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 隐藏 Next.js dev 左下角路由指示器
  devIndicators: false,
  // 生产环境：/api/:path* 代理到后端 FastAPI（端口 8800）
  // 本地开发不受影响（前端直接请求 NEXT_PUBLIC_API_BASE_URL=http://localhost:8800）
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8800/:path*",
      },
    ];
  },
  turbopack: {
    ignoreIssue: [
      // Next.js 16.2.9 dev overlay 内部 getThemeColors TypeError，非应用代码问题
      {
        path: "**/next/dist/bundle-analyzer/**",
        title: "getThemeColors",
      },
    ],
  },
};

export default nextConfig;
