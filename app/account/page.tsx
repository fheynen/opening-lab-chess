import { redirect } from "next/navigation";
import { getCurrentUser, safeReturnTo } from "../lib/auth";
import { AuthPanel } from "./AuthPanel";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getCurrentUser()) redirect(returnTo);
  return <AuthPanel initialMode={params.mode === "signup" ? "signup" : "signin"} returnTo={returnTo} />;
}
