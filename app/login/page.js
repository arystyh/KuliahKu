"use client";

import { useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import Logo from "@/components/Logo";
import { IconEye, IconEyeOff } from "@/components/Icons";
import LoginShowcase from "@/components/LoginShowcase";


const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const HEADINGS = {
  masuk: { title: "Selamat datang", text: "Masuk untuk melanjutkan ke dashboard." },
  daftar: { title: "Buat akun", text: "Daftar untuk mulai mencatat tugas dan nilai." },
};

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100";

export default function LoginPage() {
  const { login, register } = useData();
  const [mode, setMode] = useState("masuk");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "daftar";

  // Simpan pesan error terakhir supaya teksnya tidak hilang duluan saat kotak error menutup
  const lastError = useRef("");
  if (error) lastError.current = error;

  function switchMode(next) {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    if (isRegister) {
      if (!name.trim()) {
        setError("Nama wajib diisi.");
        return;
      }
      if (password.length < 8) {
        setError("Password minimal 8 karakter.");
        return;
      }
      if (password !== confirm) {
        setError("Konfirmasi password tidak sama.");
        return;
      }
    }

    setLoading(true);
    const result = isRegister
      ? await register({ name: name.trim(), username: username.trim(), password })
      : await login(username.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <LoginShowcase />

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo href="/login" large />
          </div>

          {/* Judul: kedua versi ditumpuk lalu di-crossfade, jadi tidak ada lompatan */}
          <div className="grid">
            {Object.entries(HEADINGS).map(([key, h]) => (
              <div
                key={key}
                aria-hidden={key !== mode}
                className={`col-start-1 row-start-1 transition-[opacity,translate] duration-500 ${EASE} ${
                  key === mode ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
                }`}
              >
                <h2 className="text-3xl font-bold">{h.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{h.text}</p>
              </div>
            ))}
          </div>

          {/* Tab Masuk / Daftar: penanda digeser pakai transform (lebih ringan daripada left) */}
          <div className="relative mt-6 grid grid-cols-2 rounded-xl bg-yellow-100 p-1 text-sm font-semibold">
            <span
              className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-500 will-change-transform ${EASE} ${
                isRegister ? "translate-x-full" : "translate-x-0"
              }`}
            />
            {[
              ["masuk", "Masuk"],
              ["daftar", "Daftar"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`relative z-10 rounded-lg py-2 transition-colors duration-300 hover:transform-none ${
                  mode === key ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form tidak dibuat ulang saat ganti tab; kolom tambahan dibuka-tutup dengan mulus */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
            <Collapse open={isRegister}>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nama lengkap
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Nama kamu"
                  className={input}
                />
              </label>
            </Collapse>

            <label className="mb-4 flex flex-col gap-1.5 text-sm font-medium">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoComplete="username"
                placeholder="misal: demas.r"
                className={input}
              />
            </label>

            <label className="mb-4 flex flex-col gap-1.5 text-sm font-medium">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "Minimal 8 karakter" : "Password"}
                  className={`${input} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:transform-none hover:bg-yellow-50 hover:text-slate-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>

            <Collapse open={isRegister}>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Ulangi password
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Ketik ulang password"
                  className={input}
                />
              </label>
            </Collapse>

            <Collapse open={Boolean(error)}>
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || lastError.current}</p>
            </Collapse>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-semibold text-slate-900 hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/20 border-t-slate-900" />
              )}
              {loading ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "masuk" : "daftar")}
              className="font-semibold text-orange-600 hover:underline"
            >
              {isRegister ? "Masuk" : "Daftar sekarang"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Buka-tutup tinggi elemen dengan mulus (trik grid-template-rows 0fr -> 1fr)
function Collapse({ open, children }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`-mx-1 grid transition-[grid-template-rows,opacity] duration-500 ${EASE} ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-1 pb-4 pt-1">{children}</div>
      </div>
    </div>
  );
}
