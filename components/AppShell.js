"use client";

import { usePathname } from "next/navigation";
import { useData } from "@/components/DataProvider";
import Sidebar from "@/components/Sidebar";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-200 border-t-yellow-500" />
        Memuat...
      </div>
    </div>
  );
}

// Halaman login tampil tanpa sidebar; halaman lain butuh login
export default function AppShell({ children }) {
  const { user } = useData();
  const pathname = usePathname();

  if (pathname === "/login") {
    return user ? <FullScreenLoader /> : children;
  }
  if (!user) return <FullScreenLoader />;

  return (
    <div className="md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
