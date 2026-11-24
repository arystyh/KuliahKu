import { requireUser } from "@/lib/auth";
import { readDB, writeDB } from "@/lib/db";
import { collectDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// POST /api/tasks/reminders -> pengingat yang jatuh tempo sekarang (langsung ditandai terkirim)
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const db = await readDB(userId);
  const fired = collectDueReminders(db.tasks, db.settings.reminders);
  if (fired.length > 0) await writeDB(userId, db);

  return Response.json(
    fired.map(({ task, offset }) => ({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      url: task.url ?? null,
      offset,
    }))
  );
}
