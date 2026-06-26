import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 隐藏 Next.js dev 左下角路由指示器
  devIndicators: false,
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
