import { getCurrentUser } from "./lib/auth";
import { HomeDashboard } from "./components/HomeDashboard";

export const dynamic = "force-dynamic";
export default async function Home() { const user = await getCurrentUser(); return <HomeDashboard signedIn={Boolean(user)} />; }
