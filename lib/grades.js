// =============================================================
// Logika perhitungan nilai, IP semester, dan IPK
// Matriks nilai (gradeScale) disimpan di database dan bisa diubah
// lewat halaman Pengaturan. Ini hanya nilai default-nya.
// =============================================================

export const DEFAULT_GRADE_SCALE = [
  { letter: "A", min: 85, point: 4.0 },
  { letter: "A-", min: 80, point: 3.7 },
  { letter: "B+", min: 75, point: 3.3 },
  { letter: "B", min: 70, point: 3.0 },
  { letter: "B-", min: 65, point: 2.7 },
  { letter: "C+", min: 60, point: 2.3 },
  { letter: "C", min: 55, point: 2.0 },
  { letter: "D", min: 40, point: 1.0 },
  { letter: "E", min: 0, point: 0.0 },
];

// Komponen default saat bikin mata kuliah baru (total 100%)
export const DEFAULT_COMPONENTS = [
  { name: "Kuis", weight: 15 },
  { name: "Tugas", weight: 20 },
  { name: "UTS", weight: 30 },
  { name: "UAS", weight: 35 },
];

// Urutkan dari batas bawah terbesar ke terkecil (A dulu, E terakhir)
export function sortScale(scale = DEFAULT_GRADE_SCALE) {
  return [...scale].sort((a, b) => b.min - a.min);
}

// Ubah angka (0-100) jadi huruf + bobot, misal 82 -> { letter: "A-", point: 3.7 }
export function toGrade(score, scale = DEFAULT_GRADE_SCALE) {
  const sorted = sortScale(scale);
  return sorted.find((g) => score >= g.min) ?? sorted[sorted.length - 1];
}

export function isFilled(component) {
  return (
    component.score !== null &&
    component.score !== undefined &&
    component.score !== "" &&
    !Number.isNaN(Number(component.score))
  );
}

// Ringkasan satu mata kuliah.
// mode "komponen": dihitung dari nilai kuis/tugas/UTS/UAS yang sudah keluar
// mode "final":    langsung pakai huruf mutu akhir (untuk semester yang sudah lewat)
export function courseSummary(course, scale = DEFAULT_GRADE_SCALE) {
  if (course.mode === "final") {
    const grade = scale.find((g) => g.letter === course.finalLetter) ?? null;
    return {
      mode: "final",
      totalWeight: 100,
      filledWeight: grade ? 100 : 0,
      remainingWeight: 0,
      earnedRaw: 0,
      current: null,
      grade,
      complete: Boolean(grade),
    };
  }

  const components = course.components ?? [];
  const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const filled = components.filter(isFilled);
  const filledWeight = filled.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const earnedRaw = filled.reduce((sum, c) => sum + Number(c.score) * (Number(c.weight) || 0), 0);

  // Nilai sementara = rata-rata berbobot dari komponen yang sudah keluar
  const current = filledWeight > 0 ? earnedRaw / filledWeight : null;

  return {
    mode: "komponen",
    totalWeight,
    filledWeight,
    remainingWeight: Math.max(totalWeight - filledWeight, 0),
    earnedRaw,
    current,
    grade: current === null ? null : toGrade(current, scale),
    complete: components.length > 0 && filled.length === components.length,
  };
}

// Persen komponen yang nilainya sudah keluar (untuk progress ring)
export function progressPercent(course, scale) {
  const s = courseSummary(course, scale);
  return s.totalWeight > 0 ? (s.filledWeight / s.totalWeight) * 100 : 0;
}

// Rata-rata nilai yang dibutuhkan di komponen sisa supaya nilai akhir >= targetMin.
// null kalau sudah tidak ada komponen sisa.
export function neededForTarget(course, targetMin, scale) {
  const s = courseSummary(course, scale);
  if (s.mode === "final" || s.remainingWeight <= 0 || s.totalWeight <= 0) return null;
  return (targetMin * s.totalWeight - s.earnedRaw) / s.remainingWeight;
}

// IP / IPK = total (SKS x bobot huruf) / total SKS
// Hanya mata kuliah yang sudah punya nilai yang dihitung.
export function calcIPK(courses, scale = DEFAULT_GRADE_SCALE) {
  let totalSks = 0;
  let totalPoints = 0;
  let counted = 0;
  let allSks = 0;

  for (const course of courses) {
    const sks = Number(course.sks) || 0;
    allSks += sks;
    const s = courseSummary(course, scale);
    if (!s.grade) continue;
    totalSks += sks;
    totalPoints += sks * s.grade.point;
    counted++;
  }

  return {
    ipk: totalSks > 0 ? totalPoints / totalSks : null,
    totalSks,
    allSks,
    counted,
    total: courses.length,
  };
}

// IP tiap semester, urut dari semester paling awal
export function semesterStats(semesters, courses, scale) {
  return [...semesters]
    .sort((a, b) => a.order - b.order)
    .map((sem) => ({
      semester: sem,
      ...calcIPK(courses.filter((c) => c.semesterId === sem.id), scale),
    }));
}

export function latestSemester(semesters) {
  if (!semesters.length) return null;
  return [...semesters].sort((a, b) => b.order - a.order)[0];
}
