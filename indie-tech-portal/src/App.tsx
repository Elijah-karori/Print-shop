import { Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Book } from './pages/Book';
import { Track } from './pages/Track';
import { JobCardView } from './pages/JobCardView';
import { Shop } from './pages/Shop';
import { Checkout } from './pages/Checkout';
import { Inventory } from './pages/Inventory';
import { Analytics } from './pages/Analytics';
import { Blog } from './pages/Blog';
import { ArticleDetail } from './pages/ArticleDetail';
import { SearchPage } from './pages/SearchPage';

export function App() {
  return (
    <div className="trace-bg min-h-screen font-sans">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-sm tracking-wider text-ink">
            INDIE<span className="text-diag">·</span>TECH
          </Link>
          <nav className="flex gap-6 font-mono text-xs tracking-wide text-inkMuted">
            <Link to="/book" className="hover:text-diag transition-colors">
              BOOK REPAIR
            </Link>
            <Link to="/track" className="hover:text-diag transition-colors">
              TRACK TICKET
            </Link>
            <Link to="/shop" className="hover:text-diag transition-colors">
              SHOP
            </Link>
            <Link to="/inventory" className="hover:text-diag transition-colors">
              INVENTORY
            </Link>
            <Link to="/blog" className="hover:text-diag transition-colors">
              BLOG &amp; GUIDES
            </Link>
            <Link to="/analytics" className="hover:text-diag transition-colors">
              ANALYTICS
            </Link>
            <Link to="/search" className="hover:text-diag transition-colors">
              SEARCH
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/jobcard/:code" element={<JobCardView />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/checkout" element={<Checkout />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<ArticleDetail />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-8 font-mono text-[11px] text-inkMuted">
        On-site hardware &amp; software repair — Nairobi
      </footer>
    </div>
  );
}
