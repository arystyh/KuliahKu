// Parser sederhana format iCalendar (.ics), format ekspor kalender Moodle

// Baris panjang di .ics dipecah dengan awalan spasi; gabungkan lagi
function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeText(value = "") {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

// "20261130T235900Z" -> Date (UTC), "20261130T235900" -> waktu lokal, "20261130" -> 23:59 lokal
export function parseICSDate(value) {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) return new Date(+y, +mo - 1, +d, 23, 59, 0);
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)));
  return new Date(+y, +mo - 1, +d, +h, +mi, +(s ?? 0));
}

export function parseICS(text) {
  const lines = unfold(text).split("\n");
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    current[name] = line.slice(colon + 1);
  }

  return events
    .map((e) => ({
      uid: e.UID?.trim(),
      summary: unescapeText(e.SUMMARY),
      description: unescapeText(e.DESCRIPTION),
      categories: unescapeText(e.CATEGORIES),
      url: e.URL?.trim() || null,
      due: parseICSDate(e.DTSTART ?? e.DTEND),
    }))
    .filter((e) => e.uid && e.due && !Number.isNaN(e.due.getTime()));
}
