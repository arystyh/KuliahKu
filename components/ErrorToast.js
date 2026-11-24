"use client";

import { useRef } from "react";
import { useData } from "@/components/DataProvider";
import { IconAlert, IconBell, IconExternal, IconX } from "@/components/Icons";
import { EASE } from "@/components/Motion";

// Area notifikasi di pojok kanan bawah: pengingat deadline, error, dan status menyimpan
export default function ErrorToast() {
  const { error, setError, saving, reminders, dismissReminder, user } = useData();
  const lastError = useRef("");
  if (error) lastError.current = error;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-2">
      {/* Pengingat deadline */}
      {user &&
        reminders.map((r) => (
          <div
            key={r.key}
            className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-xl shadow-slate-900/20"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                r.offset === 0 ? "bg-red-500 text-white" : "bg-yellow-400 text-slate-900"
              }`}
            >
              {r.offset === 0 ? <IconAlert className="h-4 w-4" /> : <IconBell className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-300">{r.heading}</p>
              <p className="truncate text-sm font-medium">{r.title}</p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-yellow-200 hover:text-yellow-100"
                >
                  <IconExternal className="h-3.5 w-3.5" /> Buka tugas
                </a>
              )}
            </div>
            <button
              onClick={() => dismissReminder(r.key)}
              aria-label="Tutup pengingat"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <IconX />
            </button>
          </div>
        ))}

      {/* Error: tetap ter-render supaya bisa animasi keluar */}
      <div
        className={`flex w-full items-start gap-3 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg transition-[opacity,translate,scale] duration-300 ${EASE} ${
          error ? "pointer-events-auto translate-x-0 scale-100 opacity-100" : "translate-x-8 scale-95 opacity-0"
        }`}
        role="alert"
        aria-hidden={!error}
      >
        <span className="flex-1">{error || lastError.current}</span>
        <button onClick={() => setError("")} className="rounded p-0.5 hover:bg-white/15" aria-label="Tutup">
          <IconX />
        </button>
      </div>

      <div
        className={`flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs text-yellow-300 shadow transition-[opacity,translate] duration-300 ${EASE} ${
          saving ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        aria-hidden={!saving}
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-300/30 border-t-yellow-300" />
        Menyimpan...
      </div>
    </div>
  );
}
