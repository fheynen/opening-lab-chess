import type { Metadata } from "next";
import { headers } from "next/headers";
import { getChatGPTUser } from "./chatgpt-auth";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const title = "Opening Lab — Study. Review. Improve.";
  const description =
    "Build your opening repertoire, review your games, discover recurring weaknesses, and train the positions that matter.";

  return {
    metadataBase: baseUrl,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og.png", width: 1736, height: 906, alt: "Opening Lab — Study. Review. Improve." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><LayoutBody>{children}</LayoutBody></body>
    </html>
  );
}

async function LayoutBody({ children }: { children: React.ReactNode }) {
  const user = await getChatGPTUser();
  return <><SiteHeader user={user ? { displayName: user.displayName, email: user.email } : null} />{children}<footer className="site-footer">Opening data and puzzles from Lichess · Engine analysis by Stockfish · Opening Lab keeps chess facts grounded in engine output.</footer></>;
}
