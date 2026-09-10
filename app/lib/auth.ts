import { and, eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { accounts, accountSessions, authAttempts, profiles } from "../../db/schema";

const SESSION_COOKIE = "opening_lab_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 310_000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 12;
const encoder = new TextEncoder();

export type AccountUser = {
  id: string;
  username: string;
  displayName: string;
};

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function usernameError(value: string) {
  const username = value.trim();
  if (username.length < 3 || username.length > 24) return "Username must be 3–24 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(username)) return "Use only letters, numbers, and underscores.";
  return null;
}

export function passwordError(value: string) {
  if (value.length < 10) return "Password must be at least 10 characters.";
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://opening-lab.local");
    if (url.origin !== "https://opening-lab.local" || url.pathname === "/account") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function createPasswordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    passwordHash: await derivePasswordHash(password, salt, PASSWORD_ITERATIONS),
    passwordSalt: toBase64Url(salt),
    passwordIterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password: string, hash: string, salt: string, iterations: number) {
  const candidate = await derivePasswordHash(password, fromBase64Url(salt), iterations);
  return constantTimeEqual(candidate, hash);
}

export async function createAccount(usernameInput: string, password: string): Promise<AccountUser | "taken"> {
  const username = usernameInput.trim();
  const usernameNormalized = normalizeUsername(username);
  const passwordRecord = await createPasswordRecord(password);
  const id = crypto.randomUUID();
  const now = Date.now();
  const db = await getDb();
  try {
    await db.insert(accounts).values({ id, username, usernameNormalized, ...passwordRecord, createdAt: now, updatedAt: now });
  } catch (error) {
    const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.usernameNormalized, usernameNormalized)).get();
    if (existing) return "taken";
    throw error;
  }
  await db.insert(profiles).values({ userId: id, displayName: username, createdAt: now, updatedAt: now }).onConflictDoNothing();
  return { id, username, displayName: username };
}

export async function authenticateCredentials(usernameInput: string, password: string): Promise<AccountUser | "invalid" | "limited"> {
  const usernameNormalized = normalizeUsername(usernameInput);
  const now = Date.now();
  const db = await getDb();
  const attempt = await db.select().from(authAttempts).where(eq(authAttempts.usernameNormalized, usernameNormalized)).get();
  if (attempt && now - attempt.windowStartedAt < ATTEMPT_WINDOW_MS && attempt.failedCount >= MAX_FAILED_ATTEMPTS) return "limited";

  const account = await db.select().from(accounts).where(eq(accounts.usernameNormalized, usernameNormalized)).get();
  const valid = account
    ? await verifyPassword(password, account.passwordHash, account.passwordSalt, account.passwordIterations)
    : await verifyPassword(password, "rpJ5fQUlX-sTT1xfMKJJP7YQ9aY1Smu9yQq1hVqJfuk", "b3BlbmluZy1sYWItZmFrZQ", PASSWORD_ITERATIONS);

  if (!account || !valid) {
    const windowStartedAt = !attempt || now - attempt.windowStartedAt >= ATTEMPT_WINDOW_MS ? now : attempt.windowStartedAt;
    const failedCount = !attempt || windowStartedAt === now ? 1 : attempt.failedCount + 1;
    await db.insert(authAttempts).values({ usernameNormalized, failedCount, windowStartedAt, updatedAt: now }).onConflictDoUpdate({
      target: authAttempts.usernameNormalized,
      set: { failedCount, windowStartedAt, updatedAt: now },
    });
    return "invalid";
  }

  await db.delete(authAttempts).where(eq(authAttempts.usernameNormalized, usernameNormalized));
  const profile = await db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, account.id)).get();
  return { id: account.id, username: account.username, displayName: profile?.displayName || account.username };
}

export async function getCurrentUser(): Promise<AccountUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const db = await getDb();
  const row = await db.select({
    id: accounts.id,
    username: accounts.username,
    displayName: profiles.displayName,
    expiresAt: accountSessions.expiresAt,
    lastSeenAt: accountSessions.lastSeenAt,
  }).from(accountSessions)
    .innerJoin(accounts, eq(accountSessions.userId, accounts.id))
    .leftJoin(profiles, eq(accounts.id, profiles.userId))
    .where(eq(accountSessions.tokenHash, tokenHash))
    .get();
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    await db.delete(accountSessions).where(eq(accountSessions.tokenHash, tokenHash));
    return null;
  }
  if (Date.now() - row.lastSeenAt > 24 * 60 * 60 * 1000) {
    await db.update(accountSessions).set({ lastSeenAt: Date.now() }).where(eq(accountSessions.tokenHash, tokenHash));
  }
  return { id: row.id, username: row.username, displayName: row.displayName || row.username };
}

export async function requireUser(returnTo: string): Promise<AccountUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`/account?mode=signin&returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

export async function issueSession(userId: string, request: Request) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  const db = await getDb();
  await db.delete(accountSessions).where(lt(accountSessions.expiresAt, now));
  await db.insert(accountSessions).values({
    tokenHash: await sha256(token),
    userId,
    expiresAt: now + SESSION_SECONDS * 1000,
    createdAt: now,
    lastSeenAt: now,
  });
  return serializeSessionCookie(token, SESSION_SECONDS, request);
}

export async function revokeCurrentSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (token) await (await getDb()).delete(accountSessions).where(and(eq(accountSessions.tokenHash, await sha256(token))));
  return serializeSessionCookie("", 0, request);
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt).buffer, iterations }, material, 256);
  return toBase64Url(new Uint8Array(bits));
}

async function sha256(value: string) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left); const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index % a.length] || 0) ^ (b[index % b.length] || 0);
  return difference === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function serializeSessionCookie(value: string, maxAge: number, request: Request) {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function parseCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}
