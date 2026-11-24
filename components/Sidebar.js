"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/components/DataProvider";
import Logo from "@/components/Logo";
import { IconLogout } from "@/components/Icons";
import { useSlidingIndicator } from "@/components/Motion";

function Icon({ path }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {path}
    </svg>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </>
  ),
  task: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  grade: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 16v-3M12 16V8M16 16v-5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

const LINKS = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/tugas", label: "Tugas", icon: "task" },
  { href: "/nilai", label: "Nilai & IPK", icon: "grade" },
  { href: "/pengaturan", label: "Pengaturan", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { tasks, now, user, logout } = useData();
  const desktopNav = useSlidingIndicator(pathname);
  const mobileNav = useSlidingIndicator(pathname);
  const initials = (user?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function handleLogout() {
    if (confirm("Keluar dari akun?")) logout();
  }

  const weekAhead = tasks.filter((t) => {
    const due = new Date(t.dueAt);
    return !t.done && due >= now && due - now <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-yellow-100 bg-white px-5 py-6 md:flex">
        <Logo />
        <nav ref={desktopNav.containerRef} className="relative flex flex-col gap-1">
          {/* Penanda menu aktif yang bergeser */}
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 top-0 rounded-xl bg-yellow-100 ${desktopNav.indicatorClass}`}
            style={desktopNav.indicatorStyle}
          />
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                ref={desktopNav.register(link.href)}
                href={link.href}
                className={`relative z-10 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors duration-300 hover:transform-none ${
                  active
                    ? "font-semibold text-slate-900"
                    : "text-slate-500 hover:bg-yellow-50/70 hover:text-slate-800"
                }`}
              >
                <Icon path={ICONS[link.icon]} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-yellow-300 p-5 text-center">
          <p key={weekAhead} className="animate-pop text-4xl font-bold">
            {weekAhead}
          </p>
          <p className="font-semibold">
            {weekAhead > 0 ? "deadline minggu ini" : "Minggu ini aman"}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            {weekAhead > 0 ? "Jangan sampai telat, ya." : "Tidak ada deadline 7 hari ke depan."}
          </p>
          <Link
            href="/tugas"
            className="mt-4 block rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-yellow-300 hover:bg-slate-800"
          >
            Lihat tugas
          </Link>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-yellow-50 p-2">
          <Link
            href="/pengaturan"
            title="Pengaturan akun"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 hover:transform-none hover:bg-yellow-100/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user?.name}</span>
              <span className="block truncate text-xs text-slate-500">@{user?.username}</span>
            </span>
          </Link>
          <button
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600"
          >
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-20 border-b border-yellow-100 bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold">
              {initials}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Keluar"
              className="rounded-lg p-2 text-slate-400 hover:text-red-600"
            >
              <IconLogout />
            </button>
          </div>
        </div>
        <nav ref={mobileNav.containerRef} className="relative flex gap-1 overflow-x-auto px-3 pb-2">
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 top-0 rounded-lg bg-yellow-300 ${mobileNav.indicatorClass}`}
            style={mobileNav.indicatorStyle}
          />
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                ref={mobileNav.register(link.href)}
                href={link.href}
                className={`relative z-10 flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors duration-300 hover:transform-none ${
                  active ? "font-semibold" : "text-slate-500"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
