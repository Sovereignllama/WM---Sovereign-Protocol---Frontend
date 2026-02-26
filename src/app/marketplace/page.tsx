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
  useListNft,
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
  sovereignId: string;
  tokenName: string;
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
  listingSeller: string | null;
  sovereignStatus: string;
  totalDepositedGor: number;
  totalFeesCollectedGor: number;
  recoveryComplete: boolean;
  poolAgeSeconds: number;
}

type SortField = 'value' | 'share' | 'price' | 'return' | 'recent' | 'mine';

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
  const [sortBy, setSortBy] = useState<SortField>('value');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSovereign, setSelectedSovereign] = useState<string>('all');
  const [selectedNft, setSelectedNft] = useState<string | null>(null);
  const [listingData, setListingData] = useState<Record<string, { price: string; isListed: boolean; seller?: string }>>({});

  // ── Data hooks ──
  const { data: sovereigns, isLoading: sovLoading } = useSovereigns();
  const { data: allNfts, isLoading: nftsLoading, refetch: refetchNfts } = useQuery({
    queryKey: ['marketplaceNfts'],
    queryFn: fetchAllNfts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Modal state ──
  const [showNftPicker, setShowNftPicker] = useState(false);
  const [listingNft, setListingNft] = useState<EnrichedNft | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [changePriceNft, setChangePriceNft] = useState<EnrichedNft | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [buySuccess, setBuySuccess] = useState<{ nft: EnrichedNft; price: number } | null>(null);

  // ── Transaction hooks ──
  const buyNft = useBuyNft();
  const delistNft = useDelistNft();
  const listNft = useListNft();

  // ── Load on-chain listing data ──
  useEffect(() => {
    if (!allNfts || !readOnlyProgram) return;
    let cancelled = false;

    async function loadListings() {
      const data: Record<string, { price: string; isListed: boolean; seller?: string }> = {};
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
              seller: result.value.seller?.toBase58?.() || result.value.seller?.toString?.() || '',
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
        sovereignId: sov?.sovereignId || '',
        tokenName: sov?.tokenName || '',
        tokenSymbol: sov?.tokenSymbol || 'TOKEN',
        depositGor,
        sharesPercent,
        positionValueGor: positionValue,
        lpFeesGor: positionLpFees,
        annualReturnPct: annualReturn,
        isListed: listing?.isListed || false,
        listingPriceGor: listing?.isListed ? Number(listing.price) / LAMPORTS_PER_GOR : null,
        listingPriceLamports: listing?.isListed ? listing.price : null,
        isOwn: walletAddr
          ? (nft.owner === walletAddr || (listing?.isListed && listing?.seller === walletAddr))
          : false,
        listingSeller: listing?.seller || null,
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

    // Listing filter: 'mine' sorts shows only own listed, otherwise show all listed
    if (sortBy === 'mine') {
      results = results.filter((n) => n.isOwn && n.isListed);
    } else {
      // Default view: only show NFTs that are actively listed for sale
      results = results.filter((n) => n.isListed);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (n) =>
          n.sovereignName.toLowerCase().includes(q) ||
          n.sovereignId === q ||
          n.tokenName.toLowerCase().includes(q) ||
          n.tokenSymbol.toLowerCase().includes(q) ||
          n.mint.toLowerCase().includes(q) ||
          n.owner.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...results];
    switch (sortBy) {
      case 'mine': // Already filtered above, sort by value
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
  }, [enrichedNfts, selectedSovereign, searchQuery, sortBy]);

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
          seller: nft.listingSeller || nft.owner,
          royaltyWallet: sov.creator,
        });
        setBuySuccess({ nft, price: nft.listingPriceGor || 0 });
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
          seller: nft.listingSeller || nft.owner,
        });
        refetchNfts();
      } catch (err) {
        console.error('Delist failed:', err);
      }
    },
    [program, sovereignMap, delistNft, refetchNfts]
  );

  // ── Wallet's unlisted NFTs (for listing modal) ──
  const myUnlistedNfts = useMemo(
    () => enrichedNfts.filter((n) => n.isOwn && !n.isListed),
    [enrichedNfts]
  );

  // ── Handle list NFT ──
  const handleList = useCallback(
    async () => {
      if (!listingNft || !listingPrice || !program) return;
      const sov = sovereignMap.get(listingNft.sovereign);
      if (!sov) return;

      const priceNum = parseFloat(listingPrice);
      if (isNaN(priceNum) || priceNum <= 0) return;

      const priceLamports = BigInt(Math.round(priceNum * LAMPORTS_PER_GOR));

      try {
        await listNft.mutateAsync({
          sovereignId: sov.sovereignId,
          nftMint: listingNft.mint,
          priceLamports,
        });
        setListingNft(null);
        setListingPrice('');
        refetchNfts();
      } catch (err) {
        console.error('List failed:', err);
      }
    },
    [listingNft, listingPrice, program, sovereignMap, listNft, refetchNfts]
  );

  // ── Handle change price (delist → re-list) ──
  const [changePricePending, setChangePricePending] = useState(false);
  const handleChangePrice = useCallback(
    async () => {
      if (!changePriceNft || !newPrice || !program) return;
      const sov = sovereignMap.get(changePriceNft.sovereign);
      if (!sov) return;

      const priceNum = parseFloat(newPrice);
      if (isNaN(priceNum) || priceNum <= 0) return;

      setChangePricePending(true);
      try {
        // Step 1: Delist
        await delistNft.mutateAsync({
          sovereignId: sov.sovereignId,
          nftMint: changePriceNft.mint,
          seller: changePriceNft.listingSeller || changePriceNft.owner,
        });

        // Step 2: Re-list at new price
        const priceLamports = BigInt(Math.round(priceNum * LAMPORTS_PER_GOR));
        await listNft.mutateAsync({
          sovereignId: sov.sovereignId,
          nftMint: changePriceNft.mint,
          priceLamports,
        });

        setChangePriceNft(null);
        setNewPrice('');
        setSelectedNft(null);
        refetchNfts();
      } catch (err) {
        console.error('Change price failed:', err);
      } finally {
        setChangePricePending(false);
      }
    },
    [changePriceNft, newPrice, program, sovereignMap, delistNft, listNft, refetchNfts]
  );

  const isLoading = sovLoading || nftsLoading;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by Sovereign, token name, symbol, mint, or owner…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none"
            style={{
              background: 'rgba(46,235,127,0.04)',
              border: '1px solid rgba(46,235,127,0.15)',
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
          style={{
            background: 'rgba(46,235,127,0.04)',
            border: '1px solid rgba(46,235,127,0.15)',
            colorScheme: 'dark',
          }}
        >
          <option value="value">Sort: Value</option>
          <option value="share">Sort: Share %</option>
          <option value="price">Sort: Price</option>
          <option value="return">Sort: Return</option>
          <option value="recent">Sort: Recent</option>
          {connected && <option value="mine">Sort: My Listings</option>}
        </select>

        {/* List button */}
        {connected && (
          <button
            onClick={() => setShowNftPicker(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
            style={{
              background: 'rgba(46,235,127,0.15)',
              color: '#d4ffe6',
              border: '1px solid rgba(46,235,127,0.4)',
              boxShadow: '0 0 12px rgba(46,235,127,0.2)',
              textShadow: '0 0 8px rgba(46,235,127,0.5)',
            }}
          >
            List Position
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(46,235,127,0.12)',
            background: 'rgba(46,235,127,0.02)',
          }}
        >
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div
              className="flex gap-4 px-4 py-3"
              style={{ background: 'rgba(46,235,127,0.06)' }}
            >
              {[100, 60, 60, 80, 70, 50, 80, 80, 60].map((w, i) => (
                <div key={i} className="h-3 bg-[var(--border)] rounded" style={{ width: w }} />
              ))}
            </div>
            {/* Row skeletons */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex gap-4 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(46,235,127,0.06)' }}
              >
                {[110, 50, 55, 75, 65, 45, 70, 75, 55].map((w, j) => (
                  <div key={j} className="h-3 bg-[var(--border)] rounded" style={{ width: w }} />
                ))}
              </div>
            ))}
          </div>
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
          <h3
            className="font-bold text-lg mb-2"
            style={{ color: '#d4ffe6' }}
          >
            {enrichedNfts.length === 0
              ? 'No listed NFTs'
              : 'No listed NFTs match your filters'}
          </h3>
          <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
            {enrichedNfts.length === 0
              ? 'NFTs listed for sale will appear here.'
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

      {/* NFT Table */}
      {!isLoading && filteredNfts.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(46,235,127,0.12)',
            background: 'rgba(46,235,127,0.02)',
          }}
        >
          {/* Scrollable wrapper for small screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(46,235,127,0.06)',
                    borderBottom: '1px solid rgba(46,235,127,0.15)',
                  }}
                >
                  <th className="text-left px-4 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">$overeign</th>
                  <th className="text-left px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Token</th>
                  <th className="text-right px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Share %</th>
                  <th className="text-right px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Value (GOR)</th>
                  <th className="text-right px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">LP Fees</th>
                  <th className="text-right px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">APR</th>
                  <th className="text-left px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Owner</th>
                  <th className="text-right px-3 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Price (GOR)</th>
                  <th className="text-center px-4 py-3 font-semibold text-[var(--muted)] text-[10px] uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredNfts.map((nft, idx) => (
                  <tr
                    key={nft.mint}
                    onClick={() =>
                      setSelectedNft(selectedNft === nft.mint ? null : nft.mint)
                    }
                    className="cursor-pointer transition-colors"
                    style={{
                      background:
                        selectedNft === nft.mint
                          ? 'rgba(46,235,127,0.08)'
                          : idx % 2 === 0
                            ? 'transparent'
                            : 'rgba(46,235,127,0.02)',
                      borderBottom: '1px solid rgba(46,235,127,0.06)',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedNft !== nft.mint) {
                        e.currentTarget.style.background = 'rgba(46,235,127,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedNft !== nft.mint) {
                        e.currentTarget.style.background =
                          idx % 2 === 0 ? 'transparent' : 'rgba(46,235,127,0.02)';
                      }
                    }}
                  >
                    {/* $overeign */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[#d4ffe6] font-medium truncate block max-w-[140px]">
                        {nft.sovereignName}
                      </span>
                    </td>

                    {/* Token */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(46,235,127,0.08)',
                          color: 'var(--muted)',
                        }}
                      >
                        {nft.tokenSymbol}
                      </span>
                    </td>

                    {/* Share % */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span
                        className="font-bold"
                        style={{
                          color: '#d4ffe6',
                          textShadow: '0 0 8px rgba(46,235,127,0.3)',
                        }}
                      >
                        {nft.sharesPercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Value */}
                    <td className="px-3 py-3 text-right whitespace-nowrap text-white font-medium">
                      {nft.positionValueGor.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* LP Fees */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span
                        className="font-medium"
                        style={{
                          color: nft.lpFeesGor > 0 ? 'var(--money-green)' : 'var(--muted)',
                        }}
                      >
                        {nft.lpFeesGor > 0
                          ? `+${nft.lpFeesGor.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : '—'}
                      </span>
                    </td>

                    {/* APR */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span
                        className="font-medium"
                        style={{
                          color: nft.annualReturnPct > 0 ? 'var(--money-green)' : 'var(--muted)',
                        }}
                      >
                        {nft.annualReturnPct > 0 ? `${nft.annualReturnPct.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-white font-mono text-[10px]">
                        {nft.isOwn ? (
                          <span style={{ color: 'var(--money-green)' }}>You</span>
                        ) : (
                          `${nft.owner.slice(0, 4)}…${nft.owner.slice(-4)}`
                        )}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {nft.isListed && nft.listingPriceGor ? (
                        <span
                          className="font-bold"
                          style={{
                            color: 'var(--money-green)',
                            textShadow: '0 0 8px rgba(46,235,127,0.4)',
                          }}
                        >
                          {nft.listingPriceGor.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>

                    {/* Status — sovereign status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background:
                              nft.sovereignStatus === 'Active'
                                ? 'rgba(46,235,127,0.15)'
                                : nft.sovereignStatus === 'Bonding'
                                  ? 'rgba(235,200,46,0.15)'
                                  : nft.sovereignStatus === 'Recovery'
                                    ? 'rgba(235,130,46,0.15)'
                                    : 'rgba(150,150,150,0.12)',
                            color:
                              nft.sovereignStatus === 'Active'
                                ? 'var(--money-green)'
                                : nft.sovereignStatus === 'Bonding'
                                  ? '#ebc82e'
                                  : nft.sovereignStatus === 'Recovery'
                                    ? '#eb822e'
                                    : 'var(--muted)',
                          }}
                        >
                          {nft.sovereignStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Position Detail Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setSelectedNft(null); setChangePriceNft(null); setNewPrice(''); setBuySuccess(null); }}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6 animate-in fade-in zoom-in-95 duration-150"
            style={{
              background: 'var(--landfill-black)',
              border: '1px solid rgba(46,235,127,0.25)',
              boxShadow: '0 0 60px rgba(46,235,127,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Buy Success View ── */}
            {buySuccess ? (
              <div className="text-center py-4">
                {/* Checkmark */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: 'rgba(46,235,127,0.12)',
                    border: '2px solid rgba(46,235,127,0.4)',
                    boxShadow: '0 0 30px rgba(46,235,127,0.2)',
                  }}
                >
                  <span className="text-3xl" style={{ color: 'var(--money-green)' }}>\u2713</span>
                </div>

                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: '#d4ffe6', textShadow: '0 0 12px rgba(46,235,127,0.3)' }}
                >
                  Purchase Successful!
                </h3>
                <p className="text-sm text-[var(--muted)] mb-5">
                  You now own this position.
                </p>

                {/* Summary */}
                <div
                  className="rounded-lg p-4 mb-5 text-left text-xs"
                  style={{
                    background: 'rgba(46,235,127,0.04)',
                    border: '1px solid rgba(46,235,127,0.12)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">$overeign</span>
                      <span className="text-white font-medium">{buySuccess.nft.sovereignName}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">Token</span>
                      <span className="text-white font-medium">{buySuccess.nft.tokenSymbol}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">Share</span>
                      <span className="text-white font-bold">{buySuccess.nft.sharesPercent.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">Price Paid</span>
                      <span
                        className="font-bold"
                        style={{ color: 'var(--money-green)', textShadow: '0 0 8px rgba(46,235,127,0.4)' }}
                      >
                        {buySuccess.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">Estimated Value</span>
                      <span className="text-white font-medium">
                        {buySuccess.nft.positionValueGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px] mb-0.5">NFT Mint</span>
                      <a
                        href={`${config.explorerUrl}/address/${buySuccess.nft.mint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate block"
                        style={{ color: 'var(--money-green)' }}
                      >
                        {buySuccess.nft.mint.slice(0, 8)}\u2026{buySuccess.nft.mint.slice(-8)}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setBuySuccess(null); setSelectedNft(null); }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: 'rgba(46,235,127,0.15)',
                      color: '#d4ffe6',
                      border: '1px solid rgba(46,235,127,0.4)',
                      boxShadow: '0 0 15px rgba(46,235,127,0.2)',
                      textShadow: '0 0 8px rgba(46,235,127,0.5)',
                    }}
                  >
                    Done
                  </button>
                  <Link
                    href={`/sovereign/${buySuccess.nft.sovereign}`}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-center"
                    style={{
                      background: 'rgba(46,235,127,0.06)',
                      color: 'var(--muted)',
                      border: '1px solid rgba(46,235,127,0.12)',
                    }}
                  >
                    View $overeign \u2192
                  </Link>
                </div>
              </div>
            ) : (
            <>
            {/* ── Normal Detail View ── */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="text-base font-bold"
                  style={{ color: '#d4ffe6' }}
                >
                  Position Details
                </h3>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  {selected.sovereignName} · {selected.tokenSymbol} · {selected.name}
                </p>
              </div>
              <button
                onClick={() => { setSelectedNft(null); setChangePriceNft(null); setNewPrice(''); setBuySuccess(null); }}
                className="text-[var(--muted)] hover:text-white text-sm px-2 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <span className="text-[var(--muted)] block text-[10px] mb-0.5">Owner</span>
                <a
                  href={`${config.explorerUrl}/address/${selected.listingSeller || selected.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate block"
                  style={{ color: 'var(--money-green)' }}
                >
                  {selected.isOwn
                    ? 'You'
                    : `${(selected.listingSeller || selected.owner).slice(0, 8)}…${(selected.listingSeller || selected.owner).slice(-8)}`}
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

            {/* Listing price row */}
            {selected.isListed && selected.listingPriceGor && (
              <div
                className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg mb-4"
                style={{
                  background: 'rgba(46,235,127,0.06)',
                  border: '1px solid rgba(46,235,127,0.15)',
                }}
              >
                <span className="text-[var(--muted)]">Asking Price</span>
                <span
                  className="font-bold"
                  style={{
                    color: 'var(--money-green)',
                    textShadow: '0 0 8px rgba(46,235,127,0.4)',
                  }}
                >
                  {selected.listingPriceGor.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  GOR
                </span>
              </div>
            )}

            {/* Minted date */}
            <div className="text-[10px] text-[var(--faint)] mb-4">
              Minted {new Date(selected.mintedAt).toLocaleDateString()}
            </div>

            {/* ── Change Price inline form ── */}
            {changePriceNft?.mint === selected.mint && (
              <div
                className="rounded-lg p-3 mb-4"
                style={{
                  background: 'rgba(46,235,127,0.04)',
                  border: '1px solid rgba(46,235,127,0.15)',
                }}
              >
                <label className="text-[10px] text-[var(--muted)] block mb-1.5">
                  New Price (GOR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Enter new price…"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none"
                    style={{
                      background: 'rgba(46,235,127,0.04)',
                      border: '1px solid rgba(46,235,127,0.15)',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleChangePrice}
                    disabled={changePricePending || !newPrice || parseFloat(newPrice) <= 0}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                    style={{
                      background: 'rgba(46,235,127,0.15)',
                      color: '#d4ffe6',
                      border: '1px solid rgba(46,235,127,0.4)',
                    }}
                  >
                    {changePricePending ? 'Updating…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => { setChangePriceNft(null); setNewPrice(''); }}
                    className="px-3 py-2 rounded-lg text-sm text-[var(--muted)] transition-all"
                    style={{
                      background: 'rgba(150,150,150,0.08)',
                      border: '1px solid rgba(150,150,150,0.15)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
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
                  className="py-2.5 px-4 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  {delistNft.isPending ? 'Delisting…' : 'Delist'}
                </button>
              )}

              {/* Change Price button — listed and own */}
              {selected.isListed && selected.isOwn && connected && changePriceNft?.mint !== selected.mint && (
                <button
                  onClick={() => {
                    setChangePriceNft(selected);
                    setNewPrice(selected.listingPriceGor?.toString() || '');
                  }}
                  className="py-2.5 px-4 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: 'rgba(46,235,127,0.08)',
                    color: '#d4ffe6',
                    border: '1px solid rgba(46,235,127,0.25)',
                  }}
                >
                  Change Price
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
            </>
            )}
          </div>
        </div>
      )}
      {/* ── NFT Picker Modal ── */}
      {showNftPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md rounded-xl p-5 max-h-[80vh] flex flex-col"
            style={{
              background: 'var(--landfill-black)',
              border: '1px solid rgba(46,235,127,0.25)',
              boxShadow: '0 0 40px rgba(46,235,127,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#d4ffe6' }}>
                Select a Position to List
              </h3>
              <button
                onClick={() => setShowNftPicker(false)}
                className="text-[var(--muted)] hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {myUnlistedNfts.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-8">
                You don&apos;t have any $overeign NFTs.
              </p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {myUnlistedNfts.map((nft) => (
                  <button
                    key={nft.mint}
                    onClick={() => {
                      setListingNft(nft);
                      setShowNftPicker(false);
                      setListingPrice('');
                    }}
                    className="w-full text-left rounded-lg p-3 transition-all hover:scale-[1.01]"
                    style={{
                      background: 'rgba(46,235,127,0.04)',
                      border: '1px solid rgba(46,235,127,0.12)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--muted)]">
                        {nft.sovereignName} · {nft.tokenSymbol}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: '#d4ffe6' }}
                      >
                        {nft.sharesPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--faint)] font-mono">
                        {nft.mint.slice(0, 6)}…{nft.mint.slice(-6)}
                      </span>
                      <span className="text-[11px] text-white">
                        {nft.positionValueGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Listing Price Modal ── */}
      {listingNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'var(--landfill-black)',
              border: '1px solid rgba(46,235,127,0.25)',
              boxShadow: '0 0 40px rgba(46,235,127,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#d4ffe6' }}>
                List Position for Sale
              </h3>
              <button
                onClick={() => { setListingNft(null); setListingPrice(''); }}
                className="text-[var(--muted)] hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Selected NFT summary */}
            <div
              className="rounded-lg p-3 mb-4"
              style={{
                background: 'rgba(46,235,127,0.04)',
                border: '1px solid rgba(46,235,127,0.1)',
              }}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--muted)]">{listingNft.sovereignName} · {listingNft.tokenSymbol}</span>
                <span style={{ color: '#d4ffe6' }} className="font-bold">{listingNft.sharesPercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">Est. Value</span>
                <span className="text-white font-medium">
                  {listingNft.positionValueGor.toLocaleString(undefined, { maximumFractionDigits: 2 })} GOR
                </span>
              </div>
            </div>

            {/* Price input */}
            <label className="block text-xs text-[var(--muted)] mb-1">Asking Price (GOR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--faint)] outline-none mb-4"
              style={{
                background: 'rgba(46,235,127,0.04)',
                border: '1px solid rgba(46,235,127,0.15)',
              }}
            />

            {/* List button */}
            <button
              onClick={handleList}
              disabled={listNft.isPending || !listingPrice || parseFloat(listingPrice) <= 0}
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{
                background: 'rgba(46,235,127,0.15)',
                color: '#d4ffe6',
                border: '1px solid rgba(46,235,127,0.4)',
                boxShadow: '0 0 15px rgba(46,235,127,0.2)',
                textShadow: '0 0 8px rgba(46,235,127,0.5)',
              }}
            >
              {listNft.isPending ? 'Listing…' : 'List for Sale'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
