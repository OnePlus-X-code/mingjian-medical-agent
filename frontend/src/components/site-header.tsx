"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/console", label: "看板" },
  { href: "#features", label: "产品介绍" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/65">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_4px_12px_-2px_rgba(2,132,199,0.5)]">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-slate-900">
              明鉴 · 医保监管智能体
            </div>
            <div className="text-xs text-slate-500">智能复核协作平台</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/")
                  ? pathname.startsWith(item.href)
                  : false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm transition",
                  active
                    ? "font-semibold text-sky-700"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-sky-600" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
