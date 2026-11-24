import { readDB, writeDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/semesters/:id -> ganti nama / urutan semester
export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDB(userId);
  const semester = db.semesters.find((s) => s.id === Number(id));

  if (!semester) {
    return Response.json({ error: "Semester tidak ditemukan" }, { status: 404 });
  }
  if (typeof body.name === "string" && body.name.trim()) semester.name = body.name.trim();
  if (Number.isFinite(Number(body.order)) && body.order !== undefined) semester.order = Number(body.order);

  await writeDB(userId, db);
  return Response.json(semester);
}

// DELETE /api/semesters/:id -> hapus semester beserta mata kuliahnya
export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;
  const semesterId = Number(id);
  const db = await readDB(userId);

  if (!db.semesters.some((s) => s.id === semesterId)) {
    return Response.json({ error: "Semester tidak ditemukan" }, { status: 404 });
  }

  const removedCourseIds = db.courses.filter((c) => c.semesterId === semesterId).map((c) => c.id);
  db.semesters = db.semesters.filter((s) => s.id !== semesterId);
  db.courses = db.courses.filter((c) => c.semesterId !== semesterId);
  db.tasks = db.tasks.map((t) =>
    removedCourseIds.includes(t.courseId) ? { ...t, courseId: null } : t
  );

  await writeDB(userId, db);
  return Response.json({ ok: true });
}
