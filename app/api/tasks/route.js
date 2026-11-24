import { readDB, writeDB, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { safeUrl } from "@/lib/ui";

export const dynamic = "force-dynamic";

const PRIORITIES = ["tinggi", "sedang", "rendah"];

// GET /api/tasks -> semua tugas
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const db = await readDB(userId);
  return Response.json(db.tasks);
}

// POST /api/tasks -> tambah tugas baru
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const body = await request.json().catch(() => null);

  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "Judul wajib diisi" }, { status: 400 });
  }
  if (body.url && !safeUrl(body.url)) {
    return Response.json({ error: "Link harus diawali http:// atau https://" }, { status: 400 });
  }
  if (!body.dueAt || Number.isNaN(new Date(body.dueAt).getTime())) {
    return Response.json({ error: "Deadline tidak valid" }, { status: 400 });
  }

  const db = await readDB(userId);
  const task = {
    id: newId(),
    title: body.title.trim(),
    dueAt: new Date(body.dueAt).toISOString(),
    courseId: body.courseId ? Number(body.courseId) : null,
    priority: PRIORITIES.includes(body.priority) ? body.priority : "sedang",
    done: false,
    notified: false,
    remindersSent: [],
    url: body.url ? safeUrl(body.url) : null,
  };

  db.tasks.push(task);
  await writeDB(userId, db);
  return Response.json(task, { status: 201 });
}
