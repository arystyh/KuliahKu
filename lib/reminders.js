// Pilihan waktu pengingat sebelum deadline (dalam menit)
export const REMINDER_OPTIONS = [
  { minutes: 10080, label: "1 minggu" },
  { minutes: 4320, label: "3 hari" },
  { minutes: 1440, label: "1 hari" },
  { minutes: 360, label: "6 jam" },
  { minutes: 180, label: "3 jam" },
  { minutes: 60, label: "1 jam" },
  { minutes: 30, label: "30 menit" },
];

export const DEFAULT_REMINDERS = [1440, 180];

export function reminderLabel(minutes) {
  return REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} menit`;
}

export function cleanReminders(list) {
  const allowed = new Set(REMINDER_OPTIONS.map((o) => o.minutes));
  return [...new Set((Array.isArray(list) ? list : []).map(Number))]
    .filter((m) => allowed.has(m))
    .sort((a, b) => b - a);
}

// Tentukan pengingat yang harus muncul sekarang, lalu tandai sudah terkirim.
// - Sebelum deadline: ambil pengingat terdekat yang waktunya sudah lewat
//   (kalau beberapa terlewat sekaligus, cukup satu notifikasi)
// - Saat/lewat deadline: sekali saja (flag `notified`)
export function collectDueReminders(tasks, offsets, now = Date.now()) {
  const fired = [];

  for (const task of tasks) {
    if (task.done) continue;
    const due = new Date(task.dueAt).getTime();
    if (Number.isNaN(due)) continue;
    task.remindersSent = task.remindersSent ?? [];

    if (due <= now) {
      if (!task.notified) {
        task.notified = true;
        fired.push({ task, offset: 0 });
      }
      continue;
    }

    const started = offsets.filter(
      (m) => due - m * 60000 <= now && !task.remindersSent.includes(m)
    );
    if (started.length > 0) {
      const offset = Math.min(...started);
      task.remindersSent = [...new Set([...task.remindersSent, ...offsets.filter((m) => m >= offset)])];
      fired.push({ task, offset });
    }
  }

  return fired;
}
