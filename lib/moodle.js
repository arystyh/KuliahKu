// Sinkronisasi dengan Moodle. Ada dua cara koneksi:
//  - "token": login akun Moodle (Web Service API). Bisa ambil tugas, kuis, status
//             pengumpulan, nilai, dan daftar mata kuliah.
//  - "ical":  link ekspor kalender. Hanya deadline.
// Konfigurasi disimpan per user di data/users/<id>/moodle.json (tidak ikut ke GitHub)
// karena berisi token pribadi. Password TIDAK pernah disimpan.
import { promises as fs } from "fs";
import path from "path";
import { parseICS } from "./ical";
import { readDB, writeDB, newId, userDir } from "./db";
import { callWs, getToken, mapLimit, normalizeBaseUrl } from "./moodleApi";
import { DEFAULT_COMPONENTS, latestSemester } from "./grades";
import { safeUrl } from "./ui";

const configPath = (userId) => path.join(userDir(userId), "moodle.json");
const DAY = 24 * 60 * 60 * 1000;

export const EMPTY_CONFIG = {
  mode: null,
  url: "",
  baseUrl: "",
  token: "",
  userid: null,
  siteName: "",
  fullname: "",
  autoGrades: true,
  lastSync: null,
};

// ---------------- Konfigurasi ----------------

