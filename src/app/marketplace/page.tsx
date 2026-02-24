'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  useSovereigns,
  useReadOnlyProgram,
  useProgram,
  useBuyNft,
  useDelistNft,
  QUERY_KEYS,
} from '@/hooks';
import { fetchNftListing } from '@/lib/program/client';
import { LAMPORTS_PER_GOR, config } from '@/lib/config';
import type { GenesisNftData } from '@/hooks/useNfts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================
// Types
// ============================================================

interface EnrichedNft extends GenesisNftData {
  sovereignName: string;
  tokenSymbol: string;
  depositGor: number;
  sharesPercent: number;
  positionValueGor: number;
  lpFeesGor: number;
  annualReturnPct: number;
  isListed: boolean;
  listingPriceGor: number | null;
  listingPriceLamports: string | null;
  isOwn: boolean;
  sovereignStatus: string;
  totalDepositedGor: number;
  totalFeesCollectedGor: number;
  recoveryComplete: boolean;
  poolAgeSeconds: number;
}

type SortField = 'value' | 'share' | 'price' | 'return' | 'recent';
type ListingFilter = 'all' | 'listed' | 'unlisted' | 'mine';

// ============================================================
// Fetcher
// ============================================================

async function fetchAllNfts(): Promise<GenesisNftData[]> {
  const res = await fetch(`${API_URL}/api/nfts?limit=500`);
  if (!res.ok) throw new Error(`Failed to fetch marketplace NFTs: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

// ============================================================
// Page
// ============================================================

export default function MarketplacePage() {
  const { connected, publicKey } = useWallet();
  const walletAddr = publicKey?.toBase58();
  const readOnlyProgram = useReadOnlyProgram();
  const program = useProgram();
  const queryClient = useQueryClient();

  // ── State ──
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('value');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSovereign, setSelectedSovereign] = useState<string>('all');
  const [selectedNft, setSelectedNft] = useState<string | null>(null);
  const [listingData, setListingData] = useState<Record<string, { price: string; isListed: boolean }>>({});

  // ── Data hooks ──
  const { data: sovereigns, isLoading: sovLoading } = useSovereigns();
  const { data: allNfts, isLoading: nftsLoading, refetch: refetchNfts } = useQuery({
    queryKey: ['marketplaceNfts'],
    queryFn: fetchAllNfts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Transaction hooks ──
  const buyNft = useBuyNft();
  const delistNft = useDelistNft();

  // ── Load on-chain listing data ──
  useEffect(() => {
    if (!allNfts || !readOnlyProgram) return;
    let cancelled = false;

    async function loadListings() {
      const data: Record<string, { price: string; isListed: boolean }> = {};
      // Batch fetch in groups of 10
      for (let i = 0; i < allNfts!.length; i += 10) {
        const batch = allNfts!.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(nft =>
            fetchNftListing(readOnlyProgram!, new PublicKey(nft.mint))
          )
        );
        results.forEach((result, idx) => {
          const nft = batch[idx];
          if (result.status === 'fulfilled' && result.value) {
            data[nft.mint] = {
              price: result.value.price.toString(),
              isListed: true,
            };
          } else {
            data[nft.mint] = { price: '0', isListed: false };
          }
        });
      }
      if (!cancelled) setListingData(data);
    }

    loadListings();
    return () => { cancelled = true; };
  }, [allNfts, readOnlyProgram]);

  // ── Build sovereign lookup ──
  const sovereignMap = useMemo(() => {
    if (!sovereigns) return new Map<string, any>();
    return new Map(sovereigns.map((s: any) => [s.publicKey, s]));
  }, [sovereigns]);

  // ── Enrich NFTs ──
  const enrichedNfts: EnrichedNft[] = useMemo(() => {
    if (!allNfts) return [];

    return allNfts.map((nft) => {
      const sov = sovereignMap.get(nft.sovereign);
      const depositGor = Number(nft.depositAmount) / LAMPORTS_PER_GOR;
      const sharesPercent = nft.sharesBps / 100;
      const totalDepositedGor = sov?.totalDepositedGor || 0;
      const totalFeesCollectedGor = sov?.totalFeesCollectedGor || 0;
      const recoveryComplete = sov?.recoveryComplete || false;
      const createdAt = sov?.createdAt ? new Date(sov.createdAt).getTime() / 1000 : 0;
      const now = Date.now() / 1000;
      const poolAgeSeconds = createdAt > 0 ? now - createdAt : 0;
      const poolAgeYears = poolAgeSeconds / (365.25 * 24 * 3600);

      // Estimate LP fees share
      const shareFraction = nft.sharesBps / 10000;
      const positionLpFees = totalFeesCollectedGor * shareFraction;
      const positionValue = depositGor + positionLpFees;
      const annualReturn =
        poolAgeYears > 0 && depositGor > 0
          ? ((positionLpFees / depositGor) / poolAgeYears) * 100
          : 0;

      const listing = listingData[nft.mint];

      return {
        ...nft,
        sovereignName: sov?.name || `Sovereign`,
        tokenSymbol: sov?.tokenSymbol || 'TOKEN',
        depositGor,
        sharesPercent,
        positionValueGor: positionValue,
        lpFeesGor: positionLpFees,
        annualReturnPct: annualReturn,
        isListed: listing?.isListed || false,
        listingPriceGor: listing?.isListed ? Number(listing.price) / LAMPORTS_PER_GOR : null,
        listingPriceLamports: listing?.isListed ? listing.price : null,
        isOwn: walletAddr ? nft.owner === walletAddr : false,
        sovereignStatus: sov?.status || 'Unknown',
        totalDepositedGor,
        totalFeesCollectedGor,
        recoveryComplete,
        poolAgeSeconds,
      } as EnrichedNft;
    });
  }, [allNfts, sovereignMap, listingData, walletAddr]);

  // ── Filter & sort ──
  const filteredNfts = useMemo(() => {
    let results = enrichedNfts;

    // Sovereign filter
    if (selectedSovereign !== 'all') {
      results = results.filter((n) => n.sovereign === selectedSovereign);
    }

    // Listing filter
    if (listingFilter === 'listed') {
      results = results.filter((n) => n.isListed);
    } else if (listingFilter === 'unlisted') {
      results = results.filter((n) => !n.isListed);
    } else if (listingFilter === 'mine') {
      results = results.filter((n) => n.isOwn);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (n) =>
          n.sovereignName.toLowerCase().includes(q) ||
          n.tokenSymbol.toLowerCase().includes(q) ||
          n.mint.toLowerCase().includes(q) ||
          n.owner.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...results];
    switch (sortBy) {
      case 'value':
        sorted.sort((a, b) => b.positionValueGor - a.positionValueGor);
        break;
      case 'share':
        sorted.sort((a, b) => b.sharesBps - a.sharesBps);
        break;
      case 'price':
        sorted.sort((a, b) => {
          if (a.isListed && !b.isListed) return -1;
          if (!a.isListed && b.isListed) return 1;
          return (b.listingPriceGor || 0) - (a.listingPriceGor || 0);
        });
        break;
      case 'return':
        sorted.sort((a, b) => b.annualReturnPct - a.annualReturnPct);
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime());
        break;
    }

    return sorted;
  }, [enrichedNfts, selectedSovereign, listingFilter, searchQuery, sortBy]);

  // ── Counts ──
  const listedCount = enrichedNfts.filter((n) => n.isListed).length;
  const ownCount = enrichedNfts.filter((n) => n.isOwn).length;

  // ── Selected NFT detail ──
  const selected = selectedNft ? enrichedNfts.find((n) => n.mint === selectedNft) ?? null : null;

  // ── Handlers ──
  const handleBuy = useCallback(
    async (nft: EnrichedNft) => {
      if (!nft.isListed || !program) return;
      const sov = sovereignMap.get(nft.sovereign);
      if (!sov) return;

      try {
        await buyNft.mutateAsync({
          sovereignId: sov.sovereignId,
          nftMint: nft.mint,
          seller: nft.owner,
          royaltyWallet: sov.creator,
        });
        refetchNfts();
      } catch (err) {
        console.error('Buy failed:', err);
      }
    },
    [program, sovereignMap, buyNft, refetchNfts]
  );

  const handleDelist = useCallback(
    async (nft: EnrichedNft) => {
      if (!nft.isListed || !program) return;
      const sov = sovereignMap.get(nft.sovereign);
      if (!sov) return;

      try {
        await delistNft.mutateAsync({
          sovereignId: sov.sovereignId,
          nftMint: nft.mint,
          seller: nft.owner,
        });
        refetchNfts();
      } catch (err) {
        console.error('Delist failed:', err);
      }
    },
    [program, sovereignMap, delistNft, refetchNfts]
  );

  // ── Sovereign list for filter dropdown ──
  const sovereignOptions = useMemo(() => {
    if (!sovereigns) return [];
    const withNfts = sovereigns.filter((s: any) =>
      enrichedNfts.some((n) => n.sovereign === s.publicKey)
    );
    return withNfts.map((s: any) => ({
      publicKey: s.publicKey,
      name: s.name,
      symbol: s.tokenSymbol,
    }));
  }, [sovereigns, enrichedNfts]);

  const isLoading = sovLoading || nftsLoading;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8" />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Positions', value: enrichedNfts.length, icon: '🎫' },
          { label: 'Listed for Sale', value: listedCount, icon: '🏷️' },
          { label: 'Sovereigns', value: sovereignOptions.length, icon: '👑' },
          {
            label: 'Your Positions',
            value: connected ? ownCount : '—',
            icon: '👤',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: 'rgba(46,235,127,0.04)',
              border: '1px solid rgba(46,235,127,0.12)',
            }}
          >
            <div className="text-xl mb-1">{stat.icon}</div>
            <div
              className="text-xl font-bold"
              style={{
                color: '#d4ffe6',
                textShadow: '0 0 10px rgba(46,235,127,0.4)',
              }}
            >
              {isLoading ? '…' : stat.value}
            </div>
            <div className="text-[10px] text-[var(--muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, symbol, mint, or owner…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none"
            style={{
              background: 'rgba(46,235,127,0.04)',
              border: '1px solid rgba(46,235,127,0.15)',
            }}
          />
        </div>

        {/* Sovereign filter */}
        <select
          value={selectedSovereign}
          onChange={(e) => setSelectedSovereign(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
          style={{
            background: 'rgba(46,235,127,0.04)',
            border: '1px solid rgba(46,235,127,0.15)',
          }}
        >
          <option value="all">All Sovereigns</option>
          {sovereignOptions.map((s) => (
            <option key={s.publicKey} value={s.publicKey}>
              {s.name} ({s.symbol})
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
          style={{
            background: 'rgba(46,235,127,0.04)',
            border: '1px solid rgba(46,235,127,0.15)',
          }}
        >
          <option value="value">Sort: Value</option>
          <option value="share">Sort: Share %</option>
          <option value="price">Sort: Price</option>
          <option value="return">Sort: Return</option>
          <option value="recent">Sort: Recent</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(
          [
            { key: 'all', label: 'All', count: enrichedNfts.length },
            { key: 'listed', label: 'For Sale', count: listedCount },
            { key: 'unlisted', label: 'Not Listed', count: enrichedNfts.length - listedCount },
            ...(connected ? [{ key: 'mine', label: 'My Positions', count: ownCount }] : []),
          ] as { key: ListingFilter; label: string; count: number }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setListingFilter(tab.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={
              listingFilter === tab.key
                ? {
                    background: 'rgba(46,235,127,0.15)',
                    color: '#d4ffe6',
                    border: '1px solid rgba(46,235,127,0.4)',
                    boxShadow: '0 0 12px rgba(46,235,127,0.2)',
                    textShadow: '0 0 8px rgba(46,235,127,0.5)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid rgba(46,235,127,0.1)',
                  }
            }
          >
            {tab.label}
            <span className="ml-1.5 opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 animate-pulse"
              style={{
                background: 'rgba(46,235,127,0.03)',
                border: '1px solid rgba(46,235,127,0.08)',
              }}
            >
              <div className="h-4 w-24 bg-[var(--border)] rounded mb-3" />
              <div className="h-8 w-16 bg-[var(--border)] rounded mb-3" />
              <div className="h-3 w-full bg-[var(--border)] rounded mb-2" />
              <div className="h-3 w-2/3 bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredNfts.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: 'rgba(46,235,127,0.03)',
            border: '1px solid rgba(46,235,127,0.08)',
          }}
        >
          <div className="text-4xl mb-3">🏪</div>
          <h3
            className="font-bold text-lg mb-2"
            style={{ color: '#d4ffe6' }}
          >
            {enrichedNfts.length === 0
              ? 'No positions minted yet'
              : 'No positions match your filters'}
          </h3>
          <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
            {enrichedNfts.length === 0
              ? 'LP positions appear here once depositors mint NFTs from their sovereign positions.'
              : 'Try adjusting your filters or search query.'}
          </p>
          {enrichedNfts.length === 0 && (
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(46,235,127,0.12)',
                color: '#d4ffe6',
                border: '1px solid rgba(46,235,127,0.3)',
              }}
            >
              Browse $overeigns
            </Link>
          )}
        </div>
      )}

      {/* NFT Grid */}
      {!isLoading && filteredNfts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNfts.map((nft) => (
            <button
              key={nft.mint}
              onClick={() =>
                setSelectedNft(selectedNft === nft.mint ? null : nft.mint)
              }
              className="text-left rounded-xl p-4 transition-all group"
              style={
                selectedNft === nft.mint
                  ? {
                      background: 'rgba(46,235,127,0.06)',
                      border: '1px solid rgba(46,235,127,0.4)',
                      boxShadow: '0 0 20px rgba(46,235,127,0.15)',
                    }
                  : {
                      background: 'rgba(46,235,127,0.02)',
                      border: `1px solid ${nft.isOwn ? 'rgba(46,235,127,0.25)' : 'rgba(46,235,127,0.08)'}`,
                    }
              }
            >
              {/* Top row: sovereign + badges */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-[var(--muted)] truncate">
                    {nft.sovereignName}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(46,235,127,0.08)',
                      color: 'var(--muted)',
                    }}
                  >
                    {nft.tokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {nft.isOwn && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(46,235,127,0.12)',
                        color: '#d4ffe6',
                      }}
                    >
                      Yours
                    </span>
                  )}
                  {nft.isListed && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(46,235,127,0.15)',
                        color: 'var(--money-green)',
                        textShadow: '0 0 6px rgba(46,235,127,0.4)',
                      }}
                    >
                      For Sale
                    </span>
                  )}
                </div>
              </div>

              {/* Share % */}
              <div
                className="text-2xl font-black mb-3"
                style={{
                  color: '#d4ffe6',
                  textShadow: '0 0 12px rgba(46,235,127,0.3)',
                }}
              >
                {nft.sharesPercent.toFixed(2)}%
              </div>

              {/* Stats */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Value</span>
                  <span className="text-white font-medium">
                    {nft.positionValueGor.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{' '}
                    GOR
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--muted)]">LP Fees Earned</span>
                  <span
                    className="font-medium"
                    style={{ color: nft.lpFeesGor > 0 ? 'var(--money-green)' : 'var(--muted)' }}
                  >
                    {nft.lpFeesGor > 0
                      ? `+${nft.lpFeesGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR`
                      : '—'}
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Annual Return</span>
                  <span
                    className="font-medium"
                    style={{ color: nft.annualReturnPct > 0 ? 'var(--money-green)' : 'var(--muted)' }}
                  >
                    {nft.annualReturnPct > 0 ? `${nft.annualReturnPct.toFixed(1)}%` : '—'}
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Owner</span>
                  <span className="text-white font-mono text-[10px]">
                    {nft.isOwn
                      ? 'You'
                      : `${nft.owner.slice(0, 4)}…${nft.owner.slice(-4)}`}
                  </span>
                </div>

                {/* Listing price */}
                {nft.isListed && nft.listingPriceGor && (
                  <div
                    className="flex justify-between text-[11px] pt-1.5 mt-1.5"
                    style={{ borderTop: '1px solid rgba(46,235,127,0.1)' }}
                  >
                    <span className="text-[var(--muted)]">Asking Price</span>
                    <span
                      className="font-bold"
                      style={{
                        color: 'var(--money-green)',
                        textShadow: '0 0 8px rgba(46,235,127,0.4)',
                      }}
                    >
                      {nft.listingPriceGor.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{' '}
                      GOR
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Expanded Detail Panel ── */}
      {selected && (
        <div
          className="mt-6 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{
            background: 'rgba(46,235,127,0.03)',
            border: '1px solid rgba(46,235,127,0.2)',
            boxShadow: '0 0 30px rgba(46,235,127,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-sm font-bold"
                style={{ color: '#d4ffe6' }}
              >
                Position Details
              </h3>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                {selected.sovereignName} · {selected.tokenSymbol} · {selected.name}
              </p>
            </div>
            <button
              onClick={() => setSelectedNft(null)}
              className="text-[var(--muted)] hover:text-white text-xs px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">Owner</span>
              <a
                href={`${config.explorerUrl}/address/${selected.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate block"
                style={{ color: 'var(--money-green)' }}
              >
                {selected.isOwn
                  ? 'You'
                  : `${selected.owner.slice(0, 8)}…${selected.owner.slice(-8)}`}
              </a>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">NFT Mint</span>
              <a
                href={`${config.explorerUrl}/address/${selected.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate block"
                style={{ color: 'var(--money-green)' }}
              >
                {selected.mint.slice(0, 8)}…{selected.mint.slice(-8)}
              </a>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">
                Original Deposit
              </span>
              <span className="text-white font-medium">
                {selected.depositGor.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">Share</span>
              <span className="text-white font-medium">
                {selected.sharesPercent.toFixed(2)}%
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">
                Accrued LP Fees
              </span>
              <span className="font-medium" style={{ color: 'var(--money-green)' }}>
                +
                {selected.lpFeesGor.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">
                Estimated Value
              </span>
              <span
                className="font-bold text-sm"
                style={{
                  color: 'var(--money-green)',
                  textShadow: '0 0 8px rgba(46,235,127,0.3)',
                }}
              >
                {selected.positionValueGor.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                GOR
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">
                Annual Return
              </span>
              <span
                className="font-bold text-sm"
                style={{
                  color: selected.annualReturnPct > 0 ? 'var(--money-green)' : 'var(--muted)',
                }}
              >
                {selected.annualReturnPct > 0
                  ? `${selected.annualReturnPct.toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[var(--muted)] block text-[10px] mb-0.5">
                Sovereign Status
              </span>
              <span className="text-white font-medium">{selected.sovereignStatus}</span>
            </div>
          </div>

          {/* Minted date */}
          <div className="text-[10px] text-[var(--faint)] mt-3">
            Minted {new Date(selected.mintedAt).toLocaleDateString()}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            {/* Buy button — listed and not own */}
            {selected.isListed && !selected.isOwn && connected && (
              <button
                onClick={() => handleBuy(selected)}
                disabled={buyNft.isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(46,235,127,0.15)',
                  color: '#d4ffe6',
                  border: '1px solid rgba(46,235,127,0.4)',
                  boxShadow: '0 0 15px rgba(46,235,127,0.2)',
                  textShadow: '0 0 8px rgba(46,235,127,0.5)',
                }}
              >
                {buyNft.isPending
                  ? 'Buying…'
                  : `Buy for ${selected.listingPriceGor?.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR`}
              </button>
            )}

            {/* Delist button — listed and own */}
            {selected.isListed && selected.isOwn && connected && (
              <button
                onClick={() => handleDelist(selected)}
                disabled={delistNft.isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                {delistNft.isPending ? 'Delisting…' : 'Delist'}
              </button>
            )}

            {/* View sovereign link */}
            <Link
              href={`/sovereign/${selected.sovereign}`}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-center"
              style={{
                background: 'rgba(46,235,127,0.06)',
                color: 'var(--muted)',
                border: '1px solid rgba(46,235,127,0.12)',
              }}
            >
              View $overeign →
            </Link>
          </div>

          {/* Not connected prompt */}
          {selected.isListed && !connected && (
            <p
              className="text-xs mt-3 text-center"
              style={{ color: 'var(--muted)' }}
            >
              Connect your wallet to buy this position.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
