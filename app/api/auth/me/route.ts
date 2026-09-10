import { getCurrentUser } from "../../../lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return Response.json({ user: { username: user.username, displayName: user.displayName } }, { headers: { "Cache-Control": "no-store" } });
}
