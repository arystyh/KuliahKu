import { readDB, writeDB, newId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_COMPONENTS } from "@/lib/grades";

export const dynamic = "force-dynamic";

// GET /api/courses -> semua mata kuliah
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const db = await readDB(userId);
  return Response.json(db.courses);
}

// POST /api/courses -> tambah mata kuliah
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const body = await request.json().catch(() => null);

  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Nama mata kuliah wajib diisi" }, { status: 400 });
  }
  const sks = Number(body.sks);
  if (!Number.isInteger(sks) || sks < 1 || sks > 24) {
    return Response.json({ error: "SKS harus angka 1-24" }, { status: 400 });
  }

  const db = await readDB(userId);
  const semesterId = Number(body.semesterId);
  if (!db.semesters.some((s) => s.id === semesterId)) {
    return Response.json({ error: "Semester tidak ditemukan" }, { status: 400 });
  }

  const id = newId();
  const course = {
    id,
    semesterId,
    code: String(body.code ?? "").trim(),
    name: body.name.trim(),
    className: String(body.className ?? "").trim(),
    sks,
    mode: body.mode === "final" ? "final" : "komponen",
    finalLetter: body.finalLetter ?? null,
    components: DEFAULT_COMPONENTS.map((c, i) => ({
      id: `${id}-${i}`,
      name: c.name,
      weight: c.weight,
      score: null,
    })),
  };

  db.courses.push(course);
  await writeDB(userId, db);
  return Response.json(course, { status: 201 });
}
