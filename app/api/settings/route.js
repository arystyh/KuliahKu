import { readDB, writeDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sortScale } from "@/lib/grades";
import { cleanReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// GET /api/settings -> matriks nilai
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const db = await readDB(userId);
  return Response.json(db.settings);
}

// PATCH /api/settings -> simpan matriks nilai dan/atau pengaturan pengingat
export async function PATCH(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const db = await readDB(userId);

  if ("gradeScale" in body) {
    const result = validateScale(body.gradeScale);
    if (result.error) return Response.json({ error: result.error }, { status: 400 });
    db.settings.gradeScale = result.scale;
  }

  if ("reminders" in body) {
    db.settings.reminders = cleanReminders(body.reminders);
  }

  await writeDB(userId, db);
  return Response.json(db.settings);
}

function validateScale(scale) {
  if (!Array.isArray(scale) || scale.length === 0) {
    return { error: "Matriks nilai tidak boleh kosong" };
  }

  const cleaned = scale.map((g) => ({
    letter: String(g.letter ?? "").trim(),
    min: Number(g.min),
    point: Number(g.point),
  }));

  const letters = new Set();
  for (const g of cleaned) {
    if (!g.letter) return { error: "Huruf mutu tidak boleh kosong" };
    if (letters.has(g.letter)) return { error: `Huruf "${g.letter}" dobel` };
    letters.add(g.letter);
    if (!(g.min >= 0 && g.min <= 100)) return { error: `Batas bawah ${g.letter} harus 0-100` };
    if (!(g.point >= 0 && g.point <= 4)) return { error: `Bobot ${g.letter} harus 0-4` };
  }
  if (!cleaned.some((g) => g.min === 0)) {
    return { error: "Harus ada satu huruf dengan batas bawah 0" };
  }
  return { scale: sortScale(cleaned) };
}
