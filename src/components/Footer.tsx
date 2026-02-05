'use client';

import Link from 'next/link';

export function Footer() {
  // Hidden on mobile, only shown on desktop (md+)
  return (
    <footer className="hidden md:block flex-shrink-0" style={{ background: 'transparent', padding: '8px 0' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between py-2.5 px-6 rounded-full" style={{ background: 'var(--sovereign-green)', border: '2px solid var(--hazard-yellow)' }}>
          {/* Left: Title */}
          <span className="text-base font-black uppercase tracking-tight" style={{ color: 'var(--text-light)' }}>
            Sovereign Protocol by WM
          </span>
          
          {/* Center: Docs Link */}
          <Link href="/docs" className="cursor-pointer transition-all hover:opacity-100 text-sm" style={{ color: 'var(--text-light)', opacity: 0.7 }}>
            Docs
          </Link>
          
          {/* Right: Tagline */}
          <span className="text-sm" style={{ color: 'var(--text-light)', opacity: 0.7 }}>
            Institutional Gorbage. On-Chain.
          </span>
        </div>
      </div>
    </footer>
  );
}
