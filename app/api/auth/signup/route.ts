import { createAccount, isSameOrigin, issueSession, passwordError, usernameError } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Request origin was not accepted." }, { status: 403 });
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Enter a username and password." }, { status: 400 }); }
  const username = String(body.username || "");
  const password = String(body.password || "");
  const invalidUsername = usernameError(username);
  if (invalidUsername) return Response.json({ error: invalidUsername }, { status: 400 });
  const invalidPassword = passwordError(password);
  if (invalidPassword) return Response.json({ error: invalidPassword }, { status: 400 });

  const user = await createAccount(username, password);
  if (user === "taken") return Response.json({ error: "That username is already taken." }, { status: 409 });
  const response = Response.json({ user: { username: user.username, displayName: user.displayName } }, { status: 201 });
  response.headers.set("Set-Cookie", await issueSession(user.id, request));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
