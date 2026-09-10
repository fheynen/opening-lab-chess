import { requireChatGPTUser } from "../../chatgpt-auth";
import { InsightsDashboard } from "./InsightsDashboard";
export const dynamic = "force-dynamic";
export default async function InsightsPage() { await requireChatGPTUser("/analyze/insights"); return <InsightsDashboard />; }