export async function readMoodleConfig(userId) {
  try {
    const config = { ...EMPTY_CONFIG, ...JSON.parse(await fs.readFile(configPath(userId), "utf8")) };
    if (!config.mode && config.url) config.mode = "ical"; // data versi lama
    return config;
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function writeMoodleConfig(userId, config) {
  await fs.mkdir(userDir(userId), { recursive: true });
  await fs.writeFile(configPath(userId), JSON.stringify({ ...EMPTY_CONFIG, ...config }, null, 2));
}

// Info yang aman dikirim ke browser (tanpa token / link)
export function publicStatus(config) {
  return {
    connected: Boolean(config.mode),
    mode: config.mode,
    siteName: config.siteName,
    fullname: config.fullname,
    autoGrades: config.autoGrades,
    lastSync: config.lastSync,
  };
}

export function isValidMoodleUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function connectWithToken(userId, { baseUrl, token }) {
  const base = normalizeBaseUrl(baseUrl);
  if (!String(token ?? "").trim()) throw new Error("Token wajib diisi.");
  let info;
  try {
    info = await callWs(base, token.trim(), "core_webservice_get_site_info");
  } catch (err) {
    if (/kedaluwarsa/.test(err.message)) throw new Error("Token tidak valid.");
    throw err;
  }
  if (!info?.userid) throw new Error("Token tidak valid.");

  const previous = await readMoodleConfig(userId);
  const config = {
    ...previous,
    mode: "token",
    baseUrl: base,
    token: token.trim(),
    userid: info.userid,
    siteName: info.sitename ?? "",
    fullname: info.fullname ?? "",
    lastSync: null,
  };
  await writeMoodleConfig(userId, config);
  return publicStatus(config);
}

export async function connectWithLogin(userId, { baseUrl, username, password }) {
  if (!username || !password) throw new Error("Username dan password wajib diisi.");
  const base = normalizeBaseUrl(baseUrl);
  const token = await getToken(base, username, password);
  return connectWithToken(userId, { baseUrl: base, token });
}

// ---------------- Pencocokan ----------------

const CODE_RE = /[A-Z]{4}\d{6}/;
const OPEN_EVENT = /\b(opens|dibuka|is open)\s*$/i;
const DUE_SUFFIX = /\s*(is due|due|closes|ditutup|jatuh tempo|harus diserahkan|batas waktu)\s*$/i;

export function extractCode(...texts) {
  for (const t of texts) {
    const m = String(t ?? "").toUpperCase().match(CODE_RE);
    if (m) return m[0];
  }
  return "";
}

export function cleanTitle(summary) {
  return summary.replace(DUE_SUFFIX, "").trim() || summary;
}

function cleanCourseName(fullname) {
  return (
    String(fullname ?? "")
      .replace(CODE_RE, "")
      .replace(/^[\s\-–:|]+|[\s\-–:|]+$/g, "")
      .trim() || fullname
  );
}

// Untuk mode kalender: cocokkan event ke matkul lewat kode MK atau nama
export function matchCourse(event, courses) {
  const haystack = `${event.categories} ${event.summary} ${event.description}`.toLowerCase();
  const byCode = courses.find((c) => c.code && haystack.includes(c.code.toLowerCase()));
  if (byCode) return byCode.id;
  const byName = courses.find((c) => c.name && haystack.includes(c.name.toLowerCase()));
  return byName ? byName.id : null;
}

// Hubungkan matkul lokal dengan matkul Moodle (kode MK dulu, baru nama)
export function linkCourses(db, moodleCourses) {
  const links = new Map(); // moodleId -> id matkul lokal
  for (const local of db.courses) if (local.moodleId) links.set(local.moodleId, local.id);

  const hay = (mc) => `${mc.shortname ?? ""} ${mc.fullname ?? ""} ${mc.idnumber ?? ""}`.toLowerCase();
  const rules = [
    (local, mc) => local.code && hay(mc).includes(local.code.toLowerCase()),
    (local, mc) => local.name && hay(mc).includes(local.name.toLowerCase()),
  ];

  for (const rule of rules) {
    for (const mc of moodleCourses) {
      if (links.has(mc.id)) continue;
      const local = db.courses.find((c) => !c.moodleId && rule(c, mc));
      if (local) {
        local.moodleId = mc.id;
        links.set(mc.id, local.id);
      }
    }
  }
  return links;
}

function isCurrentCourse(mc, now) {
  if (mc.hidden) return false;
  if (mc.enddate && mc.enddate * 1000 < now.getTime() - 30 * DAY) return false;
  return true;
}

// Nama komponen lokal -> kata kunci item nilai di Moodle
const SYNONYMS = [
  ["kuis", "quiz"],
  ["tugas", "assignment", "homework", "pr"],
  ["uts", "midterm", "ujian tengah"],
  ["uas", "final", "ujian akhir"],
  ["praktikum", "lab"],
  ["proyek", "project"],
  ["presentasi", "presentation"],
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function componentMatches(componentName, itemName) {
  const comp = componentName.toLowerCase();
  const terms = SYNONYMS.find((group) => group.some((t) => comp.includes(t))) ?? [comp.trim()];
  const item = itemName.toLowerCase();
  return terms.some((t) => t && new RegExp(`\\b${escapeRegex(t)}`).test(item));
}

// ---------------- Penggabungan tugas ----------------

// items: [{ uid, title, due: Date, courseId, submitted, url }]
export function mergeItems(db, items, now = new Date()) {
  let added = 0;
  let updated = 0;
  let completed = 0;
  const oldest = now.getTime() - 7 * DAY; // deadline lebih dari 7 hari lalu tidak diimpor

  for (const item of items) {
    if (item.due.getTime() < oldest) continue;
    if (db.ignoredExternalIds.includes(item.uid)) continue;

    const dueAt = item.due.toISOString();
    const isPast = item.due <= now;
    let existing = db.tasks.find((t) => t.externalId === item.uid);

    // Tugas yang dulu diimpor lewat link kalender: pakai yang sudah ada, jangan dobel
    if (!existing) {
      existing = db.tasks.find(
        (t) => t.source === "moodle" && t.title === item.title && t.dueAt === dueAt
      );
      if (existing) existing.externalId = item.uid;
    }

    if (existing) {
      let changed = false;
      // Judul/deadline yang sudah kamu edit sendiri tidak ditimpa Moodle
      if (!existing.edited && existing.title !== item.title) {
        existing.title = item.title;
        changed = true;
      }
      if (!existing.edited && existing.dueAt !== dueAt) {
        existing.dueAt = dueAt;
        existing.notified = isPast;
        existing.remindersSent = [];
        changed = true;
      }
      if (item.url && existing.url !== item.url) {
        existing.url = item.url;
        changed = true;
      }
      if (existing.courseId == null && item.courseId != null) {
        existing.courseId = item.courseId;
        changed = true;
      }
      if (item.submitted && !existing.done) {
        existing.done = true;
        completed++;
        changed = true;
      }
      if (changed) updated++;
    } else {
      db.tasks.push({
        id: newId(),
        title: item.title,
        dueAt,
        courseId: item.courseId ?? null,
        priority: "sedang",
        done: Boolean(item.submitted),
        notified: isPast, // jangan munculkan notifikasi untuk yang sudah lewat
        remindersSent: [],
        source: "moodle",
        externalId: item.uid,
        url: item.url ?? null,
      });
      added++;
    }
  }
  return { added, updated, completed };
}

// Kompatibilitas: dipakai oleh mode kalender
export function mergeEvents(db, events, now = new Date()) {
  const items = events
    .filter((e) => !OPEN_EVENT.test(e.summary))
    .map((e) => ({
      uid: e.uid,
      title: cleanTitle(e.summary),
      due: e.due,
      courseId: matchCourse(e, db.courses),
      url: safeUrl(e.url),
    }));
  return mergeItems(db, items, now);
}

// ---------------- Sinkron: mode kalender ----------------

async function syncViaCalendar(config, db, now) {
  let res;
  try {
    res = await fetch(config.url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  } catch {
    throw new Error("Tidak bisa menghubungi Moodle. Cek koneksi internet.");
  }
  if (!res.ok) {
    throw new Error(`Moodle menolak permintaan (HTTP ${res.status}). Coba buat ulang link kalendernya.`);
  }
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("Link ini bukan link ekspor kalender Moodle.");
  }
  const events = parseICS(text);
  return { ...mergeEvents(db, events, now), found: events.length, warnings: [] };
}

// ---------------- Sinkron: mode akun (API) ----------------

async function fetchCurrentCourses(config, now) {
  const all = await callWs(config.baseUrl, config.token, "core_enrol_get_users_courses", {
    userid: config.userid,
  });
  return (Array.isArray(all) ? all : []).filter((mc) => isCurrentCourse(mc, now));
}

async function syncGrades(config, db, links, now, warnings) {
  let courses = 0;
  let components = 0;

  for (const [moodleId, localId] of links) {
    const local = db.courses.find((c) => c.id === localId);
    if (!local) continue;
    try {
      const res = await callWs(config.baseUrl, config.token, "gradereport_user_get_grade_items", {
        courseid: moodleId,
        userid: config.userid,
      });
      const gradeItems = (res.usergrades?.[0]?.gradeitems ?? [])
        .filter(
          (i) =>
            i.itemtype === "mod" &&
            i.graderaw !== null &&
            i.graderaw !== undefined &&
            Number(i.grademax) > 0
        )
        .map((i) => ({
          name: i.itemname ?? "",
          percent: Math.round((Number(i.graderaw) / Number(i.grademax)) * 10000) / 100,
        }));

      local.moodleGrades = gradeItems;
      local.moodleGradesAt = now.toISOString();

      if (local.mode !== "final") {
        for (const comp of local.components) {
          const manual = comp.score !== null && comp.score !== undefined && comp.source !== "moodle";
          if (manual) continue; // nilai yang diisi sendiri tidak ditimpa
          const matched = gradeItems.filter((it) => componentMatches(comp.name, it.name));
          if (matched.length === 0) continue;
          const avg = Math.round((matched.reduce((s, it) => s + it.percent, 0) / matched.length) * 100) / 100;
          if (comp.score !== avg || comp.source !== "moodle") {
            comp.score = avg;
            comp.source = "moodle";
            components++;
          }
        }
      }
      courses++;
    } catch (err) {
      warnings.push(`Nilai ${local.name}: ${err.message}`);
    }
  }
  return { courses, components };
}

async function syncViaApi(config, db, now) {
  const { baseUrl, token } = config;
  const warnings = [];
  const moodleCourses = await fetchCurrentCourses(config, now);
  const links = linkCourses(db, moodleCourses);
  const courseIds = moodleCourses.map((c) => c.id);
  const items = [];

  if (courseIds.length > 0) {
    try {
      const res = await callWs(baseUrl, token, "mod_assign_get_assignments", { courseids: courseIds });
      for (const c of res.courses ?? []) {
        for (const a of c.assignments ?? []) {
          if (!a.duedate) continue;
          items.push({
            uid: `assign-${a.id}`,
            kind: "assign",
            moodleId: a.id,
            title: a.name,
            due: new Date(a.duedate * 1000),
            courseId: links.get(c.id) ?? null,
            url: a.cmid ? `${baseUrl}/mod/assign/view.php?id=${a.cmid}` : null,
          });
        }
      }
    } catch (err) {
      warnings.push(`Tugas: ${err.message}`);
    }

    try {
      const res = await callWs(baseUrl, token, "mod_quiz_get_quizzes_by_courses", { courseids: courseIds });
      for (const q of res.quizzes ?? []) {
        if (!q.timeclose) continue;
        items.push({
          uid: `quiz-${q.id}`,
          kind: "quiz",
          moodleId: q.id,
          title: q.name,
          due: new Date(q.timeclose * 1000),
          courseId: links.get(q.course) ?? null,
          url: q.coursemodule ? `${baseUrl}/mod/quiz/view.php?id=${q.coursemodule}` : null,
        });
      }
    } catch (err) {
      warnings.push(`Kuis: ${err.message}`);
    }
  }

  // Cek status pengumpulan untuk deadline yang masih relevan
  const relevant = items.filter((i) => i.due.getTime() >= now.getTime() - 7 * DAY).slice(0, 60);
  await mapLimit(relevant, 5, async (item) => {
    try {
      if (item.kind === "assign") {
        const st = await callWs(baseUrl, token, "mod_assign_get_submission_status", {
          assignid: item.moodleId,
        });
        const status = st.lastattempt?.submission?.status ?? st.lastattempt?.teamsubmission?.status;
        item.submitted = status === "submitted";
      } else {
        const st = await callWs(baseUrl, token, "mod_quiz_get_user_attempts", {
          quizid: item.moodleId,
          status: "finished",
        });
        item.submitted = (st.attempts ?? []).length > 0;
      }
    } catch {
      // Status tidak bisa dicek: biarkan, tugas tetap masuk
    }
  });

  const taskResult = mergeItems(db, items, now);
  const grades = config.autoGrades
    ? await syncGrades(config, db, links, now, warnings)
    : { courses: 0, components: 0 };

  return { ...taskResult, found: items.length, linkedCourses: links.size, grades, warnings };
}

// ---------------- Aksi utama ----------------

export async function syncMoodle(userId) {
  const config = await readMoodleConfig(userId);
  if (!config.mode) throw new Error("Moodle belum dihubungkan");

  const now = new Date();
  const db = await readDB(userId);
  const result =
    config.mode === "token"
      ? await syncViaApi(config, db, now)
      : await syncViaCalendar(config, db, now);
  await writeDB(userId, db);

  config.lastSync = now.toISOString();
  await writeMoodleConfig(userId, config);
  return { ...result, mode: config.mode, lastSync: config.lastSync };
}

// Buat matkul lokal dari matkul Moodle yang belum ada (masuk ke semester terbaru)
export async function importMoodleCourses(userId) {
  const config = await readMoodleConfig(userId);
  if (config.mode !== "token") throw new Error("Impor matkul butuh login akun Moodle.");

  const db = await readDB(userId);
  const semester = latestSemester(db.semesters);
  if (!semester) throw new Error("Buat semester dulu di halaman Nilai.");

  const now = new Date();
  const moodleCourses = await fetchCurrentCourses(config, now);
  const links = linkCourses(db, moodleCourses);
  let imported = 0;

  for (const mc of moodleCourses) {
    if (links.has(mc.id)) continue;
    const id = newId();
    db.courses.push({
      id,
      semesterId: semester.id,
      code: extractCode(mc.shortname, mc.fullname, mc.idnumber),
      name: cleanCourseName(mc.fullname),
      className: mc.shortname ?? "",
      sks: 3,
      mode: "komponen",
      finalLetter: null,
      moodleId: mc.id,
      components: DEFAULT_COMPONENTS.map((c, i) => ({
        id: `${id}-${i}`,
        name: c.name,
        weight: c.weight,
        score: null,
      })),
    });
    links.set(mc.id, id);
    imported++;
  }

  await writeDB(userId, db);
  return { imported, linked: links.size - imported, semester: semester.name };
}
