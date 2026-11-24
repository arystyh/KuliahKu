"use client";

// Komponen animasi yang dipakai di banyak halaman
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconX } from "@/components/Icons";

export const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------- Penanda yang bergeser ke item aktif (tab, menu sidebar) ----------
export function useSlidingIndicator(activeKey) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [box, setBox] = useState(null);
  const [ready, setReady] = useState(false);

  useIsoLayoutEffect(() => {
    function update() {
      const el = itemRefs.current[activeKey];
      if (!el) {
        setBox(null);
        return;
      }
      setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    }
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    Object.values(itemRefs.current).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [activeKey]);

  // Posisi pertama dipasang tanpa animasi supaya tidak "meluncur dari pojok"
  useEffect(() => {
    if (box && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [box, ready]);

  return {
    containerRef,
    register: (key) => (el) => {
      itemRefs.current[key] = el;
    },
    indicatorStyle: box
      ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h, opacity: 1 }
      : { opacity: 0 },
    indicatorClass: ready ? `transition-[transform,width,height,opacity] duration-500 ${EASE}` : "",
  };
}

// Tab dengan penanda yang bergeser.
// items: [{ value, label }]
export function PillTabs({
  items,
  value,
  onChange,
  className = "",
  itemClassName = () => "",
  indicatorClassName = "rounded-full bg-slate-900",
  children,
}) {
  const { containerRef, register, indicatorStyle, indicatorClass } = useSlidingIndicator(value);
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 ${indicatorClassName} ${indicatorClass}`}
        style={indicatorStyle}
      />
      {items.map((item) => (
        <button
          key={item.value}
          ref={register(item.value)}
          type="button"
          onClick={() => onChange(item.value)}
          className={`relative z-10 transition-colors duration-300 hover:transform-none ${itemClassName(
            item.value === value
          )}`}
        >
          {item.label}
        </button>
      ))}
      {children}
    </div>
  );
}

// ---------- Buka-tutup tinggi elemen dengan mulus ----------
export function Collapse({ open, children, className = "" }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-500 ${EASE} ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

// ---------- Angka yang naik/turun dengan halus ----------
export function CountUp({ value, decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (value === null || value === undefined) return;
    if (prefersReducedMotion()) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (value - from) * eased;
      current.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value === null || value === undefined) return "–";
  return display.toFixed(decimals);
}

// ---------- Nilai yang berubah dari 0 ke target setelah muncul (untuk bar & ring) ----------
export function useMountedValue(value) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted ? value : 0;
}

// ---------- Modal dengan animasi masuk & keluar ----------
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto ${maxWidth} rounded-2xl bg-white p-6 shadow-2xl transition-[opacity,scale,translate] duration-300 ${EASE} ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Placeholder saat memuat ----------
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-yellow-100/80 ${className}`} />;
}

// Delay bertahap untuk animasi masuk berurutan
export function stagger(index, step = 50, max = 600) {
  return { animationDelay: `${Math.min(index * step, max)}ms` };
}
