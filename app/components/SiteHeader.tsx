"use client";

import { BarChart3, ChevronDown, Database, FileSearch, Menu, Puzzle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type LinkItem = { href: string; label: string; copy: string; icon: typeof Database };
const openingLinks: LinkItem[] = [
  { href: "/openings", label: "Opening library", copy: "Browse 3,810 lines", icon: Database },
  { href: "/openings/sicilian?tab=puzzles", label: "Opening puzzles", copy: "Train recurring positions", icon: Puzzle },
];
const analysisLinks: LinkItem[] = [
  { href: "/analyze", label: "Import & review", copy: "Chess.com or PGN", icon: FileSearch },
  { href: "/analyze/insights", label: "Your insights", copy: "Strengths and trends", icon: BarChart3 },
  { href: "/analyze/puzzles", label: "Personal puzzles", copy: "Drills from your games", icon: Sparkles },
];

export function SiteHeader({ user }: { user: { displayName: string; email: string } | null }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"openings" | "analyze" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!headerRef.current?.contains(event.target as Node)) setOpenMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpenMenu(null); setMobileOpen(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const dropdown = (id: "openings" | "analyze", label: string, links: LinkItem[]) => (
    <div className="nav-dropdown">
      <button className={pathname.startsWith(`/${id}`) ? "nav-trigger active" : "nav-trigger"} aria-expanded={openMenu === id} aria-controls={`${id}-menu`} onClick={() => setOpenMenu((value) => value === id ? null : id)}>
        {label} <ChevronDown size={14} />
      </button>
      {openMenu === id && <div className="dropdown-menu" id={`${id}-menu`} role="menu">
        {links.map(({ href, label: itemLabel, copy, icon: Icon }) => <Link href={href} key={href} role="menuitem" onClick={() => { setOpenMenu(null); setMobileOpen(false); }}><span className="dropdown-icon"><Icon size={18} /></span><span><strong>{itemLabel}</strong><small>{copy}</small></span></Link>)}
      </div>}
    </div>
  );

  return <header className="site-header" ref={headerRef}>
    <Link href="/" className="brand" aria-label="Opening Lab home"><span className="brand-mark">♞</span><span>OPENING<span>LAB</span></span></Link>
    <button className="mobile-menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
    <nav className={mobileOpen ? "site-nav open" : "site-nav"} aria-label="Primary navigation">
      <Link href="/" className={pathname === "/" ? "active" : ""} onClick={() => setMobileOpen(false)}>Home</Link>
      {dropdown("openings", "Openings", openingLinks)}
      {dropdown("analyze", "Analyze", analysisLinks)}
    </nav>
    <div className="account-control">
      {user ? <><span className="account-avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><span className="account-copy"><strong>{user.displayName}</strong><small>Progress synced</small></span><Link href="/signout-with-chatgpt?return_to=/">Sign out</Link></> : <Link href="/signin-with-chatgpt?return_to=/" className="sign-in-button">Sign in to save</Link>}
    </div>
  </header>;
}
