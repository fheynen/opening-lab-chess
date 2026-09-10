import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Opening Lab home dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Opening Lab — Study\. Review\. Improve\.<\/title>/i);
  assert.match(html, /Study the opening/);
  assert.match(html, /Opening library/);
  assert.match(html, /Analyze your games/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("server-renders the public opening library", async () => {
  const response = await render("/openings");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Build a repertoire you can recall/);
  assert.match(html, /Sicilian Defense/);
  assert.match(html, /3,810/);
});

test("protected APIs reject anonymous requests", async () => {
  const response = await render("/api/games");
  assert.equal(response.status, 401);
});
