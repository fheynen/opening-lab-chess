import { notFound } from "next/navigation";
import { openingPaths } from "../../lib/openings";
import { OpeningWorkspace } from "./OpeningWorkspace";

export default async function OpeningPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!openingPaths.some((path) => path.id === slug)) notFound();
  return <OpeningWorkspace pathId={slug} />;
}
