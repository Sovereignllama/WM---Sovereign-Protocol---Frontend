'use client';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereigns, useWalletDeposits } from './useSovereign';

export interface GovernancePosition {
  sovereignId: string;
  sovereignPDA: string;
  name: string;
  tokenSymbol: string;
  tokenName: string;
  metadataUri: string;
  creator: string;
  tokenMint: string;
  status: string;
  totalDepositedGor: number;
  totalFeesCollectedGor: number;
  depositorCount: number;
  recoveryComplete: boolean;
  // Deposit info
  depositAmountGor: number;
  sharesPercent: number;
  votingPowerPercent: number;
  nftMinted: boolean;
  nftMint: string | null;
  depositor: string;
  unwindClaimed: boolean;
}

export interface CreatorPosition {
  sovereignId: string;
  sovereignPDA: string;
  name: string;
  tokenSymbol: string;
  tokenName: string;
  metadataUri: string;
  tokenMint: string;
  status: string;
  totalDepositedGor: number;
  totalFeesCollectedGor: number;
  depositorCount: number;
  recoveryComplete: boolean;
  swapFeeBps: number;
  sellFeeBps: number;
  feeControlRenounced: boolean;
}

/**
 * Returns governance positions (sovereigns where user has a deposit)
 * and creator positions (sovereigns user created), merged with sovereign data.
 */
export function useMyGovernancePositions() {
  const { publicKey } = useWallet();
  const { data: sovereigns, isLoading: sovLoading } = useSovereigns();
  const { data: deposits, isLoading: depLoading } = useWalletDeposits();

  // Governance states that are relevant
  const GOVERNABLE = ['Recovery', 'Active', 'Unwinding', 'Unwound', 'EmergencyUnlocked'];

  const positions = useMemo<GovernancePosition[]>(() => {
    if (!sovereigns || !deposits || !publicKey) return [];

    // Build a lookup: sovereign PDA → sovereign data
    const sovMap = new Map<string, any>();
    for (const s of sovereigns) {
      if (GOVERNABLE.includes(s.status)) {
        sovMap.set(s.publicKey, s);
      }
    }

    return deposits
      .filter((d: any) => Number(d.amount) > 0 && sovMap.has(d.sovereign))
      .map((d: any) => {
        const s = sovMap.get(d.sovereign)!;
        return {
          sovereignId: s.sovereignId,
          sovereignPDA: s.publicKey,
          name: s.name,
          tokenSymbol: s.tokenSymbol,
          tokenName: s.tokenName,
          metadataUri: s.metadataUri,
          creator: s.creator,
          tokenMint: s.tokenMint,
          status: s.status,
          totalDepositedGor: s.totalDepositedGor,
          totalFeesCollectedGor: s.totalFeesCollectedGor,
          depositorCount: s.depositorCount,
          recoveryComplete: s.recoveryComplete,
          depositAmountGor: d.amountGor,
          sharesPercent: d.sharesPercent,
          votingPowerPercent: d.votingPowerPercent,
          nftMinted: d.nftMinted,
          nftMint: d.nftMint,
          depositor: d.depositor,
          unwindClaimed: d.unwindClaimed,
        };
      });
  }, [sovereigns, deposits, publicKey]);

  const creatorPositions = useMemo<CreatorPosition[]>(() => {
    if (!sovereigns || !publicKey) return [];
    const wallet = publicKey.toBase58();
    return sovereigns
      .filter((s: any) => s.creator === wallet && GOVERNABLE.includes(s.status))
      .map((s: any) => ({
        sovereignId: s.sovereignId,
        sovereignPDA: s.publicKey,
        name: s.name,
        tokenSymbol: s.tokenSymbol,
        tokenName: s.tokenName,
        metadataUri: s.metadataUri,
        tokenMint: s.tokenMint,
        status: s.status,
        totalDepositedGor: s.totalDepositedGor,
        totalFeesCollectedGor: s.totalFeesCollectedGor,
        depositorCount: s.depositorCount,
        recoveryComplete: s.recoveryComplete,
        swapFeeBps: s.swapFeeBps,
        sellFeeBps: s.sellFeeBps,
        feeControlRenounced: s.feeControlRenounced ?? false,
      }));
  }, [sovereigns, publicKey]);

  return {
    positions,
    creatorPositions,
    isLoading: sovLoading || depLoading,
    hasPositions: positions.length > 0,
    hasCreatorPositions: creatorPositions.length > 0,
  };
}
