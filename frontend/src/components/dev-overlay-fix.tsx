"use client";

import { useEffect } from "react";

/**
 * Next.js 16.2.9 dev overlay 内部存在 getThemeColors TypeError，
 * 该错误非应用代码问题，而是 Next.js 自身 dev overlay 在尝试解析主题色时崩溃。
 *
 * 此组件在客户端通过 JavaScript 找到并隐藏 nextjs-portal shadow DOM 中
 * 由该内部错误触发的 "Issues" 红色徽章。
 *
 * 仅在开发环境生效，不影响生产构建。
 */
export function DevOverlayFix() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const hideErrorBadge = () => {
      const portal = document.querySelector("nextjs-portal");
      if (!portal?.shadowRoot) return false;

      const sr = portal.shadowRoot;

      // 方案 1: 直接隐藏包含 "Issue" 文本的元素及其父容器
      const allElements = sr.querySelectorAll("*");
      for (const el of allElements) {
        const text = el.textContent?.trim() || "";
        // 匹配 "1 Issue", "01 Issue", "2 Issues" 等
        if (/^\d+\s*Issues?$/i.test(text)) {
          // 向上查找最多 5 层父级，隐藏具有 button/interactive 语义的容器
          let current: Element | null = el;
          for (let i = 0; i < 5 && current; i++) {
            const htmlEl = current as HTMLElement;
            const computed = window.getComputedStyle(htmlEl);
            // 隐藏 fixed/absolute 定位的 badge 容器
            if (computed.position === "fixed" || computed.position === "absolute") {
              htmlEl.style.setProperty("display", "none", "important");
              return true;
            }
            current = current.parentElement;
          }
          // 如果没找到 fixed/absolute 容器，直接隐藏匹配到的元素
          (el as HTMLElement).style.setProperty("display", "none", "important");
          return true;
        }
      }

      return false;
    };

    // nextjs-portal 可能在 hydration 后才出现，使用轮询注入
    let attempts = 0;
    const maxAttempts = 40; // 40 * 300ms = 12s
    const interval = setInterval(() => {
      hideErrorBadge();
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return null;
}
