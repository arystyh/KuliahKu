"use client";

import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { DEFAULT_GRADE_SCALE, sortScale } from "@/lib/grades";
import { IconX } from "@/components/Icons";
import MoodleSettings from "@/components/MoodleSettings";
import AccountSettings from "@/components/AccountSettings";
import ReminderSettings from "@/components/ReminderSettings";
import { stagger } from "@/components/Motion";

const cell =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center outline-none focus:border-yellow-400";

export default function PengaturanPage() {
  const { gradeScale, saveGradeScale, setError } = useData();
  const [draft, setDraft] = useState(gradeScale);
  const [saved, setSaved] = useState(false);

  // Sinkronkan draft saat data dari server sudah termuat
  useEffect(() => {
    setDraft(gradeScale);
  }, [gradeScale]);

  const sorted = sortScale(draft);
  const changed =
    JSON.stringify(sortScale(gradeScale)) !== JSON.stringify(sorted);

  function setRow(index, field, value) {
    setSaved(false);
    setDraft((prev) =>
      prev.map((g, i) =>
        i === index
          ? {
              ...g,
              [field]:
                field === "letter" ? value : value === "" ? "" : Number(value),
            }
          : g,
      ),
    );
  }

  function addRow() {
    setSaved(false);
    setDraft((prev) => [...prev, { letter: "", min: 0, point: 0 }]);
  }

  function removeRow(index) {
    setSaved(false);
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (draft.some((g) => g.min === "" || g.point === "")) {
      setError("Semua kolom Min dan Bobot wajib diisi.");
      return;
    }
    const ok = await saveGradeScale(draft);
    if (ok) setSaved(true);
  }

  // Max tiap huruf = batas bawah huruf di atasnya (seperti tabel SIAK)
  const maxOf = (row) => {
    const higher = sorted.filter((g) => Number(g.min) > Number(row.min));
    return higher.length ? Math.min(...higher.map((g) => Number(g.min))) : 100;
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-sm text-slate-500">Akun, pengingat, koneksi Moodle, dan matriks nilai.</p>
      </div>

      <div className="animate-fade-up" style={stagger(1, 70)}>
        <AccountSettings />
      </div>
      <div className="animate-fade-up" style={stagger(2, 70)}>
        <ReminderSettings />
      </div>
      <div className="animate-fade-up" style={stagger(3, 70)}>
        <MoodleSettings />
      </div>

      <section className="animate-fade-up rounded-2xl bg-white p-5 shadow-sm" style={stagger(4, 70)}>
        <h2 className="mb-1 font-semibold">Range Nilai dan Huruf Mutu</h2>
        <p className="mb-4 text-xs text-slate-500">
          Nilai ≥ Min dan &lt; Max mendapat huruf tersebut. Max diisi otomatis
          dari huruf di atasnya.
        </p>

        <div className="overflow-hidden rounded-xl ring-1 ring-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-yellow-300 text-slate-900">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Nilai</th>
                <th className="px-3 py-2.5 font-semibold">Min</th>
                <th className="px-3 py-2.5 font-semibold">Max</th>
                <th className="px-3 py-2.5 font-semibold">Bobot</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {draft.map((row, i) => (
                <tr key={i} className="animate-fade-in odd:bg-white even:bg-yellow-50/60">
                  <td className="px-3 py-2">
                    <input
                      value={row.letter}
                      onChange={(e) => setRow(i, "letter", e.target.value)}
                      className={`${cell} font-bold`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.min}
                      onChange={(e) => setRow(i, "min", e.target.value)}
                      className={cell}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">
                    {maxOf(row)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={4}
                      value={row.point}
                      onChange={(e) => setRow(i, "point", e.target.value)}
                      className={cell}
                    />
                  </td>
                  <td className="pr-3 text-center">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-slate-300 hover:text-red-600"
                      aria-label="Hapus baris"
                    >
                      <IconX />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={addRow}
            className="rounded-xl px-3 py-2 text-sm font-medium text-orange-600 hover:bg-yellow-50"
          >
            + Tambah huruf
          </button>
          <button
            onClick={() => {
              setDraft(DEFAULT_GRADE_SCALE);
              setSaved(false);
            }}
            className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Kembalikan default
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`text-sm text-emerald-600 transition-[opacity,translate] duration-300 ${
                saved && !changed ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
              }`}
            >
              Tersimpan
            </span>
            <button
              onClick={handleSave}
              disabled={!changed}
              className="rounded-xl bg-yellow-400 px-5 py-2 font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Simpan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
