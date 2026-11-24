"use client";

import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { REMINDER_OPTIONS } from "@/lib/reminders";
import { IconBell, IconCheck } from "@/components/Icons";

export default function ReminderSettings() {
  const { reminderSettings, saveReminderSettings, permission, requestPermission } = useData();
  const [selected, setSelected] = useState(reminderSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setSelected(reminderSettings), [reminderSettings]);

  const changed =
    [...selected].sort((a, b) => b - a).join() !== [...reminderSettings].sort((a, b) => b - a).join();

  function toggle(minutes) {
    setSaved(false);
    setSelected((prev) => (prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]));
  }

  async function handleSave() {
    const ok = await saveReminderSettings(selected);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold">Pengingat deadline</h2>
      <p className="mb-4 text-xs text-slate-500">
        Pilih kapan saja kamu mau diingatkan sebelum deadline. Pengingat saat deadline tiba selalu aktif.
      </p>

      <div className="flex flex-wrap gap-2">
        {REMINDER_OPTIONS.map((o) => {
          const on = selected.includes(o.minutes);
          return (
            <button
              key={o.minutes}
              type="button"
              onClick={() => toggle(o.minutes)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-[background-color,box-shadow,color] duration-300 ${
                on
                  ? "bg-yellow-400 text-slate-900 shadow-sm ring-yellow-400"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-yellow-50"
              }`}
            >
              <span
                className={`grid transition-[grid-template-columns,opacity] duration-300 ${
                  on ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"
                }`}
              >
                <span className="min-w-0 overflow-hidden">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
              </span>
              {o.label} sebelum
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!changed}
          className="rounded-xl bg-yellow-400 px-5 py-2 text-sm font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simpan
        </button>
        <span
          className={`flex items-center gap-1 text-sm text-emerald-600 transition-[opacity,translate] duration-300 ${
            saved ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
          }`}
        >
          <IconCheck className="h-4 w-4" /> Tersimpan
        </span>
        {permission !== "granted" && (
          <button
            onClick={requestPermission}
            className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-yellow-50"
          >
            <IconBell /> Izinkan notifikasi Windows
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Pengingat juga muncul sebagai kartu di pojok kanan bawah aplikasi, jadi tetap terlihat walau notifikasi
        Windows mati.
      </p>
    </section>
  );
}
