import { requireUser } from "../lib/auth";
import { AnalyzeDashboard } from "./AnalyzeDashboard";
export const dynamic = "force-dynamic";
export default async function AnalyzePage() { await requireUser("/analyze"); return <AnalyzeDashboard />; }
