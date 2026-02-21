'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTokenImage } from '@/hooks/useTokenImage';

// ============================================================
// Types
// ============================================================

export interface TradableToken {
  sovereignId: string;
  name: string;
  tokenSymbol: string;
  tokenName: string;
  tokenMint: string;
  metadataUri?: string;
  status: string;
  balance?: number; // wallet balance of this token
}

interface TokenPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sovereignId: string) => void;
  tokens: TradableToken[];
  selectedSovereignId: string | null;
}

// ============================================================
// Token row with lazy-loaded image
// ============================================================

function TokenRow({
  token,
  selected,
  onSelect,
}: {
  token: TradableToken;
  selected: boolean;
  onSelect: () => void;
}) {
  const { data: imageUrl } = useTokenImage(token.metadataUri);

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
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={token.tokenSymbol}
          className="w-9 h-9 rounded-full object-cover border border-[var(--border)] flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold flex-shrink-0">
          {(token.tokenSymbol || '?').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">
            {token.tokenSymbol || token.name}
          </span>
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
            token.status === 'Active'
              ? 'bg-[var(--money-green)]/15 text-[var(--money-green)]'
              : token.status === 'Recovery'
              ? 'bg-[var(--hazard-yellow)]/15 text-[var(--hazard-yellow)]'
              : 'bg-white/10 text-[var(--muted)]'
          }`}>
            {token.status}
          </span>
        </div>
        <div className="text-[11px] text-[var(--muted)] truncate">
          {token.tokenName || token.name}
        </div>
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0">
        {token.balance !== undefined && token.balance > 0 ? (
          <span className="text-sm text-white font-medium">
            {token.balance < 0.001
              ? '<0.001'
              : token.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
          </span>
        ) : (
          <span className="text-xs text-[var(--faint)]">—</span>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Modal
// ============================================================

export function TokenPickerModal({
  open,
  onClose,
  onSelect,
  tokens,
  selectedSovereignId,
}: TokenPickerModalProps) {
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

  // Filter tokens
  const filtered = useMemo(() => {
    if (!search.trim()) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tokenSymbol?.toLowerCase().includes(q) ||
        t.tokenName?.toLowerCase().includes(q) ||
        t.tokenMint.toLowerCase().includes(q) ||
        t.sovereignId.includes(q)
    );
  }, [tokens, search]);

  // Sort: tokens with balance first, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aHas = (a.balance ?? 0) > 0 ? 1 : 0;
      const bHas = (b.balance ?? 0) > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return (a.tokenSymbol || a.name).localeCompare(b.tokenSymbol || b.name);
    });
  }, [filtered]);

  if (!open) return null;

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
          <h2 className="text-sm font-bold text-white">Select a token</h2>
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
              {search ? 'No tokens match your search' : 'No tradable tokens found'}
            </div>
          ) : (
            sorted.map((token) => (
              <TokenRow
                key={token.sovereignId}
                token={token}
                selected={token.sovereignId === selectedSovereignId}
                onSelect={() => {
                  onSelect(token.sovereignId);
                  onClose();
                }}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] text-center">
          <span className="text-[10px] text-[var(--faint)]">
            {tokens.length} tradable sovereign{tokens.length !== 1 ? 's' : ''} available
          </span>
        </div>
      </div>
    </div>
  );
}
