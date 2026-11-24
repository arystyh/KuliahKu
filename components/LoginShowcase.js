"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { IconAlert, IconBell, IconExternal, IconRefresh } from "@/components/Icons";

const SLIDE_MS = 5000;

// ---------- Isi slide ----------
const SLIDES = [
  {
    title: "Deadline aman, IPK terpantau.",
    text: "Satu tempat untuk mengatur tugas kuliah dan memantau nilai di setiap semester.",
    preview: (
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-slate-500">IPK Kumulatif</p>
          <p className="text-4xl font-bold">3.83</p>
        </div>
        <div className="flex h-14 items-end gap-1.5">
          {[55, 70, 62, 85, 95].map((h, i) => (
            <span
              key={i}
              className={`w-3 rounded-t ${i === 4 ? "bg-yellow-400" : "bg-yellow-200"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Nggak ada lagi tugas kelewat.",
    text: "Notifikasi Windows muncul tepat saat deadline tiba, lengkap dengan link ke halaman tugasnya.",
    preview: (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400">
          <IconBell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Deadline tiba</p>
          <p className="truncate text-xs text-slate-500">Laporan Praktikum Fisika Dasar</p>
        </div>
        <span className="flex items-center gap-1 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-medium">
          <IconExternal className="h-3.5 w-3.5" /> Moodle
        </span>
      </div>
    ),
  },
  {
    title: "Tahu harus dapat berapa di UAS.",
    text: "Masukkan nilai kuis, tugas, dan UTS. IPK dihitung realtime, lengkap dengan target nilai yang dibutuhkan.",
    preview: (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-sm font-bold">
          KA
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Kalkulus</p>
          <p className="text-xs text-slate-500">
            Target A: butuh <b className="text-slate-800">88.6</b> di UAS
          </p>
        </div>
        <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-lg font-bold text-emerald-700">A-</span>
      </div>
    ),
  },
  {
    title: "Langsung tersambung ke Moodle.",
    text: "Deadline, status pengumpulan, dan nilai yang sudah dirilis dosen masuk otomatis.",
    preview: (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-yellow-300">
          <IconRefresh className="h-5 w-5 animate-spin [animation-duration:3s]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Sinkron Moodle</p>
          <p className="text-xs text-slate-500">4 tugas baru · 2 nilai terisi</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
          <IconAlert className="h-3.5 w-3.5" /> 1 telat
        </span>
      </div>
    ),
  },
];

// ---------- Bentuk latar (depth = seberapa jauh bergerak mengikuti mouse) ----------
const SHAPES = [
  { className: "-right-24 -top-24 h-72 w-72 rounded-[48px] bg-yellow-300 rotate-45", depth: 35, delay: "0s" },
  { className: "-bottom-32 -left-16 h-80 w-80 rounded-[56px] bg-orange-300/60 rotate-45", depth: -30, delay: "-2s" },
  { className: "bottom-40 right-24 h-24 w-24 rounded-2xl bg-white/40 rotate-45", depth: 70, delay: "-4s" },
  { className: "left-[45%] top-28 h-16 w-16 rounded-full border-[6px] border-slate-900/10", depth: -60, delay: "-1s" },
  { className: "right-[30%] top-[38%] h-5 w-5 rounded-md bg-slate-900/80 rotate-45", depth: 90, delay: "-3s" },
  { className: "bottom-24 left-[38%] h-8 w-8 rounded-full bg-orange-400/70", depth: 55, delay: "-5s" },
  { className: "left-16 top-[30%] h-10 w-10 rounded-xl border-4 border-white/50 rotate-12", depth: -45, delay: "-2.5s" },
];

export default function LoginShowcase() {
  const panelRef = useRef(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);

  // Ganti slide otomatis; timer diulang setiap kali slide berubah (termasuk saat diklik)
  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [index]);

  // Posisi mouse disimpan sebagai CSS variable, jadi tidak perlu re-render React
  function handleMove(e) {
    const panel = panelRef.current;
    if (!panel) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      panel.style.setProperty("--mx", x.toFixed(3));
      panel.style.setProperty("--my", y.toFixed(3));
      panel.style.setProperty("--gx", `${e.clientX - rect.left}px`);
      panel.style.setProperty("--gy", `${e.clientY - rect.top}px`);
      panel.style.setProperty("--glow", "1");
    });
  }

  function handleLeave() {
    const panel = panelRef.current;
    if (!panel) return;
    cancelAnimationFrame(frame.current);
    panel.style.setProperty("--mx", "0");
    panel.style.setProperty("--my", "0");
    panel.style.setProperty("--glow", "0");
  }

  return (
    <div
      ref={panelRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative hidden overflow-hidden bg-yellow-400 p-12 lg:flex lg:flex-col lg:justify-between"
      style={{ "--mx": 0, "--my": 0, "--glow": 0 }}
    >
      {/* Cahaya yang mengikuti kursor */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: "var(--glow)",
          background:
            "radial-gradient(420px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.45), transparent 60%)",
        }}
      />

      {/* Bentuk-bentuk yang bergerak (parallax) */}
      {SHAPES.map((shape, i) => (
        <div
          key={i}
          className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out"
          style={{
            transform: `translate(calc(var(--mx) * ${shape.depth}px), calc(var(--my) * ${shape.depth}px))`,
          }}
        >
          <span
            className={`absolute animate-float ${shape.className}`}
            style={{ animationDelay: shape.delay }}
          />
        </div>
      ))}

      <div className="relative">
        <Logo href="/login" large />
      </div>

      {/* Slide teks */}
      <div className="relative max-w-md">
        <div className="grid">
          {SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <div
                key={i}
                aria-hidden={!active}
                className={`col-start-1 row-start-1 transition-all duration-700 ease-out ${
                  active
                    ? "translate-y-0 opacity-100"
                    : i < index
                    ? "pointer-events-none -translate-y-6 opacity-0"
                    : "pointer-events-none translate-y-6 opacity-0"
                }`}
              >
                <h1 className="text-4xl font-bold leading-tight text-slate-900">{slide.title}</h1>
                <p className="mt-3 text-slate-800">{slide.text}</p>
                <div
                  className={`mt-8 rounded-2xl bg-white/85 p-4 shadow-lg shadow-yellow-600/20 backdrop-blur transition-all delay-150 duration-700 ${
                    active ? "scale-100 opacity-100" : "scale-95 opacity-0"
                  }`}
                >
                  {slide.preview}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indikator slide: yang aktif memanjang dengan progres berjalan */}
        <div className="mt-8 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`relative h-2 overflow-hidden rounded-full transition-all duration-500 hover:transform-none ${
                i === index ? "w-10 bg-slate-900/20" : "w-2 bg-slate-900/25 hover:bg-slate-900/50"
              }`}
            >
              {i === index && (
                <span
                  key={index}
                  className="absolute inset-y-0 left-0 animate-progress rounded-full bg-slate-900"
                  style={{ animationDuration: `${SLIDE_MS}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="relative text-sm text-slate-800">Bootcamp EXERCISE FTUI 2026</p>
    </div>
  );
}
