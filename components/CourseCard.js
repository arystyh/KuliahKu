"use client";

import { useState } from "react";
import ProgressRing from "@/components/ProgressRing";
import { courseSummary, neededForTarget, sortScale } from "@/lib/grades";
import { courseInitials, gradeBadge } from "@/lib/ui";
import { IconChevronRight, IconX } from "@/components/Icons";
import { Collapse, PillTabs } from "@/components/Motion";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const small =
  "rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-yellow-400";

export default function CourseCard({ course, gradeScale, iconColor, onChange, onDelete }) {
  const scale = sortScale(gradeScale);
  const [target, setTarget] = useState(scale[0]?.letter ?? "A");
  const [showMoodle, setShowMoodle] = useState(false);
  const moodleGrades = course.moodleGrades ?? [];
  const s = courseSummary(course, scale);
  const targetGrade = scale.find((g) => g.letter === target) ?? scale[0];
  const needed = targetGrade ? neededForTarget(course, targetGrade.min, scale) : null;

  function setComponent(compId, field, raw) {
    let value = raw;
    if (field === "score") value = raw === "" ? null : clamp(Number(raw), 0, 100);
    if (field === "weight") value = raw === "" ? 0 : clamp(Number(raw), 0, 100);
    onChange({
      components: course.components.map((c) => {
        if (c.id !== compId) return c;
        const next = { ...c, [field]: value };
        if (field === "score") delete next.source; // diisi manual, bukan dari Moodle lagi
        return next;
      }),
    });
  }

  function addComponent() {
    onChange({
      components: [
        ...course.components,
        { id: `${course.id}-${Date.now()}`, name: "Komponen baru", weight: 0, score: null },
      ],
    });
  }

  function removeComponent(compId) {
    onChange({ components: course.components.filter((c) => c.id !== compId) });
  }

  let targetMessage = null;
  if (needed !== null) {
    if (needed <= 0) {
      targetMessage = <span className="text-emerald-700">Aman, {target} sudah pasti didapat.</span>;
    } else if (needed > 100) {
      targetMessage = (
        <span className="text-red-600">
          {target} sudah tidak mungkin (butuh {needed.toFixed(1)}).
        </span>
      );
    } else {
      targetMessage = (
        <span>
          Butuh rata-rata <b>{needed.toFixed(1)}</b> di sisa {s.remainingWeight}%
        </span>
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm transition duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-slate-700 ${iconColor}`}
        >
          {courseInitials(course.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            value={course.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="rounded px-1 font-semibold outline-none focus:bg-yellow-50"
          />
          <div className="flex flex-wrap items-center gap-1 px-1 text-xs text-slate-500">
            <input
              value={course.code}
              placeholder="Kode MK"
              onChange={(e) => onChange({ code: e.target.value })}
              className="w-24 rounded bg-transparent outline-none focus:bg-yellow-50"
            />
            ·
            <input
              type="number"
              min={1}
              max={24}
              value={course.sks}
              onChange={(e) => onChange({ sks: clamp(Number(e.target.value) || 0, 0, 24) })}
              className="w-8 rounded border border-slate-200 text-center"
            />
            SKS ·
            <input
              value={course.className}
              placeholder="Kelas"
              onChange={(e) => onChange({ className: e.target.value })}
              className="min-w-0 flex-1 rounded bg-transparent outline-none focus:bg-yellow-50"
            />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            key={s.grade?.letter ?? "none"}
            className={`animate-pop rounded-xl px-3 py-1 text-xl font-bold transition-colors duration-300 ${gradeBadge(s.grade?.letter)}`}
          >
            {s.grade?.letter ?? "–"}
          </span>
          {s.current !== null && <span className="mt-1 text-xs text-slate-500">{s.current.toFixed(1)}</span>}
        </div>
      </div>

      {/* Pilih cara input */}
      <PillTabs
        items={[
          { value: "komponen", label: "Per komponen" },
          { value: "final", label: "Nilai akhir saja" },
        ]}
        value={course.mode}
        onChange={(mode) => onChange({ mode })}
        className="flex rounded-xl bg-yellow-50 p-1 text-sm"
        indicatorClassName="rounded-lg bg-yellow-400 shadow-sm"
        itemClassName={(isActive) =>
          `flex-1 rounded-lg py-1.5 font-medium ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`
        }
      />

      {course.mode === "final" ? (
        <div key="final" className="flex animate-fade-in flex-col gap-2">
          <p className="text-xs text-slate-500">
            Cocok untuk semester yang sudah lewat. Pilih huruf mutu akhir dari transkrip.
          </p>
          <div className="flex flex-wrap gap-2">
            {scale.map((g) => (
              <button
                key={g.letter}
                onClick={() => onChange({ finalLetter: g.letter })}
                className={`min-w-11 rounded-lg px-3 py-1.5 text-sm font-bold ring-1 transition-[background-color,box-shadow,translate,scale] duration-200 ${
                  course.finalLetter === g.letter
                    ? "scale-110 bg-yellow-400 shadow-md ring-yellow-400"
                    : "bg-white ring-slate-200 hover:bg-yellow-50"
                }`}
              >
                {g.letter}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div key="komponen" className="flex animate-fade-in flex-col gap-4">
          {/* Progress */}
          <div className="flex items-center gap-3 text-yellow-500">
            <ProgressRing percent={s.totalWeight ? (s.filledWeight / s.totalWeight) * 100 : 0} />
            <div className="text-xs text-slate-500">
              <p>
                {s.filledWeight}% dari {s.totalWeight}% nilai sudah keluar
              </p>
              {s.totalWeight !== 100 && (
                <p className="font-medium text-orange-600">Total bobot {s.totalWeight}%, harusnya 100%</p>
              )}
            </div>
          </div>

          {/* Komponen nilai */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_4rem_4rem_1.5rem] gap-2 text-xs font-medium text-slate-400">
              <span>Komponen</span>
              <span className="text-center">Bobot %</span>
              <span className="text-center">Nilai</span>
              <span />
            </div>
            {course.components.map((c) => (
              <div
                key={c.id}
                className="grid animate-fade-in grid-cols-[1fr_4rem_4rem_1.5rem] items-center gap-2"
              >
                <input
                  value={c.name}
                  onChange={(e) => setComponent(c.id, "name", e.target.value)}
                  className={small}
                />
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) => setComponent(c.id, "weight", e.target.value)}
                  className={`${small} text-center`}
                />
                <input
                  type="number"
                  placeholder="–"
                  title={c.source === "moodle" ? "Diisi otomatis dari Moodle" : undefined}
                  value={c.score ?? ""}
                  onChange={(e) => setComponent(c.id, "score", e.target.value)}
                  className={`${small} text-center font-semibold ${
                    c.source === "moodle" ? "border-orange-300 bg-orange-50 text-orange-800" : ""
                  }`}
                />
                <button
                  onClick={() => removeComponent(c.id)}
                  className="text-slate-300 hover:text-red-600"
                  aria-label="Hapus komponen"
                >
                  <IconX />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button onClick={addComponent} className="text-sm font-medium text-orange-600 hover:underline">
                + Tambah komponen
              </button>
              {course.components.some((c) => c.source === "moodle") && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm border border-orange-300 bg-orange-50" />
                  dari Moodle
                </span>
              )}
            </div>
          </div>

          {/* -mt-4 + pt-4: jarak ikut menutup saat kotak target disembunyikan */}
          <Collapse open={needed !== null} className="-mt-4">
            <div className="pt-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-yellow-50 p-3 text-sm">
                <label className="flex items-center gap-2">
                  Target
                  <select value={target} onChange={(e) => setTarget(e.target.value)} className={small}>
                    {scale
                      .filter((g) => g.min > 0)
                      .map((g) => (
                        <option key={g.letter} value={g.letter}>
                          {g.letter} (≥{g.min})
                        </option>
                      ))}
                  </select>
                </label>
                <span key={`${target}-${needed?.toFixed(1)}`} className="animate-fade-in">
                  {targetMessage}
                </span>
              </div>
            </div>
          </Collapse>
        </div>
      )}

      {moodleGrades.length > 0 && (
        <div className="rounded-xl ring-1 ring-slate-100">
          <button
            onClick={() => setShowMoodle((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
          >
            Nilai di Moodle ({moodleGrades.length})
            <span
              className={`text-slate-400 transition-[rotate] duration-300 ${showMoodle ? "rotate-90" : ""}`}
            >
              <IconChevronRight />
            </span>
          </button>
          <Collapse open={showMoodle}>
            <ul className="divide-y divide-slate-50 px-3 pb-2 text-sm">
              {moodleGrades.map((g, i) => (
                <li key={i} className="flex justify-between gap-3 py-1.5">
                  <span className="truncate text-slate-600">{g.name}</span>
                  <span className="font-semibold">{g.percent}</span>
                </li>
              ))}
            </ul>
          </Collapse>
        </div>
      )}

      <button onClick={onDelete} className="self-end text-xs text-slate-400 hover:text-red-600">
        Hapus mata kuliah
      </button>
    </div>
  );
}
