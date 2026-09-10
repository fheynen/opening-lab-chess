import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import test from "node:test";

async function render(path = "/", init = {}, bindings = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  if (bindings.DB) globalThis.__OPENING_LAB_TEST_DB = bindings.DB;
  try {
    return await worker.fetch(
      new Request(`http://localhost${path}`, { ...init, headers: { accept: "text/html", ...init.headers } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, ...bindings },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    delete globalThis.__OPENING_LAB_TEST_DB;
  }
}

function createD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const migration of ["../drizzle/0000_deep_rockslide.sql", "../drizzle/0001_tranquil_luckman.sql"]) {
    const sql = readFileSync(new URL(migration, import.meta.url), "utf8").replaceAll("--> statement-breakpoint", "");
    sqlite.exec(sql);
  }
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      return {
        bind(...nextValues) { values = nextValues; return this; },
        async run() { const result = statement.run(...values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
        async all() { return { success: true, results: statement.all(...values) }; },
        async first(column) { const row = statement.get(...values) ?? null; return column && row ? row[column] : row; },
        async raw() { return statement.all(...values).map((row) => Object.values(row)); },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
    _sqlite: sqlite,
  };
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

test("renders native sign-in and account creation instead of ChatGPT authentication", async () => {
  const response = await render("/account?mode=signup&returnTo=%2Fanalyze");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create your account/);
  assert.match(html, /No email required/);
  assert.doesNotMatch(html, /Sign in with ChatGPT/i);
});

test("protected pages redirect anonymous visitors to the native account screen", async () => {
  const response = await render("/analyze");
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") || "", /\/account\?mode=signin&returnTo=/);
});

test("account creation validates usernames and passwords before database access", async () => {
  const response = await render("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username: "x", password: "short" }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Username must be 3/);
});

test("creates a native account, stores a password hash, and authenticates its session", async () => {
  const DB = createD1();
  const signup = await render("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "KnightRider", password: "correct horse battery staple" }),
  }, { DB });
  assert.equal(signup.status, 201);
  const cookie = signup.headers.get("set-cookie") || "";
  assert.match(cookie, /^opening_lab_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);

  const stored = DB._sqlite.prepare("SELECT username, password_hash, password_salt, password_iterations FROM accounts").get();
  assert.equal(stored.username, "KnightRider");
  assert.notEqual(stored.password_hash, "correct horse battery staple");
  assert.ok(stored.password_salt);
  assert.equal(stored.password_iterations, 100_000);

  const sessionCookie = cookie.split(";", 1)[0];
  const me = await render("/api/auth/me", { headers: { cookie: sessionCookie, accept: "application/json" } }, { DB });
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).user, { username: "KnightRider", displayName: "KnightRider" });

  const duplicate = await render("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "knightrider", password: "another secure password" }),
  }, { DB });
  assert.equal(duplicate.status, 409);

  const signout = await render("/api/auth/signout", { method: "POST", headers: { cookie: sessionCookie, origin: "http://localhost" } }, { DB });
  assert.equal(signout.status, 200);
  assert.match(signout.headers.get("set-cookie") || "", /Max-Age=0/);
  const signedOut = await render("/api/auth/me", { headers: { cookie: sessionCookie, accept: "application/json" } }, { DB });
  assert.equal(signedOut.status, 401);

  const wrongPassword = await render("/api/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "knightrider", password: "not the right password" }),
  }, { DB });
  assert.equal(wrongPassword.status, 401);

  const signin = await render("/api/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ username: "KNIGHTRIDER", password: "correct horse battery staple" }),
  }, { DB });
  assert.equal(signin.status, 200);
  assert.match(signin.headers.get("set-cookie") || "", /^opening_lab_session=/);
});
