import { notFound } from "next/navigation";
import { OpeningTrainer } from "../../../OpeningTrainer";
import { openings } from "../../../lib/openings";

export default async function DatabaseOpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const opening = openings.find((item) => item.id === decodeURIComponent(id)); if (!opening) notFound();
  return <main className="opening-workspace-page"><section className="opening-banner"><div><p className="eyebrow">Opening database · {opening.eco}</p><h1>{opening.name}</h1><p>Explore the line, then switch into practice mode to test your recall.</p></div></section><OpeningTrainer initialOpeningId={opening.id} initialDatabaseMode /></main>;
}
