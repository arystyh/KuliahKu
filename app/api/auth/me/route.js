import { AuthError, getUserFromRequest, publicUser, requireUser, updateProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me -> user yang sedang login (401 kalau belum)
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Belum login" }, { status: 401 });
  return Response.json({ user: publicUser(user) });
}

// PATCH /api/auth/me -> ubah profil (nama)
export async function PATCH(request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  try {
    const user = await updateProfile(auth.user.id, body);
    return Response.json({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
