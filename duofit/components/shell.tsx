"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store";
import { Avatar } from "./ui";
import { BarsIcon, DotsIcon, DumbbellIcon, HomeIcon, PenIcon, PersonIcon } from "./icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/log", label: "Log", Icon: PenIcon },
  { href: "/training", label: "Training", Icon: DumbbellIcon },
  { href: "/body", label: "Body", Icon: PersonIcon },
  { href: "/insights", label: "Insights", Icon: BarsIcon },
];

function TopBar() {
  const { data, update } = useStore();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/60 bg-bg/95 px-5 py-3 backdrop-blur">
      <button
        className="flex items-center gap-1.5 rounded-full bg-card px-2 py-1"
        onClick={() =>
          update((d) => ({ ...d, currentUserId: d.currentUserId === "christopher" ? "mahak" : "christopher" }))
        }
        title="Switch active user"
      >
        <Avatar name={me.name} tint={me.tint} size={22} />
        <span className="pr-1 text-[11px] text-muted">switch</span>
      </button>
      <Link href="/" className="font-mono text-[13px] font-bold tracking-[0.3em] text-accent">
        DUOFIT
      </Link>
      <Link href="/settings" aria-label="Settings" className="rounded-full p-1.5 text-muted">
        <DotsIcon size={20} />
      </Link>
    </header>
  );
}

function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line/60 bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur">
      <div className="flex items-start justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1">
              <span
                className={`flex items-center justify-center rounded-full px-4 py-1.5 transition-colors ${
                  active ? "border border-accent/70 text-accent" : "border border-transparent text-muted"
                }`}
              >
                <Icon size={21} />
              </span>
              <span className={`text-[11px] ${active ? "text-accent" : "text-muted"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-bg">
      <StoreProvider>
        <TopBar />
        <main className="px-5 pb-32 pt-4">{children}</main>
        <TabBar />
      </StoreProvider>
    </div>
  );
}
