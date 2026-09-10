import { requireUser } from "../../lib/auth";
import { PersonalPuzzlePage } from "./PersonalPuzzlePage";
export const dynamic = "force-dynamic";
export default async function PersonalPuzzlesPage() { await requireUser("/analyze/puzzles"); return <PersonalPuzzlePage />; }
