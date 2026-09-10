import { isSameOrigin, revokeCurrentSession } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Request origin was not accepted." }, { status: 403 });
  const response = Response.json({ signedOut: true });
  response.headers.set("Set-Cookie", await revokeCurrentSession(request));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
