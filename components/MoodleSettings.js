"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { IconRefresh } from "@/components/Icons";
import { formatDue } from "@/lib/ui";
import { Collapse, PillTabs } from "@/components/Motion";

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";
const primary =
  "flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-50";

const METHODS = [
  ["login", "Login akun"],
  ["token", "Tempel token"],
  ["ical", "Link kalender"],
];

function describeResult(r) {
  const parts = [`${r.found} deadline ditemukan`, `${r.added} tugas baru`, `${r.updated} diperbarui`];
  if (r.completed) parts.push(`${r.completed} ditandai sudah dikumpulkan`);
  if (r.grades?.components) parts.push(`${r.grades.components} komponen nilai terisi`);
  return parts.join(", ") + ".";
}

export default function MoodleSettings() {
  const { moodle, syncMoodle, updateMoodle, importMoodleCourses, setError } = useData();
  const [method, setMethod] = useState("login");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");

  async function handleConnect(e) {
    e.preventDefault();
    let payload;
    if (method === "login") {
      if (!baseUrl.trim() || !username.trim() || !password) {
        setError("Alamat Moodle, username, dan password wajib diisi.");
        return;
      }
      payload = { mode: "login", baseUrl, username: username.trim(), password };
    } else if (method === "token") {
      if (!baseUrl.trim() || !token.trim()) {
        setError("Alamat Moodle dan token wajib diisi.");
        return;
      }
      payload = { mode: "token", baseUrl, token };
    } else {
      if (!calendarUrl.trim()) {
        setError("Tempel link ekspor kalender Moodle dulu.");
        return;
      }
      payload = { mode: "ical", url: calendarUrl.trim() };
    }

    setBusy(true);
    const status = await updateMoodle(payload);
    setPassword(""); // password tidak disimpan di mana pun
    if (status) {
      setToken("");
      setCalendarUrl("");
      const r = await syncMoodle();
      if (r) setResult({ text: describeResult(r), warnings: r.warnings ?? [] });
    }
    setBusy(false);
  }

  async function handleSync() {
    const r = await syncMoodle();
    if (r) setResult({ text: describeResult(r), warnings: r.warnings ?? [] });
  }

  async function handleImport() {
    setBusy(true);
    const r = await importMoodleCourses();
    setBusy(false);
    if (r) {
      setResult({
        text: `${r.imported} mata kuliah diimpor ke ${r.semester}, ${r.linked} sudah terhubung sebelumnya. Cek lagi jumlah SKS-nya.`,
        warnings: [],
      });
    }
  }

  function handleDisconnect() {
    if (confirm("Putuskan koneksi Moodle? Tugas dan nilai yang sudah diimpor tetap ada.")) {
      updateMoodle({ mode: null });
      setResult(null);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Koneksi Moodle</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            moodle.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {moodle.connected ? "Terhubung" : "Belum terhubung"}
        </span>
      </div>

      {moodle.connected ? (
        <div key="connected" className="flex animate-fade-in flex-col gap-4">
          <p className="text-sm text-slate-600">
            {moodle.mode === "token" ? (
              <>
                Masuk sebagai <b>{moodle.fullname}</b>
                {moodle.siteName && <> di {moodle.siteName}</>}. Deadline, status pengumpulan,
                dan nilai disinkron otomatis tiap 30 menit selama aplikasi terbuka.
              </>
            ) : (
              <>Terhubung lewat link kalender. Hanya deadline yang disinkron.</>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleSync} disabled={moodle.syncing || busy} className={primary}>
              <IconRefresh className={`h-4 w-4 ${moodle.syncing ? "animate-spin" : ""}`} />
              {moodle.syncing ? "Menyinkron..." : "Sinkronkan sekarang"}
            </button>
            {moodle.mode === "token" && (
              <button
                onClick={handleImport}
                disabled={busy}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-yellow-50 disabled:opacity-50"
              >
                Impor mata kuliah
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Putuskan
            </button>
          </div>

          {moodle.mode === "token" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-yellow-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={moodle.autoGrades}
                onChange={(e) =>
                  updateMoodle({ autoGrades: e.target.checked }, "Gagal mengubah pengaturan.")
                }
                className="mt-0.5 h-4 w-4 accent-yellow-500"
              />
              <span>
                <b>Isi nilai otomatis dari Moodle.</b> Nilai yang sudah dirilis dosen dimasukkan ke
                komponen yang namanya cocok (Kuis, Tugas, UTS, UAS). Nilai yang kamu isi sendiri tidak
                akan ditimpa.
              </span>
            </label>
          )}

          <p className="text-xs text-slate-500">
            {moodle.lastSync ? `Terakhir sinkron: ${formatDue(moodle.lastSync)}` : "Belum pernah sinkron"}
          </p>
        </div>
      ) : (
        <div key="disconnected" className="flex animate-fade-in flex-col gap-4">
          <p className="text-xs text-slate-500">
            Ambil deadline tugas & kuis, status pengumpulan, dan nilai langsung dari Moodle.
          </p>

          <PillTabs
            items={METHODS.map(([value, label]) => ({ value, label }))}
            value={method}
            onChange={setMethod}
            className="flex rounded-xl bg-yellow-50 p-1 text-sm"
            indicatorClassName="rounded-lg bg-yellow-400 shadow-sm"
            itemClassName={(isActive) =>
              `flex-1 rounded-lg py-1.5 font-medium ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`
            }
          />

          <form key={method} onSubmit={handleConnect} className="flex animate-fade-in flex-col gap-3">
            {method !== "ical" && (
              <input
                type="url"
                placeholder="Alamat Moodle, misal https://moodle.kampus.ac.id"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className={input}
              />
            )}

            {method === "login" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Username Moodle"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={input}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={input}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Password hanya dipakai sekali untuk meminta token ke Moodle dan tidak disimpan.
                  Yang disimpan hanya token, di data/moodle.json (tidak ikut ke GitHub).
                </p>
              </>
            )}

            {method === "token" && (
              <>
                <input
                  placeholder="Token Moodle mobile web service"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={input}
                />
                <p className="text-xs text-slate-400">
                  Token bisa dilihat di Moodle: foto profil → Preferences → Security keys, baris
                  &quot;Moodle mobile web service&quot;.
                </p>
              </>
            )}

            {method === "ical" && (
              <>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    Buka halaman <b>Kalender</b> di Moodle, klik <b>Export calendar</b>.
                  </li>
                  <li>
                    Pilih <b>All courses</b> dan <b>Recent and next 60 days</b>.
                  </li>
                  <li>
                    Klik <b>Get calendar URL</b>, salin, lalu tempel di bawah.
                  </li>
                </ol>
                <input
                  type="url"
                  placeholder="https://.../calendar/export_execute.php?userid=...&authtoken=..."
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  className={input}
                />
                <p className="text-xs text-slate-400">Cara ini hanya mengambil deadline, tanpa nilai.</p>
              </>
            )}

            <button type="submit" disabled={busy || moodle.syncing} className={`${primary} self-start`}>
              {busy ? "Menghubungkan..." : "Hubungkan"}
            </button>
          </form>
        </div>
      )}

      <Collapse open={Boolean(result)}>
        {result && (
          <div key={result.text} className="mt-4 animate-fade-in rounded-xl bg-yellow-50 px-3 py-2 text-sm">
            <p>{result.text}</p>
            {result.warnings.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-orange-700">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Collapse>
    </section>
  );
}
