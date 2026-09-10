import { getChatGPTUser } from "./chatgpt-auth";
import { HomeDashboard } from "./components/HomeDashboard";

export const dynamic = "force-dynamic";
export default async function Home() { const user = await getChatGPTUser(); return <HomeDashboard signedIn={Boolean(user)} />; }
