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
  '/': '👑 $OVEREIGNS',
  '/mint': '🚀 LAUNCH',
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: '/mint', label: 'Mint' },
    { href: '/', label: '$overeigns' },
  ];

  // Get current page title for mobile
  const currentPageTitle = pageTitles[pathname] || '';

  return (
    <nav className="flex-shrink-0" style={{ background: 'transparent', padding: '8px 0' }}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Desktop Navbar */}
        <div className="hidden md:flex items-center justify-between rounded-full overflow-hidden h-14" style={{ background: 'var(--sovereign-green)', border: '2px solid var(--hazard-yellow)' }}>
          {/* Logo/Title with white background */}
          <Link href="/" className="flex items-center bg-white px-6 h-full -my-px -ml-px rounded-l-full">
            <img src="/logo.png" alt="WM Sovereign" className="h-12 w-auto" />
          </Link>
          
          {/* Navigation Links - Horizontal Row */}
          <div className="flex items-center space-x-3 px-4">
            {links.map((link) => {
              const isActive = link.href === '/' 
                ? pathname === '/'
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? 'btn-primary'
                      : 'hover:bg-white/10'
                  }`}
                  style={{ color: isActive ? undefined : 'var(--text-light)' }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          
          {/* Wallet Button */}
          <div className="scale-90 pr-4">
            <ConnectWalletButton />
          </div>
        </div>

        {/* Mobile Navbar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between rounded-2xl overflow-hidden h-12" style={{ background: 'var(--sovereign-green)', border: '2px solid var(--hazard-yellow)' }}>
            <Link href="/" className="flex items-center bg-white px-3 h-full -my-px -ml-px rounded-l-2xl">
              <img src="/logo.png" alt="WM Sovereign" className="h-10 w-auto" />
            </Link>
            
            {/* Page Title in Center */}
            {currentPageTitle && (
              <span className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--hazard-yellow)' }}>
                {currentPageTitle}
              </span>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-xl px-3"
              style={{ color: 'var(--text-light)' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'var(--sovereign-green)', border: '2px solid var(--hazard-yellow)' }}>
              <div className="flex flex-col p-2 space-y-1">
                {links.map((link) => {
                  const isActive = link.href === '/' 
                    ? pathname === '/'
                    : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isActive
                          ? 'btn-primary'
                          : 'hover:bg-white/10'
                      }`}
                      style={{ color: isActive ? undefined : 'var(--text-light)' }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="px-2 py-2">
                  <ConnectWalletButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
