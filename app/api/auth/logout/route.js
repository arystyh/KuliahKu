import { clearSessionCookie, deleteSession, getSessionToken } from "@/lib/auth";

// POST /api/auth/logout -> hapus sesi
export async function POST(request) {
  await deleteSession(getSessionToken(request));
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
