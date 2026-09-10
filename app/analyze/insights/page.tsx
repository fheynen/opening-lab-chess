import { requireUser } from "../../lib/auth";
import { InsightsDashboard } from "./InsightsDashboard";
export const dynamic = "force-dynamic";
export default async function InsightsPage() { await requireUser("/analyze/insights"); return <InsightsDashboard />; }
