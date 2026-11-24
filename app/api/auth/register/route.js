import {
  AuthError,
  createSession,
  publicUser,
  registerUser,
  sessionCookie,
} from "@/lib/auth";
import { initUserData } from "@/lib/db";

// POST /api/auth/register -> buat akun baru lalu langsung login
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  try {
    const { user, isFirstUser } = await registerUser(body);
    await initUserData(user.id, { claimLegacy: isFirstUser });
    const token = await createSession(user.id);
    return Response.json(
      { user: publicUser(user) },
      { status: 201, headers: { "Set-Cookie": sessionCookie(token, request) } }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}
