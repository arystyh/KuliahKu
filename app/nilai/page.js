"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import CourseCard from "@/components/CourseCard";
import { calcIPK, latestSemester, semesterStats } from "@/lib/grades";
import { ICON_COLORS } from "@/lib/ui";
import { CountUp, EASE, PillTabs, Skeleton, stagger, useMountedValue } from "@/components/Motion";

const inputClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";

export default function NilaiPage() {
  const {
    courses,
    semesters,
    gradeScale,
    loading,
    setError,
    addCourse,
    updateCourse,
    deleteCourse,
    addSemester,
    updateSemester,
    deleteSemester,
  } = useData();

  const [selectedId, setSelectedId] = useState(null);
  const [removing, setRemoving] = useState(() => new Set());
  const [newSemester, setNewSemester] = useState("");
  const [showSemesterForm, setShowSemesterForm] = useState(false);

  // Form matkul
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sks, setSks] = useState("3");
  const [className, setClassName] = useState("");
  const [mode, setMode] = useState("komponen");
  const [adding, setAdding] = useState(false);

  // Kalau belum memilih, tampilkan semester terbaru
  const selected =
    semesters.find((s) => s.id === selectedId) ?? latestSemester(semesters);
  const sorted = [...semesters].sort((a, b) => a.order - b.order);
  const semCourses = selected ? courses.filter((c) => c.semesterId === selected.id) : [];

  const ipk = calcIPK(courses, gradeScale);
  const ip = calcIPK(semCourses, gradeScale);
  const history = semesterStats(semesters, courses, gradeScale);

  async function handleAddSemester(e) {
    e.preventDefault();
    if (!newSemester.trim()) return;
    const created = await addSemester(newSemester.trim());
    if (created) {
      setSelectedId(created.id);
      setNewSemester("");
      setShowSemesterForm(false);
    }
  }

  function handleRenameSemester() {
    const nameInput = prompt("Nama semester:", selected.name);
    if (nameInput && nameInput.trim()) updateSemester(selected.id, { name: nameInput.trim() });
  }

  function handleDeleteSemester() {
    if (
      confirm(
        `Hapus semester "${selected.name}" beserta ${semCourses.length} mata kuliahnya? Ini tidak bisa dibatalkan.`
      )
    ) {
      deleteSemester(selected.id);
      setSelectedId(null);
    }
  }

  async function handleAddCourse(e) {
    e.preventDefault();
    if (!selected) {
      setError("Buat semester dulu sebelum menambah mata kuliah.");
      return;
    }
    if (!name.trim()) {
      setError("Nama mata kuliah wajib diisi.");
      return;
    }
    setAdding(true);
    const created = await addCourse({
      semesterId: selected.id,
      code: code.trim(),
      name: name.trim(),
      className: className.trim(),
      sks: Number(sks),
      mode,
    });
    setAdding(false);
    if (created) {
      setCode("");
      setName("");
      setClassName("");
    }
  }

  // Kartu mengecil & memudar dulu, baru dihapus
  function handleDeleteCourse(course) {
    if (!confirm(`Hapus mata kuliah "${course.name}" beserta nilainya?`)) return;
    setRemoving((prev) => new Set(prev).add(course.id));
    setTimeout(async () => {
      await deleteCourse(course.id);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(course.id);
        return next;
      });
    }, 300);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="animate-fade-up text-3xl font-bold">Nilai & IPK</h1>

      {/* Ringkasan IPK + grafik IP per semester */}
      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div
          className="flex animate-fade-up flex-col justify-between gap-4 rounded-2xl bg-yellow-400 p-6"
          style={stagger(1, 80)}
        >
          <div>
            <p className="text-sm font-medium text-slate-800">IPK Kumulatif (realtime)</p>
            <p className="text-6xl font-bold tracking-tight tabular-nums">
              <CountUp value={ipk.ipk} decimals={2} />
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/60 p-3">
              <p className="text-xs text-slate-600">SKS dihitung</p>
              <p className="text-xl font-bold">
                {ipk.totalSks}
                <span className="text-sm font-normal text-slate-500">/{ipk.allSks}</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-3">
              <p className="text-xs text-slate-600">Matkul dinilai</p>
              <p className="text-xl font-bold">
                {ipk.counted}
                <span className="text-sm font-normal text-slate-500">/{ipk.total}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="animate-fade-up rounded-2xl bg-white p-6 shadow-sm" style={stagger(2, 80)}>
          <p className="mb-4 font-semibold">IP per Semester</p>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada semester.</p>
          ) : (
            <div className="flex h-44 items-end gap-4 overflow-x-auto">
              {history.map((h, i) => (
                <IpBar
                  key={h.semester.id}
                  ipk={h.ipk}
                  name={h.semester.name}
                  active={h.semester.id === selected?.id}
                  delay={i * 90}
                  onClick={() => setSelectedId(h.semester.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tab semester */}
      <PillTabs
        items={sorted.map((s) => ({ value: s.id, label: s.name }))}
        value={selected?.id}
        onChange={setSelectedId}
        className="flex flex-wrap items-center gap-2"
        indicatorClassName="rounded-full bg-slate-900 shadow-md"
        itemClassName={(isActive) =>
          `rounded-full px-4 py-1.5 text-sm font-medium ${
            isActive ? "text-yellow-300" : "bg-white text-slate-600 shadow-sm hover:bg-yellow-50"
          }`
        }
      >
        {showSemesterForm ? (
          <form onSubmit={handleAddSemester} className="flex animate-fade-in gap-2">
            <input
              autoFocus
              placeholder="misal: 2027/2028 Term 1"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              className={`${inputClass} py-1.5 text-sm`}
            />
            <button className="rounded-xl bg-yellow-400 px-3 text-sm font-semibold">Simpan</button>
            <button
              type="button"
              onClick={() => setShowSemesterForm(false)}
              className="px-2 text-sm text-slate-500"
            >
              Batal
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowSemesterForm(true)}
            className="rounded-full border-2 border-dashed border-yellow-300 px-4 py-1 text-sm font-medium text-slate-600 hover:bg-yellow-50"
          >
            + Semester
          </button>
        )}
      </PillTabs>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && !selected && (
        <div className="rounded-2xl border-2 border-dashed border-yellow-200 bg-white/60 p-8 text-center text-slate-500">
          Belum ada semester. Klik <b>+ Semester</b> untuk mulai.
        </div>
      )}

      {selected && (
        <div key={selected.id} className="flex animate-fade-up flex-col gap-6">
          {/* Info semester terpilih */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">IP {selected.name}</p>
              <p className="text-3xl font-bold tabular-nums">
                <CountUp value={ip.ipk} decimals={2} />
              </p>
              <p className="text-xs text-slate-500">
                {semCourses.length} mata kuliah · {ip.allSks} SKS
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={handleRenameSemester} className="rounded-lg px-3 py-1.5 hover:bg-yellow-50">
                Ganti nama
              </button>
              <button
                onClick={handleDeleteSemester}
                className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
              >
                Hapus semester
              </button>
            </div>
          </div>

          {/* Tambah matkul */}
          <form
            onSubmit={handleAddCourse}
            className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[8rem_1fr_7rem_10rem_10rem_auto]"
          >
            <input placeholder="Kode MK" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
            <input
              placeholder="Nama mata kuliah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <select value={sks} onChange={(e) => setSks(e.target.value)} className={inputClass}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} SKS
                </option>
              ))}
            </select>
            <input placeholder="Kelas" value={className} onChange={(e) => setClassName(e.target.value)} className={inputClass} />
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
              <option value="komponen">Per komponen</option>
              <option value="final">Nilai akhir saja</option>
            </select>
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50 disabled:opacity-50"
            >
              {adding ? "..." : "Tambah"}
            </button>
          </form>

          {semCourses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-yellow-200 bg-white/60 p-8 text-center text-slate-500">
              Semester ini belum punya mata kuliah. Untuk semester yang sudah lewat, pilih
              <b> Nilai akhir saja</b> lalu masukkan huruf mutu dari transkrip.
            </div>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {semCourses.map((course, i) => (
                <div
                  key={course.id}
                  className={`animate-fade-up transition-[opacity,scale] duration-300 ${EASE} ${
                    removing.has(course.id) ? "scale-95 opacity-0" : ""
                  }`}
                  style={stagger(i, 60)}
                >
                  <CourseCard
                    course={course}
                    gradeScale={gradeScale}
                    iconColor={ICON_COLORS[i % ICON_COLORS.length]}
                    onChange={(changes) => updateCourse(course.id, changes)}
                    onDelete={() => handleDeleteCourse(course)}
                  />
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Batang grafik IP yang tumbuh dari bawah saat pertama muncul
function IpBar({ ipk, name, active, delay, onClick }) {
  const height = useMountedValue(ipk === null ? 4 : Math.max(4, (ipk / 4) * 100));
  return (
    <button
      onClick={onClick}
      className="group flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-1 hover:transform-none"
    >
      <span className="text-sm font-bold tabular-nums">
        <CountUp value={ipk} decimals={2} />
      </span>
      <div
        className={`w-full max-w-14 rounded-t-xl transition-[height,background-color] duration-1000 ${EASE} ${
          active ? "bg-yellow-400" : "bg-yellow-200 group-hover:bg-yellow-300"
        }`}
        style={{ height: `${height}%`, transitionDelay: `${delay}ms, 0ms` }}
      />
      <span
        className={`line-clamp-1 text-center text-[11px] transition-colors ${
          active ? "font-semibold text-slate-800" : "text-slate-500"
        }`}
      >
        {name}
      </span>
    </button>
  );
}
