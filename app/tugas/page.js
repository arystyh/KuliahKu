"use client";

import { useState } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { latestSemester } from "@/lib/grades";
import { formatDue, safeUrl, timeLeft } from "@/lib/ui";
import { IconBell, IconExternal, IconPencil, IconRefresh, IconTrash } from "@/components/Icons";
import { Collapse, CountUp, EASE, Modal, PillTabs, Skeleton, stagger } from "@/components/Motion";

const PRIORITY_STYLE = {
  tinggi: "bg-red-100 text-red-700",
  sedang: "bg-yellow-100 text-yellow-800",
  rendah: "bg-emerald-100 text-emerald-700",
};

const FILTERS = ["Semua", "Hari ini", "Minggu ini", "Telat", "Selesai"];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";

function matchFilter(task, filter, now) {
  const due = new Date(task.dueAt);
  if (filter === "Selesai") return task.done;
  if (task.done) return filter === "Semua";
  if (filter === "Telat") return due < now;
  if (filter === "Hari ini") return due.toDateString() === now.toDateString();
  if (filter === "Minggu ini") return due >= now && due - now <= 7 * 24 * 60 * 60 * 1000;
  return true;
}

// ISO -> nilai untuk <input type="date"> dan <input type="time"> (waktu lokal)
function splitDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Isian tugas yang dipakai bersama oleh form tambah & modal edit
function TaskFields({ values, onChange, courses }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value });
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Contoh: Laporan Praktikum Fisika Dasar"
        value={values.title}
        onChange={set("title")}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input type="date" value={values.date} onChange={set("date")} className={inputClass} />
        <input type="time" value={values.time} onChange={set("time")} className={inputClass} />
        <select value={values.courseId} onChange={set("courseId")} className={inputClass}>
          <option value="">Tanpa matkul</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={values.priority} onChange={set("priority")} className={inputClass}>
          <option value="tinggi">Prioritas tinggi</option>
          <option value="sedang">Prioritas sedang</option>
          <option value="rendah">Prioritas rendah</option>
        </select>
      </div>
      <input
        type="url"
        placeholder="Link tugas (opsional), misal halaman Moodle atau Google Drive"
        value={values.url}
        onChange={set("url")}
        className={inputClass}
      />
    </div>
  );
}

const EMPTY_FORM = { title: "", date: "", time: "", courseId: "", priority: "sedang", url: "" };

function validate(values) {
  if (!values.title.trim() || !values.date || !values.time) return "Judul, tanggal, dan jam wajib diisi.";
  if (values.url.trim() && !safeUrl(values.url)) return "Link harus diawali http:// atau https://";
  return null;
}

function toPayload(values) {
  return {
    title: values.title.trim(),
    dueAt: new Date(`${values.date}T${values.time}`).toISOString(),
    courseId: values.courseId ? Number(values.courseId) : null,
    priority: values.priority,
    url: values.url.trim() || null,
  };
}

