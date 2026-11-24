"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import Calendar from "@/components/Calendar";
import { CountUp, Skeleton, stagger } from "@/components/Motion";
import ProgressRing from "@/components/ProgressRing";
import { calcIPK, courseSummary, latestSemester, progressPercent } from "@/lib/grades";
import { CARD_COLORS, ICON_COLORS, courseInitials, gradeBadge, timeLeft } from "@/lib/ui";
import { IconAlert, IconBell, IconChevronRight, IconClock, IconExternal } from "@/components/Icons";

export default function DashboardPage() {
  const {
    user,
    courses,
    semesters,
    tasks,
    gradeScale,
    now,
    loading,
    permission,
    requestPermission,
  } = useData();
  const firstName = user?.name?.split(/\s+/)[0] ?? "";

  const current = latestSemester(semesters);
  const semCourses = current ? courses.filter((c) => c.semesterId === current.id) : [];
  const ipk = calcIPK(courses, gradeScale);
  const ip = calcIPK(semCourses, gradeScale);

  const upcoming = tasks
    .filter((t) => !t.done)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 4);

  const courseName = (id) => courses.find((c) => c.id === id)?.name;
  const today = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* ===== Kolom utama ===== */}
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex animate-fade-up flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-orange-600">Halo, {firstName}</p>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm capitalize text-slate-500">{today}</p>
          </div>
          {permission !== "granted" && (
            <button
              onClick={requestPermission}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-yellow-50"
            >
              <IconBell /> Aktifkan notifikasi
            </button>
          )}
        </header>

        {/* Kartu matkul semester ini */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">
              Semester Ini
              {current && <span className="ml-2 text-sm font-normal text-slate-500">{current.name}</span>}
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : semCourses.length === 0 ? (
            <EmptyCard text="Belum ada mata kuliah." href="/nilai" cta="Tambah matkul" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {semCourses.slice(0, 3).map((course, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                const s = courseSummary(course, gradeScale);
                return (
                  <div
                    key={course.id}
                    className={`flex animate-fade-up flex-col rounded-2xl p-3 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg ${color.bg}`}
                    style={stagger(i + 1, 80)}
                  >
                    <div
                      className={`flex h-28 items-center justify-center rounded-xl text-4xl font-bold tracking-tight text-slate-900/70 ${color.art}`}
                    >
                      {courseInitials(course.name)}
                    </div>
                    <div className="mt-3 px-1">
                      <p className="line-clamp-1 font-semibold">{course.name}</p>
                      <p className="text-xs text-slate-500">
                        {course.sks} SKS · {course.code || "Tanpa kode"}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between px-1">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-sm font-bold ${gradeBadge(s.grade?.letter)}`}
                      >
                        {s.grade?.letter ?? "–"}
                      </span>
                      <Link
                        href="/nilai"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.btn}`}
                        aria-label={`Lihat nilai ${course.name}`}
                      >
                        <IconChevronRight />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tabel matkul */}
        {semCourses.length > 0 && (
          <section className="animate-fade-up" style={stagger(4, 80)}>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-xl font-semibold">Mata Kuliah Saya</h2>
              <Link href="/nilai" className="text-sm font-medium text-orange-600 hover:underline">
                Lihat semua
              </Link>
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-3 py-2 font-medium">Mata kuliah</th>
                    <th className="px-3 py-2 font-medium">Kode</th>
                    <th className="px-3 py-2 text-center font-medium">SKS</th>
                    <th className="px-3 py-2 text-center font-medium">Progress nilai</th>
                    <th className="px-3 py-2 text-center font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {semCourses.map((course, i) => {
                    const s = courseSummary(course, gradeScale);
                    return (
                      <tr
                        key={course.id}
                        className="animate-fade-in border-t border-slate-50 transition-colors hover:bg-yellow-50/60"
                        style={stagger(i + 5, 40)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-700 ${
                                ICON_COLORS[i % ICON_COLORS.length]
                              }`}
                            >
                              {courseInitials(course.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{course.name}</p>
                              <p className="text-xs text-slate-400">{course.className}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{course.code}</td>
                        <td className="px-3 py-2.5 text-center">{course.sks}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center text-yellow-500">
                            <ProgressRing percent={progressPercent(course, gradeScale)} size={36} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block min-w-10 rounded-lg px-2 py-0.5 font-bold ${gradeBadge(
                              s.grade?.letter
                            )}`}
                          >
                            {s.grade?.letter ?? "–"}
                          </span>
                          {s.current !== null && (
                            <p className="mt-0.5 text-[11px] text-slate-400">{s.current.toFixed(1)}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ===== Panel kanan ===== */}
      <aside className="flex flex-col gap-6">
        {/* Kartu IPK */}
        <div className="animate-fade-up rounded-2xl bg-yellow-400 p-5 shadow-sm" style={stagger(1, 80)}>
          <p className="text-sm font-medium text-slate-800">IPK Kumulatif</p>
          <p className="text-5xl font-bold tracking-tight tabular-nums">
            <CountUp value={ipk.ipk} decimals={2} />
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {ipk.totalSks} SKS dari {semesters.length} semester
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/60 px-4 py-3">
            <div>
              <p className="text-xs text-slate-600">IP {current?.name ?? "semester ini"}</p>
              <p className="text-xl font-bold tabular-nums">
                <CountUp value={ip.ipk} decimals={2} />
              </p>
            </div>
            <Link
              href="/nilai"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-yellow-300"
            >
              Input nilai
            </Link>
          </div>
        </div>

        <div className="animate-fade-up rounded-2xl bg-white p-5 shadow-sm" style={stagger(2, 80)}>
          <Calendar tasks={tasks} now={now} />
        </div>

        {/* Deadline terdekat */}
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Deadline Terdekat</h2>
            <Link href="/tugas" className="text-sm font-medium text-orange-600 hover:underline">
              Semua
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.length === 0 && (
              <EmptyCard text="Belum ada tugas aktif." href="/tugas" cta="Tambah tugas" />
            )}
            {upcoming.map((task, i) => {
              const late = new Date(task.dueAt) < now;
              const dark = i === 0;
              return (
                <div
                  key={task.id}
                  style={stagger(i + 3, 60)}
                  className={`flex animate-fade-up items-center gap-3 rounded-2xl p-4 shadow-sm transition-[translate,box-shadow] duration-300 hover:translate-x-1 hover:shadow-md ${
                    dark ? "bg-slate-900 text-white" : "bg-white"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      late
                        ? "bg-red-100 text-red-600"
                        : dark
                        ? "bg-yellow-400 text-slate-900"
                        : "bg-yellow-100 text-slate-700"
                    }`}
                  >
                    {late ? <IconAlert className="h-5 w-5" /> : <IconClock className="h-5 w-5" />}
                  </span>
                  <Link href="/tugas" className="min-w-0 flex-1 hover:transform-none">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p
                      className={`truncate text-xs ${
                        late ? "text-red-400" : dark ? "text-yellow-200" : "text-slate-500"
                      }`}
                    >
                      {timeLeft(task.dueAt, now)}
                      {courseName(task.courseId) && ` · ${courseName(task.courseId)}`}
                    </p>
                  </Link>
                  {task.url ? (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Buka halaman tugas"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        dark ? "bg-yellow-400 text-slate-900" : "bg-yellow-100 text-slate-700 hover:bg-yellow-300"
                      }`}
                    >
                      <IconExternal className="h-4 w-4" />
                    </a>
                  ) : (
                    <IconChevronRight
                      className={`h-4 w-4 ${dark ? "text-yellow-300" : "text-slate-400"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function EmptyCard({ text, href, cta }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-yellow-200 bg-white/60 p-6 text-center text-sm text-slate-500">
      {text}
      <Link
        href={href}
        className="rounded-lg bg-yellow-400 px-3 py-1.5 font-medium text-slate-900 hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-300/50"
      >
        {cta}
      </Link>
    </div>
  );
}
