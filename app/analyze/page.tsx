import { requireChatGPTUser } from "../chatgpt-auth";
import { AnalyzeDashboard } from "./AnalyzeDashboard";
export const dynamic = "force-dynamic";
export default async function AnalyzePage() { await requireChatGPTUser("/analyze"); return <AnalyzeDashboard />; }