export default function TasksPage() {
  const {
    tasks,
    courses,
    semesters,
    now,
    loading,
    setError,
    permission,
    requestPermission,
    addTask,
    updateTask,
    deleteTask,
    moodle,
    syncMoodle,
  } = useData();

  const [filter, setFilter] = useState("Semua");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // tugas yang sedang diedit
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Pilihan matkul: semester terbaru, plus matkul tugas yang sedang diedit
  const current = latestSemester(semesters);
  const courseOptions = current ? courses.filter((c) => c.semesterId === current.id) : courses;
  const editCourseOptions =
    editing?.courseId && !courseOptions.some((c) => c.id === editing.courseId)
      ? [...courseOptions, ...courses.filter((c) => c.id === editing.courseId)]
      : courseOptions;
  const courseName = (id) => courses.find((c) => c.id === id)?.name;

  async function handleAdd(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    const created = await addTask(toPayload(form));
    setSaving(false);
    if (created) setForm({ ...EMPTY_FORM, courseId: form.courseId, priority: form.priority });
  }

  function openEdit(task) {
    const { date, time } = splitDateTime(task.dueAt);
    setEditForm({
      title: task.title,
      date,
      time,
      courseId: task.courseId ? String(task.courseId) : "",
      priority: task.priority,
      url: task.url ?? "",
    });
    setEditing(task);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    const problem = validate(editForm);
    if (problem) {
      setError(problem);
      return;
    }
    setEditSaving(true);
    const updated = await updateTask(editing.id, toPayload(editForm));
    setEditSaving(false);
    if (updated) setEditing(null);
  }

  // Animasi menghilang dulu, baru dihapus
  function handleDelete(task) {
    if (!confirm(`Hapus tugas "${task.title}"?`)) return;
    setRemoving((prev) => new Set(prev).add(task.id));
    setTimeout(async () => {
      await deleteTask(task.id);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }, 350);
  }

  const active = tasks.filter((t) => !t.done);
  const stats = [
    { label: "Aktif", value: active.length, style: "bg-yellow-400" },
    { label: "Hari ini", value: active.filter((t) => matchFilter(t, "Hari ini", now)).length, style: "bg-orange-200" },
    { label: "Telat", value: active.filter((t) => new Date(t.dueAt) < now).length, style: "bg-red-200" },
    { label: "Selesai", value: tasks.length - active.length, style: "bg-emerald-200" },
  ];

  const visible = tasks
    .filter((t) => matchFilter(t, filter, now))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.dueAt) - new Date(b.dueAt);
    });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Tugas</h1>
        <div className="flex flex-wrap gap-2">
          {moodle.connected ? (
            <button
              onClick={() => syncMoodle()}
              disabled={moodle.syncing}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-yellow-50 disabled:opacity-60"
            >
              <IconRefresh className={`h-4 w-4 ${moodle.syncing ? "animate-spin" : ""}`} />
              {moodle.syncing ? "Menyinkron..." : "Sinkron Moodle"}
            </button>
          ) : (
            <Link
              href="/pengaturan"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-yellow-50"
            >
              Hubungkan Moodle
            </Link>
          )}
          {permission !== "granted" && (
            <button
              onClick={requestPermission}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-yellow-50"
            >
              <IconBell /> Aktifkan notifikasi
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`animate-fade-up rounded-2xl p-4 ${s.style}`} style={stagger(i, 60)}>
            <p className="text-sm text-slate-700">{s.label}</p>
            <p className="text-3xl font-bold tabular-nums">
              <CountUp value={s.value} duration={600} />
            </p>
          </div>
        ))}
      </section>

      <form
        onSubmit={handleAdd}
        className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm"
        style={stagger(4, 60)}
      >
        <h2 className="font-semibold">Tambah tugas</h2>
        <TaskFields values={form} onChange={setForm} courses={courseOptions} />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 py-2.5 font-semibold text-slate-900 hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/20 border-t-slate-900" />
          )}
          {saving ? "Menyimpan..." : "Tambah tugas"}
        </button>
      </form>

      <PillTabs
        items={FILTERS.map((f) => ({ value: f, label: f }))}
        value={filter}
        onChange={setFilter}
        className="flex flex-wrap gap-2"
        indicatorClassName="rounded-full bg-slate-900 shadow-md"
        itemClassName={(isActive) =>
          `rounded-full px-4 py-1.5 text-sm font-medium ${
            isActive ? "text-yellow-300" : "bg-white text-slate-600 shadow-sm hover:bg-yellow-50"
          }`
        }
      />

      <section key={filter} className="flex flex-col">
        {loading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-20" />)}

        {!loading && visible.length === 0 && (
          <div className="animate-fade-up rounded-2xl border-2 border-dashed border-yellow-200 bg-white/60 p-8 text-center text-slate-500">
            {tasks.length === 0
              ? "Belum ada tugas. Tambahkan tugas pertamamu di atas."
              : "Tidak ada tugas di kategori ini."}
          </div>
        )}

        {!loading &&
          visible.map((task, i) => {
            const late = !task.done && new Date(task.dueAt) < now;
            const leaving = removing.has(task.id);
            return (
              <Collapse key={task.id} open={!leaving}>
                <div className="pb-2">
                  <div
                    className={`group flex animate-fade-up items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-[box-shadow,translate,opacity,scale] duration-300 ${EASE} hover:-translate-y-0.5 hover:shadow-md ${
                      late ? "ring-2 ring-red-200" : ""
                    } ${task.done ? "opacity-60" : ""} ${leaving ? "scale-95" : ""}`}
                    style={stagger(i, 40, 400)}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => updateTask(task.id, { done: !task.done })}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-yellow-500"
                      aria-label={task.done ? "Tandai belum selesai" : "Tandai selesai"}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p
                        className={`truncate font-medium transition-colors duration-300 ${
                          task.done ? "text-slate-400 line-through" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatDue(task.dueAt)}</span>
                        {!task.done && (
                          <span className={late ? "font-semibold text-red-600" : "font-medium text-orange-600"}>
                            · {timeLeft(task.dueAt, now)}
                          </span>
                        )}
                        {courseName(task.courseId) && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                            {courseName(task.courseId)}
                          </span>
                        )}
                        <span className={`rounded-md px-1.5 py-0.5 ${PRIORITY_STYLE[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.source === "moodle" && (
                          <span className="rounded-md bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700">
                            Moodle
                          </span>
                        )}
                      </div>
                    </div>

                    {task.url && (
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-yellow-300"
                        title={task.source === "moodle" ? "Buka di Moodle" : "Buka link tugas"}
                      >
                        <IconExternal className="h-4 w-4" />
                        <span className="hidden sm:inline">{task.source === "moodle" ? "Buka di Moodle" : "Buka"}</span>
                      </a>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-yellow-50 hover:text-slate-800"
                        aria-label="Edit tugas"
                        title="Edit"
                      >
                        <IconPencil />
                      </button>
                      <button
                        onClick={() => handleDelete(task)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Hapus tugas"
                        title="Hapus"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </Collapse>
            );
          })}
      </section>

      <p className="text-center text-xs text-slate-400">
        Pengingat muncul selama tab KuliahKu tetap terbuka. Atur waktunya di Pengaturan.
      </p>

      {/* Modal edit tugas */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit tugas" maxWidth="max-w-2xl">
        {editing && (
          <form onSubmit={handleEditSave} className="flex flex-col gap-4">
            <TaskFields values={editForm} onChange={setEditForm} courses={editCourseOptions} />
            {editing.source === "moodle" && (
              <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
                Tugas ini dari Moodle. Judul dan deadline yang kamu ubah tidak akan ditimpa saat sinkron.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:opacity-50"
              >
                {editSaving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/20 border-t-slate-900" />
                )}
                Simpan perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
