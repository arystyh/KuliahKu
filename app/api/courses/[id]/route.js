import { readDB, writeDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/courses/:id -> ubah data mata kuliah / komponen nilai
export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDB(userId);
  const course = db.courses.find((c) => c.id === Number(id));

  if (!course) {
    return Response.json({ error: "Mata kuliah tidak ditemukan" }, { status: 404 });
  }

  for (const key of ["name", "code", "className"]) {
    if (typeof body[key] === "string") course[key] = body[key];
  }
  if (body.sks !== undefined) course.sks = Number(body.sks) || 0;
  if (body.mode === "final" || body.mode === "komponen") course.mode = body.mode;
  if (body.finalLetter !== undefined) course.finalLetter = body.finalLetter || null;
  if (body.semesterId !== undefined && db.semesters.some((s) => s.id === Number(body.semesterId))) {
    course.semesterId = Number(body.semesterId);
  }
  if (Array.isArray(body.components)) {
    course.components = body.components.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      weight: Number(c.weight) || 0,
      score: c.score === null || c.score === "" ? null : Number(c.score),
      ...(c.source === "moodle" ? { source: "moodle" } : {}),
    }));
  }

  await writeDB(userId, db);
  return Response.json(course);
}

// DELETE /api/courses/:id -> hapus mata kuliah (tugas terkait dilepas dari matkul ini)
export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const db = await readDB(userId);
  const before = db.courses.length;
  db.courses = db.courses.filter((c) => c.id !== Number(id));

  if (db.courses.length === before) {
    return Response.json({ error: "Mata kuliah tidak ditemukan" }, { status: 404 });
  }

  db.tasks = db.tasks.map((t) => (t.courseId === Number(id) ? { ...t, courseId: null } : t));
  await writeDB(userId, db);
  return Response.json({ ok: true });
}
