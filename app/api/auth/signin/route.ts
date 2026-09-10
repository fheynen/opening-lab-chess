import { authenticateCredentials, isSameOrigin, issueSession } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Request origin was not accepted." }, { status: 403 });
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Enter your username and password." }, { status: 400 }); }
  const username = String(body.username || "").slice(0, 64);
  const password = String(body.password || "").slice(0, 129);
  try {
    const user = await authenticateCredentials(username, password);
    if (user === "limited") return Response.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
    if (user === "invalid") return Response.json({ error: "The username or password is incorrect." }, { status: 401 });
    const response = Response.json({ user: { username: user.username, displayName: user.displayName } });
    response.headers.set("Set-Cookie", await issueSession(user.id, request));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[auth] Sign-in failed", error);
    return Response.json({ error: "Opening Lab could not sign you in. Please try again." }, { status: 500 });
  }
}
