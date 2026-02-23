'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { TrackedToken } from '@/hooks/useTrackedTokens';

// ============================================================
// Types
// ============================================================

interface BYOTokenPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: TrackedToken) => void;
  tokens: TrackedToken[];
  selectedMint: string | null;
}

// ============================================================
// Token row
// ============================================================

function TokenRow({
  token,
  selected,
  onSelect,
}: {
  token: TrackedToken;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        selected
          ? 'bg-[var(--money-green)]/10 border-l-2 border-l-[var(--money-green)]'
          : 'hover:bg-white/5 border-l-2 border-l-transparent'
      }`}
    >
      {/* Token image */}
      {token.tokenImage ? (
        <img
          src={token.tokenImage}
          alt={token.tokenSymbol}
          className="w-9 h-9 rounded-full object-cover border border-[var(--border)] flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold flex-shrink-0">
          {(token.tokenSymbol || '?').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + address */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">
            {token.tokenName || token.tokenSymbol || 'Unknown'}
          </span>
          {token.isVerified && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[var(--money-green)]/15 text-[var(--money-green)]">
              Verified
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--muted)] font-mono truncate">
          {token.tokenMint.slice(0, 20) + '...' + token.tokenMint.slice(-6)}
        </div>
      </div>

      {/* Wallet balance */}
      <div className="text-right flex-shrink-0">
        {token.walletBalance !== undefined && token.walletBalance > 0 ? (
          <div>
            <span className="text-sm text-white font-medium block">
              {token.walletBalance < 0.001
                ? '<0.001'
                : token.walletBalance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </span>
            {token.currentPrice > 0 && (
              <span className="text-[10px] text-[var(--faint)]">
                ≈{(token.walletBalance * token.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--faint)]">0</span>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Modal
// ============================================================

export function BYOTokenPicker({
  open,
  onClose,
  onSelect,
  tokens,
  selectedMint,
}: BYOTokenPickerProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Filter: only tokens the wallet holds, matching search
  const filtered = useMemo(() => {
    // Only show tokens the wallet holds
    const held = tokens.filter((t) => (t.walletBalance ?? 0) > 0);

    if (!search.trim()) return held;
    const q = search.toLowerCase();
    return held.filter(
      (t) =>
        t.tokenSymbol.toLowerCase().includes(q) ||
        t.tokenName.toLowerCase().includes(q) ||
        t.tokenMint.toLowerCase().includes(q)
    );
  }, [tokens, search]);

  // Sort: by wallet balance descending, then symbol
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a.walletBalance ?? 0;
      const bVal = b.walletBalance ?? 0;
      if (bVal !== aVal) return bVal - aVal;
      return (a.tokenSymbol || '').localeCompare(b.tokenSymbol || '');
    });
  }, [filtered]);

  if (!open) return null;

  const totalHeld = tokens.filter((t) => (t.walletBalance ?? 0) > 0).length;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--dark-green-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold text-white">Select BYO Token</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, symbol, or mint..."
            className="w-full bg-[var(--landfill-black)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--money-green)] transition-colors"
          />
        </div>

        {/* Token list */}
        <div className="max-h-[50vh] overflow-y-auto border-t border-[var(--border)]">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">
              {search
                ? 'No tracked tokens match your search'
                : totalHeld === 0
                  ? 'No tracked tokens found in your wallet'
                  : 'No results'}
            </div>
          ) : (
            sorted.map((token) => (
              <TokenRow
                key={token.tokenMint}
                token={token}
                selected={token.tokenMint === selectedMint}
                onSelect={() => {
                  onSelect(token);
                  onClose();
                }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] text-center">
          <span className="text-[10px] text-[var(--faint)]">
            {totalHeld} tracked token{totalHeld !== 1 ? 's' : ''} in wallet
            {' · '}
            Or paste any mint address above
          </span>
        </div>
      </div>
    </div>
  );
}
