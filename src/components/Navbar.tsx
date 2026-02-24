'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const ConnectWalletButton = dynamic(
  () => import('./ConnectWalletButton').then(mod => ({ default: mod.ConnectWalletButton })),
  { ssr: false }
);

// Map routes to page titles for mobile header
const pageTitles: Record<string, string> = {
  '/': '🏠 HOME',
  '/sovereigns': '👑 $OVEREIGNS',
  '/mint': '🚀 LAUNCH',
  '/governance': '🏛️ GOVERNANCE',
  '/governance/creator': '🏛️ GOVERNANCE',
  '/swap': '💱 SWAP',
  '/marketplace': '🏪 LP MARKETPLACE',
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const leftLinks = [
    { href: '/sovereigns', label: '$overeigns' },
    { href: '/swap', label: 'Swap' },
    { href: '/mint', label: 'Go $overeign' },
  ];
  const rightLinks = [
    { href: '/marketplace', label: 'LP Marketplace' },
    { href: '/governance', label: 'Governance' },
  ];
  const allLinks = [...leftLinks, ...rightLinks];

  // Get current page title for mobile
  const currentPageTitle = pageTitles[pathname] || '';

  const renderLink = (link: { href: string; label: string }) => {
    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
    return (
      <Link
        key={link.href}
        href={link.href}
        className="px-3 py-1.5 text-sm font-bold transition-all"
        style={isActive ? {
          color: '#d4ffe6',
          textShadow: '0 0 8px rgba(200,255,220,0.7), 0 0 20px rgba(46,235,127,0.5), 0 0 40px rgba(46,235,127,0.2)',
        } : {
          color: 'rgba(200,255,220,0.45)',
          textShadow: '0 0 4px rgba(46,235,127,0.15)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = '#d4ffe6';
            e.currentTarget.style.textShadow = '0 0 8px rgba(200,255,220,0.6), 0 0 20px rgba(46,235,127,0.35)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'rgba(200,255,220,0.45)';
            e.currentTarget.style.textShadow = '0 0 4px rgba(46,235,127,0.15)';
          }
        }}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="flex-shrink-0" style={{ padding: '8px 0' }}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Desktop Navbar */}
        <div className="hidden md:flex items-center h-14 relative">
          {/* Left links — push to left of center */}
          <div className="flex items-center gap-1 flex-1 justify-end pr-4">
            {leftLinks.map(renderLink)}
          </div>

          {/* Center Logo — absolutely centered */}
          <Link href="/" className="flex items-center transition-all hover:brightness-110 flex-shrink-0">
            <img src="/logo_plain.png" alt="WM Sovereign" className="h-20 w-auto" style={{ filter: 'drop-shadow(0 0 6px rgba(200,255,220,0.7)) drop-shadow(0 0 14px rgba(46,235,127,0.5)) drop-shadow(0 0 30px rgba(46,235,127,0.35)) drop-shadow(0 0 60px rgba(46,235,127,0.2))' }} />
          </Link>

          {/* Right links + wallet — push to right of center */}
          <div className="flex items-center gap-1 flex-1 pl-4">
            {rightLinks.map(renderLink)}
            <div className="scale-90 ml-auto">
              <ConnectWalletButton />
            </div>
          </div>
        </div>

        {/* Mobile Navbar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between h-12 px-2">
            <Link href="/" className="flex items-center">
              <img src="/logo_plain.png" alt="WM Sovereign" className="h-16 w-auto" style={{ filter: 'drop-shadow(0 0 5px rgba(200,255,220,0.7)) drop-shadow(0 0 12px rgba(46,235,127,0.5)) drop-shadow(0 0 24px rgba(46,235,127,0.35)) drop-shadow(0 0 48px rgba(46,235,127,0.2))' }} />
            </Link>
            
            {/* Page Title in Center */}
            {currentPageTitle && (
              <span
                className="text-sm font-black uppercase tracking-tight"
                style={{
                  color: '#d4ffe6',
                  textShadow: '0 0 8px rgba(200,255,220,0.6), 0 0 20px rgba(46,235,127,0.35)',
                }}
              >
                {currentPageTitle}
              </span>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-xl px-2 transition-all"
              style={{
                color: 'rgba(200,255,220,0.5)',
                textShadow: '0 0 6px rgba(46,235,127,0.2)',
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mt-2 py-2 px-2 space-y-1">
              {allLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-sm font-bold transition-all"
                    style={isActive ? {
                      color: '#d4ffe6',
                      textShadow: '0 0 8px rgba(200,255,220,0.7), 0 0 20px rgba(46,235,127,0.5), 0 0 40px rgba(46,235,127,0.2)',
                    } : {
                      color: 'rgba(200,255,220,0.4)',
                      textShadow: '0 0 4px rgba(46,235,127,0.1)',
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="px-2 py-2">
                <ConnectWalletButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
