// Helper tampilan yang dipakai di beberapa halaman

// Inisial mata kuliah untuk ikon, misal "Berpikir Komputasional" -> "BK"
const SKIP_WORDS = ["dan", "&", "-", "di", "ke", "untuk"];

export function courseInitials(name = "") {
  const words = name
    .split(/\s+/)
    .filter((w) => w && !SKIP_WORDS.includes(w.toLowerCase()) && /[a-z0-9]/i.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Palet warna kartu (kuning jadi warna utama)
export const CARD_COLORS = [
  { bg: "bg-yellow-100", art: "bg-yellow-300", btn: "bg-yellow-400 text-slate-900" },
  { bg: "bg-orange-100", art: "bg-orange-300", btn: "bg-orange-400 text-white" },
  { bg: "bg-sky-100", art: "bg-sky-300", btn: "bg-sky-500 text-white" },
  { bg: "bg-lime-100", art: "bg-lime-300", btn: "bg-lime-500 text-white" },
  { bg: "bg-rose-100", art: "bg-rose-300", btn: "bg-rose-400 text-white" },
];

export const ICON_COLORS = [
  "bg-yellow-100",
  "bg-orange-100",
  "bg-sky-100",
  "bg-lime-100",
  "bg-rose-100",
  "bg-violet-100",
  "bg-teal-100",
  "bg-amber-100",
];

export function gradeBadge(letter) {
  if (!letter) return "bg-slate-100 text-slate-400";
  if (letter.startsWith("A")) return "bg-emerald-100 text-emerald-700";
  if (letter.startsWith("B")) return "bg-sky-100 text-sky-700";
  if (letter.startsWith("C")) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function formatDue(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeLeft(iso, now) {
  const diff = new Date(iso) - now;
  if (diff < 0) return "Telat";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))} menit lagi`;
  if (hours < 24) return `${hours} jam lagi`;
  return `${Math.floor(hours / 24)} hari lagi`;
}

// Link tugas hanya boleh http/https
export function safeUrl(url) {
  try {
    const u = new URL(String(url ?? "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
