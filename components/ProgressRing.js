"use client";

import { useMountedValue } from "@/components/Motion";

// Lingkaran progress (seperti "Homework progress" di referensi desain).
// Saat pertama muncul, lingkaran terisi dari 0 ke nilainya.
export default function ProgressRing({ percent, size = 42, stroke = 4, className = "" }) {
  const target = Math.min(100, Math.max(0, percent || 0));
  const value = useMountedValue(target);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold">{Math.round(target)}%</span>
    </div>
  );
}
