import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Indie Tech Services — Repair Tickets & Inventory Engine',
  description: 'Book a repair, track your ticket, buy parts, search documentation and manage inventory deployments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="trace-bg min-h-screen font-sans">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
            <Link href="/" className="font-mono text-sm tracking-wider text-ink">
              INDIE<span className="text-diag">·</span>TECH
            </Link>
            <nav className="flex gap-6 font-mono text-xs tracking-wide text-inkMuted">
              <Link href="/book" className="hover:text-diag transition-colors">
                BOOK REPAIR
              </Link>
              <Link href="/track" className="hover:text-diag transition-colors">
                TRACK TICKET
              </Link>
              <Link href="/shop" className="hover:text-diag transition-colors">
                SHOP
              </Link>
              <Link href="/inventory" className="hover:text-diag transition-colors">
                INVENTORY
              </Link>
              <Link href="/blog" className="hover:text-diag transition-colors">
                BLOG &amp; GUIDES
              </Link>
              <Link href="/analytics" className="hover:text-diag transition-colors">
                ANALYTICS
              </Link>
              <Link href="/search" className="hover:text-diag transition-colors">
                SEARCH
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
        <footer className="mx-auto max-w-3xl px-6 py-8 font-mono text-[11px] text-inkMuted">
          On-site hardware &amp; software repair — Nairobi
        </footer>
      </body>
    </html>
  );
}
