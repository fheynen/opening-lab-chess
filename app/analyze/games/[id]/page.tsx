import { requireChatGPTUser } from "../../../chatgpt-auth";
import { GameReview } from "./GameReview";
export const dynamic = "force-dynamic";
export default async function GameReviewPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; await requireChatGPTUser(`/analyze/games/${id}`); return <GameReview id={id} />; }

