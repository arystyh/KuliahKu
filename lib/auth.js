// Sistem akun sederhana tanpa library tambahan:
// - Password di-hash dengan scrypt (bawaan Node.js), tidak pernah disimpan mentah
// - Sesi login disimpan di cookie httpOnly (tidak bisa dibaca JavaScript di browser)
// - Di server hanya disimpan hash dari token sesi
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const SESSIONS_PATH = path.join(DATA_DIR, "sessions.json");
const SESSION_DAYS = 30;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export const SESSION_COOKIE = "kuliahku_session";

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ---------------- Password ----------------

function scrypt(password, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored ?? "").split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(String(password ?? ""), salt);
  const expected = Buffer.from(hash, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

// ---------------- User ----------------

export async function readUsers() {
  return readJson(USERS_PATH, []);
}

export function publicUser(user) {
  return { id: user.id, name: user.name, username: user.username };
}

export async function registerUser({ name, username, password }) {
  name = String(name ?? "").trim();
  username = String(username ?? "").trim().toLowerCase();
  password = String(password ?? "");

  if (!name) throw new AuthError("Nama wajib diisi.");
  if (name.length > 60) throw new AuthError("Nama maksimal 60 karakter.");
  if (!USERNAME_RE.test(username)) {
    throw new AuthError("Username 3-30 karakter: huruf kecil, angka, titik, atau garis bawah.");
  }
  if (password.length < 8) throw new AuthError("Password minimal 8 karakter.");

  const users = await readUsers();
  if (users.some((u) => u.username === username)) {
    throw new AuthError("Username sudah dipakai.", 409);
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    username,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeJson(USERS_PATH, users);
  return { user, isFirstUser: users.length === 1 };
}

// Batasi percobaan login: 5 kali salah -> dikunci 5 menit
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export async function loginUser({ username, password }) {
  username = String(username ?? "").trim().toLowerCase();
  const record = attempts.get(username);
  if (record?.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new AuthError(`Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`, 429);
  }

  const user = (await readUsers()).find((u) => u.username === username);
  // Tetap hitung hash walau user tidak ada, supaya waktu respons sama
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : (await hashPassword(String(password ?? "")), false);

  if (!ok) {
    const count = (record?.count ?? 0) + 1;
    attempts.set(
      username,
      count >= MAX_ATTEMPTS ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 }
    );
    throw new AuthError("Username atau password salah.", 401);
  }

  attempts.delete(username);
  return user;
}

// ---------------- Sesi ----------------

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = await readJson(SESSIONS_PATH, {});
  const now = Date.now();
  for (const [key, s] of Object.entries(sessions)) {
    if (s.expiresAt < now) delete sessions[key]; // bersihkan sesi kedaluwarsa
  }
  sessions[hashToken(token)] = { userId, expiresAt: now + SESSION_DAYS * 24 * 60 * 60 * 1000 };
  await writeJson(SESSIONS_PATH, sessions);
  return token;
}

export async function deleteSession(token) {
  if (!token) return;
  const sessions = await readJson(SESSIONS_PATH, {});
  delete sessions[hashToken(token)];
  await writeJson(SESSIONS_PATH, sessions);
}

export function getSessionToken(request) {
  const header = request?.headers?.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function getUserFromRequest(request) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = (await readJson(SESSIONS_PATH, {}))[hashToken(token)];
  if (!session || session.expiresAt < Date.now()) return null;
  return (await readUsers()).find((u) => u.id === session.userId) ?? null;
}

// Dipakai di setiap API: kalau belum login, langsung balas 401
export async function requireUser(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { response: Response.json({ error: "Silakan login dulu." }, { status: 401 }) };
  }
  return { user };
}

export function sessionCookie(token, request) {
  let secure = "";
  try {
    if (new URL(request.url).protocol === "https:") secure = "; Secure";
  } catch {}
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---------------- Profil & password ----------------

async function updateUser(userId, changes) {
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new AuthError("Akun tidak ditemukan.", 404);
  Object.assign(user, changes);
  await writeJson(USERS_PATH, users);
  return user;
}

export async function updateProfile(userId, { name }) {
  name = String(name ?? "").trim();
  if (!name) throw new AuthError("Nama wajib diisi.");
  if (name.length > 60) throw new AuthError("Nama maksimal 60 karakter.");
  return updateUser(userId, { name });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = (await readUsers()).find((u) => u.id === userId);
  if (!user) throw new AuthError("Akun tidak ditemukan.", 404);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AuthError("Password lama salah.", 400);
  }
  newPassword = String(newPassword ?? "");
  if (newPassword.length < 8) throw new AuthError("Password baru minimal 8 karakter.");
  if (newPassword === currentPassword) {
    throw new AuthError("Password baru harus berbeda dari password lama.");
  }
  return updateUser(userId, { passwordHash: await hashPassword(newPassword) });
}

// Keluarkan semua sesi lain milik user (misalnya setelah ganti password)
export async function deleteOtherSessions(userId, keepToken) {
  const sessions = await readJson(SESSIONS_PATH, {});
  const keep = keepToken ? hashToken(keepToken) : null;
  for (const [key, s] of Object.entries(sessions)) {
    if (s.userId === userId && key !== keep) delete sessions[key];
  }
  await writeJson(SESSIONS_PATH, sessions);
}
