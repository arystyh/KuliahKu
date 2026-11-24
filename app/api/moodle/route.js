import {
  EMPTY_CONFIG,
  readMoodleConfig,
  writeMoodleConfig,
  publicStatus,
  isValidMoodleUrl,
  connectWithLogin,
  connectWithToken,
  syncMoodle,
  importMoodleCourses,
} from "@/lib/moodle";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/moodle -> status koneksi (token & link tidak pernah dikirim ke browser)
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  return Response.json(publicStatus(await readMoodleConfig(auth.user.id)));
}

// PUT /api/moodle -> hubungkan / putuskan / ubah pengaturan
// { mode: "login", baseUrl, username, password }
// { mode: "token", baseUrl, token }
// { mode: "ical", url }
// { mode: null }            -> putuskan
// { autoGrades: true/false } -> ubah pengaturan nilai otomatis
export async function PUT(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;
  const body = await request.json().catch(() => ({}));

  try {
    if ("mode" in body && !body.mode) {
      await writeMoodleConfig(userId, EMPTY_CONFIG);
      return Response.json(publicStatus(EMPTY_CONFIG));
    }

    if (body.mode === "login") {
      return Response.json(await connectWithLogin(userId, body));
    }

    if (body.mode === "token") {
      return Response.json(await connectWithToken(userId, body));
    }

    if (body.mode === "ical") {
      const url = String(body.url ?? "").trim();
      if (!isValidMoodleUrl(url)) {
        return Response.json({ error: "Link tidak valid. Harus diawali https://" }, { status: 400 });
      }
      const config = { ...EMPTY_CONFIG, mode: "ical", url };
      await writeMoodleConfig(userId, config);
      return Response.json(publicStatus(config));
    }

    if ("autoGrades" in body) {
      const config = await readMoodleConfig(userId);
      config.autoGrades = Boolean(body.autoGrades);
      await writeMoodleConfig(userId, config);
      return Response.json(publicStatus(config));
    }

    return Response.json({ error: "Permintaan tidak dikenali" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// POST /api/moodle -> sinkron sekarang
// POST /api/moodle { action: "import-courses" } -> impor matkul dari Moodle
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "import-courses") {
      return Response.json(await importMoodleCourses(userId));
    }
    return Response.json(await syncMoodle(userId));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
