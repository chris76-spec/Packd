"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/rivalry", label: "Rivalry" },
  { href: "/wrap", label: "Wrap" },
  { href: "/settings", label: "Settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (pathname === "/login") return <main className="mx-auto max-w-md p-4">{children}</main>;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 p-4 pb-24">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t px-2 py-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--surface-2)" }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-full px-3 py-1 text-sm font-medium"
              style={{
                color: active ? "var(--ink)" : "var(--ink-3)",
                background: active ? "var(--surface-2)" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
