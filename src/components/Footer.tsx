'use client';

import Link from 'next/link';

export function Footer() {
  // Hidden on mobile, only shown on desktop (md+)
  return (
    <footer className="hidden md:block flex-shrink-0" style={{ padding: '8px 0' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between py-3 px-6">
          {/* Left: Title */}
          <span
            className="text-base font-black uppercase tracking-tight"
            style={{
              color: '#d4ffe6',
              textShadow: '0 0 8px rgba(200,255,220,0.6), 0 0 20px rgba(46,235,127,0.35), 0 0 40px rgba(46,235,127,0.15)',
            }}
          >
            Sovereign Protocol by WM
          </span>
          
          {/* Center: Docs Link */}
          <Link
            href="/docs"
            className="cursor-pointer transition-all text-sm"
            style={{
              color: 'rgba(200,255,220,0.5)',
              textShadow: '0 0 6px rgba(46,235,127,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#d4ffe6';
              e.currentTarget.style.textShadow = '0 0 8px rgba(200,255,220,0.7), 0 0 20px rgba(46,235,127,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(200,255,220,0.5)';
              e.currentTarget.style.textShadow = '0 0 6px rgba(46,235,127,0.2)';
            }}
          >
            Docs
          </Link>
          
          {/* Right: Tagline */}
          <span
            className="text-sm"
            style={{
              color: 'rgba(200,255,220,0.35)',
              textShadow: '0 0 6px rgba(46,235,127,0.15)',
            }}
          >
            Institutional Gorbage. On-Chain.
          </span>
        </div>
      </div>
    </footer>
  );
}
