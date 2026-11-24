import { requireUser } from "@/lib/auth";
import { readDB, writeDB } from "@/lib/db";
import { safeUrl } from "@/lib/ui";

const PRIORITIES = ["tinggi", "sedang", "rendah"];

// PATCH /api/tasks/:id -> ubah tugas (judul, deadline, matkul, prioritas, link, status)
export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDB(userId);
  const task = db.tasks.find((t) => t.id === Number(id));

  if (!task) {
    return Response.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title) return Response.json({ error: "Judul tidak boleh kosong" }, { status: 400 });
    if (title !== task.title && task.source === "moodle") task.edited = true;
    task.title = title;
  }

  if ("dueAt" in body) {
    const due = new Date(body.dueAt);
    if (Number.isNaN(due.getTime())) {
      return Response.json({ error: "Deadline tidak valid" }, { status: 400 });
    }
    const iso = due.toISOString();
    if (iso !== task.dueAt) {
      if (task.source === "moodle") task.edited = true;
      task.dueAt = iso;
      // Deadline berubah: semua pengingat boleh muncul lagi
      task.notified = false;
      task.remindersSent = [];
    }
  }

  if ("courseId" in body) {
    const courseId = body.courseId === null || body.courseId === "" ? null : Number(body.courseId);
    if (courseId !== null && !db.courses.some((c) => c.id === courseId)) {
      return Response.json({ error: "Mata kuliah tidak ditemukan" }, { status: 400 });
    }
    task.courseId = courseId;
  }

  if ("priority" in body) {
    if (!PRIORITIES.includes(body.priority)) {
      return Response.json({ error: "Prioritas tidak valid" }, { status: 400 });
    }
    task.priority = body.priority;
  }

  if ("url" in body) {
    if (body.url && !safeUrl(body.url)) {
      return Response.json({ error: "Link harus diawali http:// atau https://" }, { status: 400 });
    }
    task.url = body.url ? safeUrl(body.url) : null;
  }

  if ("done" in body) task.done = Boolean(body.done);
  if ("notified" in body) task.notified = Boolean(body.notified);

  await writeDB(userId, db);
  return Response.json(task);
}

// DELETE /api/tasks/:id -> hapus tugas
export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const db = await readDB(userId);
  const task = db.tasks.find((t) => t.id === Number(id));

  if (!task) {
    return Response.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  // Tugas dari Moodle yang dihapus jangan diimpor lagi saat sinkron berikutnya
  if (task.externalId && !db.ignoredExternalIds.includes(task.externalId)) {
    db.ignoredExternalIds.push(task.externalId);
  }
  db.tasks = db.tasks.filter((t) => t.id !== Number(id));

  await writeDB(userId, db);
  return Response.json({ ok: true });
}
