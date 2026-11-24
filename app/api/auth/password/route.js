import {
  AuthError,
  changePassword,
  deleteOtherSessions,
  getSessionToken,
  requireUser,
} from "@/lib/auth";

// POST /api/auth/password -> ganti password, lalu keluarkan sesi di perangkat lain
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  try {
    await changePassword(auth.user.id, body);
    await deleteOtherSessions(auth.user.id, getSessionToken(request));
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
