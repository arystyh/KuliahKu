"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Kalender bulanan; tanggal yang punya deadline diberi titik
export default function Calendar({ tasks, now }) {
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = mundur, 1 = maju

  function go(step) {
    setDirection(step);
    setOffset((o) => o + step);
  }

  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (startDay + daysInMonth) + 1, muted: true });
  }

  const deadlineDays = new Set(
    tasks.filter((t) => !t.done).map((t) => new Date(t.dueAt).toDateString())
  );
  const todayKey = now.toDateString();
  const title = first.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 key={title} className="animate-fade-in text-lg font-semibold capitalize">
          {title}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => go(-1)}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-yellow-100"
            aria-label="Bulan sebelumnya"
          >
            <IconChevronLeft />
          </button>
          <button
            onClick={() => go(1)}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-yellow-100"
            aria-label="Bulan berikutnya"
          >
            <IconChevronRight />
          </button>
        </div>
      </div>

      <div
        key={offset}
        className={`grid grid-cols-7 gap-y-1 text-center text-sm ${
          direction > 0 ? "animate-slide-from-right" : direction < 0 ? "animate-slide-from-left" : ""
        }`}
      >
        {DAYS.map((d) => (
          <span key={d} className="pb-1 text-xs text-slate-400">
            {d}
          </span>
        ))}
        {cells.map((cell, i) => {
          const key = cell.date?.toDateString();
          const isToday = key === todayKey;
          const hasDeadline = key && deadlineDays.has(key);
          return (
            <div key={i} className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                  cell.muted
                    ? "text-slate-300"
                    : isToday
                    ? "bg-yellow-400 font-bold text-slate-900"
                    : "text-slate-700 hover:bg-yellow-100"
                }`}
              >
                {cell.day}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${hasDeadline ? "bg-orange-500" : "bg-transparent"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
