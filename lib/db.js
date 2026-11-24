// "Database" sederhana berupa file JSON, satu file per user:
//   data/users/<userId>/db.json      -> tugas, matkul, semester, pengaturan
//   data/users/<userId>/moodle.json  -> koneksi Moodle (token pribadi)
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_GRADE_SCALE } from "./grades";
import { DEFAULT_REMINDERS } from "./reminders";

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_DB = path.join(DATA_DIR, "db.json"); // data dari versi sebelum ada login
const LEGACY_MOODLE = path.join(DATA_DIR, "moodle.json");

export function userDir(userId) {
  if (!/^[a-zA-Z0-9-]+$/.test(String(userId ?? ""))) throw new Error("User tidak valid");
  return path.join(DATA_DIR, "users", userId);
}

const dbPath = (userId) => path.join(userDir(userId), "db.json");

// Lengkapi field yang belum ada (biar data versi lama tetap jalan)
function normalize(db) {
  const out = {
    tasks: (db.tasks ?? []).map((t) => ({ remindersSent: [], ...t })),
    courses: db.courses ?? [],
    semesters: db.semesters ?? [],
    settings: {
      gradeScale: db.settings?.gradeScale ?? DEFAULT_GRADE_SCALE,
      reminders: db.settings?.reminders ?? DEFAULT_REMINDERS,
    },
    // UID event Moodle yang sudah dihapus user, supaya tidak muncul lagi saat sinkron
    ignoredExternalIds: db.ignoredExternalIds ?? [],
  };

  if (out.semesters.length === 0 && out.courses.length > 0) {
    out.semesters.push({ id: 1, name: "Semester 1", order: 1 });
  }
  const firstSemesterId = out.semesters[0]?.id ?? null;

  out.courses = out.courses.map((c) => ({
    code: "",
    className: "",
    mode: "komponen",
    finalLetter: null,
    components: [],
    ...c,
    semesterId: c.semesterId ?? firstSemesterId,
  }));

  return out;
}

export async function readDB(userId) {
  try {
    return normalize(JSON.parse(await fs.readFile(dbPath(userId), "utf8")));
  } catch {
    return normalize({});
  }
}

export async function writeDB(userId, db) {
  await fs.mkdir(userDir(userId), { recursive: true });
  await fs.writeFile(dbPath(userId), JSON.stringify(db, null, 2));
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

// Siapkan data untuk user baru.
// User pertama yang mendaftar mewarisi data lama (data/db.json & data/moodle.json).
export async function initUserData(userId, { claimLegacy = false } = {}) {
  await fs.mkdir(userDir(userId), { recursive: true });

  if (claimLegacy && (await exists(LEGACY_DB))) {
    await fs.copyFile(LEGACY_DB, dbPath(userId));
    if (await exists(LEGACY_MOODLE)) {
      await fs.copyFile(LEGACY_MOODLE, path.join(userDir(userId), "moodle.json"));
      await fs.unlink(LEGACY_MOODLE); // berisi token, jangan dibiarkan di luar folder user
    }
    return;
  }

  await writeDB(userId, normalize({ semesters: [{ id: 1, name: "Semester 1", order: 1 }] }));
}

// ID unik berbasis waktu; dijamin selalu naik walau dibuat banyak sekaligus
let lastId = 0;
export function newId() {
  lastId = Math.max(Date.now(), lastId + 1);
  return lastId;
}
