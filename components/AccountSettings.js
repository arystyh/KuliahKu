"use client";

import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Collapse } from "@/components/Motion";
import { IconCheck } from "@/components/Icons";

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";
const primary =
  "flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-50";

function SavedBadge({ show, text = "Tersimpan" }) {
  return (
    <span
      className={`flex items-center gap-1 text-sm text-emerald-600 transition-[opacity,translate] duration-300 ${
        show ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
      }`}
      aria-hidden={!show}
    >
      <IconCheck className="h-4 w-4" /> {text}
    </span>
  );
}

export default function AccountSettings() {
  const { user, updateProfile, changePassword } = useData();

  // ---------- Profil ----------
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  useEffect(() => setName(user?.name ?? ""), [user?.name]);

  async function handleName(e) {
    e.preventDefault();
    setSavingName(true);
    const ok = await updateProfile(name.trim());
    setSavingName(false);
    if (ok) {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    }
  }

  // ---------- Password ----------
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  async function handlePassword(e) {
    e.preventDefault();
    setPwError("");
    if (!current || !next) return setPwError("Isi password lama dan password baru.");
    if (next.length < 8) return setPwError("Password baru minimal 8 karakter.");
    if (next !== confirm) return setPwError("Konfirmasi password baru tidak sama.");

    setPwSaving(true);
    const result = await changePassword(current, next);
    setPwSaving(false);
    if (!result.ok) return setPwError(result.error);

    setCurrent("");
    setNext("");
    setConfirm("");
    setShowPasswordForm(false);
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 4000);
  }

  const nameChanged = name.trim() && name.trim() !== user?.name;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold">Akun</h2>
      <p className="mb-4 text-xs text-slate-500">
        Masuk sebagai <b>@{user?.username}</b>
      </p>

      <form onSubmit={handleName} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Nama
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={input} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!nameChanged || savingName} className={primary}>
            {savingName ? "Menyimpan..." : "Simpan nama"}
          </button>
          <SavedBadge show={nameSaved} />
        </div>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Password</p>
            <SavedBadge show={pwSaved} text="Password diganti. Perangkat lain sudah dikeluarkan." />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPasswordForm((v) => !v);
              setPwError("");
            }}
            className="rounded-xl px-3 py-1.5 text-sm font-medium ring-1 ring-slate-200 hover:bg-yellow-50"
          >
            {showPasswordForm ? "Batal" : "Ganti password"}
          </button>
        </div>

        <Collapse open={showPasswordForm}>
          <form onSubmit={handlePassword} className="flex flex-col gap-3 px-0.5 pb-0.5 pt-4">
            <input
              type="password"
              placeholder="Password lama"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={input}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                placeholder="Password baru (min. 8 karakter)"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={input}
              />
              <input
                type="password"
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={input}
              />
            </div>
            <Collapse open={Boolean(pwError)}>
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{pwError || " "}</p>
            </Collapse>
            <button type="submit" disabled={pwSaving} className={`${primary} self-start`}>
              {pwSaving ? "Menyimpan..." : "Simpan password baru"}
            </button>
          </form>
        </Collapse>
      </div>
    </section>
  );
}
