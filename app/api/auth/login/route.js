import { AuthError, createSession, loginUser, publicUser, sessionCookie } from "@/lib/auth";

// POST /api/auth/login -> cek username & password, buat sesi
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  try {
    const user = await loginUser(body);
    const token = await createSession(user.id);
    return Response.json(
      { user: publicUser(user) },
      { headers: { "Set-Cookie": sessionCookie(token, request) } }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Gagal login." }, { status: 500 });
  }
}
