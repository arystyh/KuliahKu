// Klien Moodle Web Service (cara yang sama dengan aplikasi Moodle di HP).
// Alur: username + password -> /login/token.php -> token
//       token -> /webservice/rest/server.php?wsfunction=...
// Password hanya dipakai sekali untuk minta token dan TIDAK disimpan.

const TIMEOUT = 20000;

// "https://moodle.kampus.ac.id/login/index.php" -> "https://moodle.kampus.ac.id"
export function normalizeBaseUrl(input) {
  let u;
  try {
    u = new URL(String(input ?? "").trim());
  } catch {
    throw new Error("Alamat Moodle tidak valid. Contoh: https://moodle.kampus.ac.id");
  }
  const isLocal = ["localhost", "127.0.0.1"].includes(u.hostname);
  if (u.protocol !== "https:" && !(isLocal && u.protocol === "http:")) {
    throw new Error("Alamat Moodle harus diawali https://");
  }
  const pathname = u.pathname
    .replace(/\/(login|my|course|calendar|user|mod|admin|webservice|grade)(\/.*)?$/, "")
    .replace(/\/index\.php$/, "")
    .replace(/\/+$/, "");
  return `${u.origin}${pathname}`;
}

async function postForm(url, data) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      body: new URLSearchParams(data),
      signal: AbortSignal.timeout(TIMEOUT),
      cache: "no-store",
    });
  } catch {
    throw new Error("Tidak bisa menghubungi Moodle. Cek alamat dan koneksi internet.");
  }
  if (!res.ok) throw new Error(`Moodle membalas HTTP ${res.status}. Cek alamat Moodle-nya.`);
  try {
    return await res.json();
  } catch {
    throw new Error("Balasan Moodle tidak dikenali. Pastikan alamatnya adalah halaman utama Moodle.");
  }
}

// Ubah { courseids: [1, 2] } jadi { "courseids[0]": "1", "courseids[1]": "2" }
function flatten(params, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && typeof value === "object") flatten(value, name, out);
    else if (value !== undefined && value !== null) out[name] = String(value);
  }
  return out;
}

export async function getToken(baseUrl, username, password) {
  const data = await postForm(`${baseUrl}/login/token.php`, {
    username,
    password,
    service: "moodle_mobile_app",
  });
  if (data.token) return data.token;

  switch (data.errorcode) {
    case "invalidlogin":
      throw new Error("Username atau password salah.");
    case "enablewsdescription":
    case "servicenotavailable":
    case "servicerequireslogin":
      throw new Error("Moodle kampus tidak mengizinkan login dari aplikasi lain. Pakai link kalender saja.");
    case "sitepolicynotagreed":
      throw new Error("Setujui dulu kebijakan situs di Moodle (login sekali lewat browser), lalu coba lagi.");
    default:
      throw new Error(data.error || "Gagal login ke Moodle.");
  }
}

export async function callWs(baseUrl, token, wsfunction, params = {}) {
  const data = await postForm(`${baseUrl}/webservice/rest/server.php`, {
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
    ...flatten(params),
  });
  if (data && typeof data === "object" && data.exception) {
    if (data.errorcode === "invalidtoken") {
      throw new Error("Sesi Moodle kedaluwarsa. Hubungkan ulang akun Moodle di Pengaturan.");
    }
    throw new Error(data.message || `Moodle error: ${data.errorcode}`);
  }
  return data;
}

// Jalankan fn untuk tiap item, maksimal `limit` request bersamaan
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
