"use client";

// Status login + semua data aplikasi (tugas, matkul, semester, matriks nilai)
// diambil di sini lalu dibagikan ke semua halaman lewat React Context.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { DEFAULT_GRADE_SCALE } from "@/lib/grades";
import { DEFAULT_REMINDERS, reminderLabel } from "@/lib/reminders";

const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData harus dipakai di dalam DataProvider");
  return ctx;
}

const EMPTY_MOODLE = {
  connected: false,
  mode: null,
  siteName: "",
  fullname: "",
  autoGrades: true,
  lastSync: null,
  syncing: false,
};

export default function DataProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  // undefined = sedang dicek, null = belum login, object = sudah login
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [gradeScale, setGradeScale] = useState(DEFAULT_GRADE_SCALE);
  const [reminderSettings, setReminderSettings] = useState(DEFAULT_REMINDERS);
  const [reminders, setReminders] = useState([]); // kartu pengingat di dalam aplikasi
  const reminderSeq = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [permission, setPermission] = useState("default");
  const [moodle, setMoodle] = useState(EMPTY_MOODLE);

  const coursesRef = useRef(courses);
  const timers = useRef({});

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  // Cek sesi login saat aplikasi dibuka
  useEffect(() => {
    axios
      .get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null));
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  // Belum login -> ke halaman login. Sudah login tapi buka /login -> ke dashboard
  useEffect(() => {
    if (user === null && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace("/");
  }, [user, pathname, router]);

  // Kalau sesi habis di tengah jalan (API membalas 401), kembali ke login
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 && !err.config?.url?.startsWith("/api/auth/")) {
          setUser(null);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Ambil semua data setiap kali user berganti (login / logout / ganti akun)
  useEffect(() => {
    if (!user) {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setTasks([]);
      setCourses([]);
      setSemesters([]);
      setGradeScale(DEFAULT_GRADE_SCALE);
      setReminderSettings(DEFAULT_REMINDERS);
      setReminders([]);
      setMoodle(EMPTY_MOODLE);
      setLoading(true);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const [t, c, s, set] = await Promise.all([
          axios.get("/api/tasks"),
          axios.get("/api/courses"),
          axios.get("/api/semesters"),
          axios.get("/api/settings"),
        ]);
        setTasks(t.data);
        setCourses(c.data);
        setSemesters(s.data);
        setGradeScale(set.data.gradeScale);
        setReminderSettings(set.data.reminders ?? DEFAULT_REMINDERS);

        const m = await axios.get("/api/moodle");
        setMoodle((prev) => ({ ...prev, ...m.data }));
        if (m.data.connected) syncMoodle({ silent: true });
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data. Pastikan server berjalan.");
      } finally {
        setLoading(false);
      }
    }
    load();
    }, [user?.id]);

  // Cek pengingat tiap 30 detik: muncul sebagai notifikasi Windows (kalau diizinkan)
  // dan selalu sebagai kartu pengingat di dalam aplikasi (Modul 4)
  useEffect(() => {
    if (!user) return;
    async function check() {
      setNow(new Date());
      try {
        const res = await axios.post("/api/tasks/reminders");
        if (res.data.length === 0) return;
        const granted = "Notification" in window && Notification.permission === "granted";

        for (const r of res.data) {
          const heading = r.offset === 0 ? "Deadline tiba" : `${reminderLabel(r.offset)} lagi`;
          if (granted) {
            const n = new Notification(heading, {
              body: r.title,
              tag: `task-${r.id}-${r.offset}`,
              requireInteraction: r.offset === 0,
            });
            n.onclick = () => {
              window.focus();
              if (r.url) window.open(r.url, "_blank", "noopener");
            };
          }
          reminderSeq.current += 1;
          const item = { key: reminderSeq.current, heading, title: r.title, url: r.url, offset: r.offset };
          setReminders((prev) => [...prev, item].slice(-4));
        }

        const hits = new Map(res.data.map((r) => [r.id, r.offset]));
        setTasks((prev) =>
          prev.map((t) => (hits.get(t.id) === 0 ? { ...t, notified: true } : t))
        );
      } catch (err) {
        console.error("Gagal cek pengingat:", err);
      }
    }
    check();
    const id = setInterval(check, 30 * 1000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Sinkron otomatis dari Moodle tiap 30 menit
  useEffect(() => {
    if (!moodle.connected) return;
    const id = setInterval(() => syncMoodle({ silent: true }), 30 * 60 * 1000);
    return () => clearInterval(id);
    }, [moodle.connected]);

  // Pembungkus request: hitung "sedang menyimpan" dan tangani error
  async function run(fn, message) {
    setSaving((n) => n + 1);
    try {
      return await fn();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error ?? message);
      return null;
    } finally {
      setSaving((n) => n - 1);
    }
  }

  // ---------- Akun ----------
  async function authRequest(url, data) {
    try {
      const res = await axios.post(url, data);
      setError("");
      setUser(res.data.user);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err.response?.data?.error ?? "Tidak bisa terhubung ke server.",
      };
    }
  }

  const login = (username, password) => authRequest("/api/auth/login", { username, password });
  const register = (data) => authRequest("/api/auth/register", data);

  async function logout() {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // tetap keluar walau server tidak membalas
    }
    setUser(null);
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      setError("Browser ini tidak mendukung notifikasi.");
      return;
    }
    setPermission(await Notification.requestPermission());
  }

  // ---------- Tugas ----------
  const addTask = (data) =>
    run(async () => {
      const res = await axios.post("/api/tasks", data);
      setTasks((prev) => [...prev, res.data]);
      return res.data;
    }, "Gagal menambah tugas.");

  const updateTask = (id, changes) =>
    run(async () => {
      const res = await axios.patch(`/api/tasks/${id}`, changes);
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      return res.data;
    }, "Gagal mengubah tugas.");

  const deleteTask = (id) =>
    run(async () => {
      await axios.delete(`/api/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return true;
    }, "Gagal menghapus tugas.");

  // ---------- Mata kuliah ----------
  const addCourse = (data) =>
    run(async () => {
      const res = await axios.post("/api/courses", data);
      setCourses((prev) => [...prev, res.data]);
      return res.data;
    }, "Gagal menambah mata kuliah.");

  // Perubahan langsung tampil, disimpan ke server 600 ms setelah berhenti mengetik
  function updateCourse(id, changes) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      const latest = coursesRef.current.find((c) => c.id === id);
      if (!latest) return;
      run(
        () => axios.patch(`/api/courses/${id}`, latest),
        "Gagal menyimpan nilai. Cek koneksi ke server."
      );
    }, 600);
  }

  const deleteCourse = (id) =>
    run(async () => {
      clearTimeout(timers.current[id]);
      await axios.delete(`/api/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setTasks((prev) => prev.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)));
      return true;
    }, "Gagal menghapus mata kuliah.");

  // ---------- Semester ----------
  const addSemester = (name) =>
    run(async () => {
      const res = await axios.post("/api/semesters", { name });
      setSemesters((prev) => [...prev, res.data]);
      return res.data;
    }, "Gagal menambah semester.");

  const updateSemester = (id, changes) =>
    run(async () => {
      const res = await axios.patch(`/api/semesters/${id}`, changes);
      setSemesters((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      return res.data;
    }, "Gagal mengubah semester.");

  const deleteSemester = (id) =>
    run(async () => {
      await axios.delete(`/api/semesters/${id}`);
      const removed = coursesRef.current.filter((c) => c.semesterId === id).map((c) => c.id);
      setSemesters((prev) => prev.filter((s) => s.id !== id));
      setCourses((prev) => prev.filter((c) => c.semesterId !== id));
      setTasks((prev) =>
        prev.map((t) => (removed.includes(t.courseId) ? { ...t, courseId: null } : t))
      );
      return true;
    }, "Gagal menghapus semester.");

  // ---------- Moodle ----------
  async function syncMoodle({ silent = false } = {}) {
    setMoodle((prev) => ({ ...prev, syncing: true }));
    try {
      const res = await axios.post("/api/moodle");
      await reloadTasksAndCourses();
      setMoodle((prev) => ({ ...prev, lastSync: res.data.lastSync }));
      return res.data;
    } catch (err) {
      console.error(err);
      if (!silent) setError(err.response?.data?.error ?? "Gagal sinkron dengan Moodle.");
      return null;
    } finally {
      setMoodle((prev) => ({ ...prev, syncing: false }));
    }
  }

  async function reloadTasksAndCourses() {
    const [t, c] = await Promise.all([axios.get("/api/tasks"), axios.get("/api/courses")]);
    setTasks(t.data);
    setCourses(c.data);
  }

  // payload: { mode: "login" | "token" | "ical" | null, ... } atau { autoGrades }
  const updateMoodle = (payload, message = "Gagal menghubungkan Moodle.") =>
    run(async () => {
      const res = await axios.put("/api/moodle", payload);
      setMoodle((prev) => ({ ...prev, ...res.data }));
      return res.data;
    }, message);

  const importMoodleCourses = () =>
    run(async () => {
      const res = await axios.post("/api/moodle", { action: "import-courses" });
      await reloadTasksAndCourses();
      return res.data;
    }, "Gagal mengimpor mata kuliah.");

  // ---------- Matriks nilai ----------
  const saveReminderSettings = (list) =>
    run(async () => {
      const res = await axios.patch("/api/settings", { reminders: list });
      setReminderSettings(res.data.reminders);
      return true;
    }, "Gagal menyimpan pengaturan pengingat.");

  const dismissReminder = (key) => setReminders((prev) => prev.filter((r) => r.key !== key));

  // ---------- Profil ----------
  const updateProfile = (name) =>
    run(async () => {
      const res = await axios.patch("/api/auth/me", { name });
      setUser(res.data.user);
      return true;
    }, "Gagal menyimpan profil.");

  async function changePassword(currentPassword, newPassword) {
    try {
      await axios.post("/api/auth/password", { currentPassword, newPassword });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error ?? "Gagal mengganti password." };
    }
  }

  const saveGradeScale = (scale) =>
    run(async () => {
      const res = await axios.patch("/api/settings", { gradeScale: scale });
      setGradeScale(res.data.gradeScale);
      return true;
    }, "Gagal menyimpan matriks nilai.");

  const value = {
    user,
    login,
    register,
    logout,
    tasks,
    courses,
    semesters,
    gradeScale,
    loading,
    error,
    setError,
    saving: saving > 0,
    now,
    permission,
    requestPermission,
    addTask,
    updateTask,
    deleteTask,
    addCourse,
    updateCourse,
    deleteCourse,
    addSemester,
    updateSemester,
    deleteSemester,
    saveGradeScale,
    reminderSettings,
    saveReminderSettings,
    reminders,
    dismissReminder,
    updateProfile,
    changePassword,
    moodle,
    syncMoodle,
    updateMoodle,
    importMoodleCourses,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
