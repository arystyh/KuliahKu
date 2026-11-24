import { readDB, writeDB, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/semesters -> semua semester
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const db = await readDB(userId);
  return Response.json(db.semesters);
}

// POST /api/semesters -> tambah semester baru (otomatis jadi yang paling akhir)
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Nama semester wajib diisi" }, { status: 400 });
  }

  const db = await readDB(userId);
  const maxOrder = db.semesters.reduce((max, s) => Math.max(max, s.order), 0);
  const semester = { id: newId(), name: body.name.trim(), order: maxOrder + 1 };

  db.semesters.push(semester);
  await writeDB(userId, db);
  return Response.json(semester, { status: 201 });
}
