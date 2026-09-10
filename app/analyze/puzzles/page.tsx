import { requireChatGPTUser } from "../../chatgpt-auth";
import { PersonalPuzzlePage } from "./PersonalPuzzlePage";
export const dynamic = "force-dynamic";
export default async function PersonalPuzzlesPage() { await requireChatGPTUser("/analyze/puzzles"); return <PersonalPuzzlePage />; }
