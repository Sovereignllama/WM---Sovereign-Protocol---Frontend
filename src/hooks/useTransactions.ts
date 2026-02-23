'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram, useWalletAddress } from './useProgram';
import { QUERY_KEYS } from './useSovereign';
import { 
  buildDepositTx, 
  buildWithdrawTx, 
  buildClaimPoolLpFeesTx,
  buildClaimPoolCreatorFeesTx,
  buildClaimTransferFeesTx,
  buildFinalizeEnginePoolTx,
  buildSwapBuyTx,
  buildSwapSellTx,
  buildExecuteEngineUnwindTx,
  buildCreateSovereignTx,
  buildCreateTokenTx,
  buildEmergencyUnlockTx,
  buildEmergencyWithdrawTx,
  buildEmergencyWithdrawCreatorTx,
  buildMintGenesisNftTx,
  buildUpdateSellFeeTx,
  buildRenounceSellFeeTx,
  buildListNftTx,
  buildBuyNftTx,
  buildDelistNftTx,
  buildTransferNftTx,
  CreateSovereignFrontendParams,
  fetchDepositRecord,
} from '@/lib/program/client';
import { 
  getSovereignPDA,
  getDepositRecordPDA,
} from '@/lib/program/pdas';
import { config, LAMPORTS_PER_GOR } from '@/lib/config';

interface TransactionResult {
  signature: string;
  success: boolean;
}

interface CreateSovereignResult extends TransactionResult {
  sovereignId: string;
  sovereignPDA: string;
}

// ── Creation Progress Types ──
export interface CreationStepInfo {
  label: string;
  status: 'pending' | 'signing' | 'confirming' | 'confirmed' | 'error';
  signature?: string;
}

export interface CreationProgress {
  currentStep: number;
  totalSteps: number;
  steps: CreationStepInfo[];
}

export type OnCreationProgress = (progress: CreationProgress) => void;

/**
 * Hook to create a new sovereign with step-by-step progress reporting
 */
export function useCreateSovereign(onProgress?: OnCreationProgress) {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  // Helper to build the steps array and report progress
  const report = (steps: CreationStepInfo[], currentStep: number) => {
    progressRef.current?.({
      currentStep,
      totalSteps: steps.length,
      steps: [...steps],
    });
  };

  return useMutation({
    mutationFn: async (params: CreateSovereignFrontendParams): Promise<CreateSovereignResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // ── Determine steps dynamically ──
      const isTokenLaunch = params.sovereignType === 'TokenLaunch';
      const hasBuyIn = params.creatorBuyIn && params.creatorBuyIn > BigInt(0);

      const steps: CreationStepInfo[] = [
        { label: 'Creating $overeign', status: 'pending' },
      ];
      if (isTokenLaunch) {
        steps.push({ label: 'Creating Token', status: 'pending' });
      }
      if (hasBuyIn) {
        steps.push({ label: 'Creator Buy-in', status: 'pending' });
      }

      let stepIdx = 0;

      // ── Step 1: create_sovereign ──
      steps[stepIdx].status = 'signing';
      report(steps, stepIdx);

      const { tx, sovereignPDA, sovereignId } = await buildCreateSovereignTx(
        program,
        publicKey,
        params
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      steps[stepIdx].status = 'confirming';
      steps[stepIdx].signature = signature;
      report(steps, stepIdx);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      steps[stepIdx].status = 'confirmed';
      report(steps, stepIdx);
      stepIdx++;

      // ── Step 2 (TokenLaunch only): create_token ──
      if (isTokenLaunch) {
        steps[stepIdx].status = 'signing';
        report(steps, stepIdx);

        const defaultUri = `https://trashscan.io/address/${sovereignId}`;
        const { tx: tokenTx } = await buildCreateTokenTx(
          program,
          publicKey,
          sovereignId,
          {
            name: params.tokenName || '',
            symbol: params.tokenSymbol || '',
            uri: params.metadataUri || defaultUri,
          }
        );

        const { blockhash: tokenBlockhash, lastValidBlockHeight: tokenLastValid } = 
          await connection.getLatestBlockhash('confirmed');
        tokenTx.recentBlockhash = tokenBlockhash;
        tokenTx.feePayer = publicKey;

        const tokenSignature = await sendTransaction(tokenTx, connection, {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
        });

        steps[stepIdx].status = 'confirming';
        steps[stepIdx].signature = tokenSignature;
        report(steps, stepIdx);

        await connection.confirmTransaction({
          signature: tokenSignature,
          blockhash: tokenBlockhash,
          lastValidBlockHeight: tokenLastValid,
        }, 'confirmed');

        steps[stepIdx].status = 'confirmed';
        report(steps, stepIdx);
        console.log('Token created:', tokenSignature);
        stepIdx++;
      }

      // ── Step 3 (optional): creator buy-in deposit ──
      if (hasBuyIn) {
        steps[stepIdx].status = 'signing';
        report(steps, stepIdx);

        const sovereignIdNum = BigInt(sovereignId);
        const depositTx = await buildDepositTx(
          program,
          publicKey,
          sovereignIdNum,
          params.creatorBuyIn!
        );

        const { blockhash: depositBlockhash, lastValidBlockHeight: depositLastValid } =
          await connection.getLatestBlockhash('confirmed');
        depositTx.recentBlockhash = depositBlockhash;
        depositTx.feePayer = publicKey;

        const depositSignature = await sendTransaction(depositTx, connection, {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
        });

        steps[stepIdx].status = 'confirming';
        steps[stepIdx].signature = depositSignature;
        report(steps, stepIdx);

        await connection.confirmTransaction({
          signature: depositSignature,
          blockhash: depositBlockhash,
          lastValidBlockHeight: depositLastValid,
        }, 'confirmed');

        steps[stepIdx].status = 'confirmed';
        report(steps, stepIdx);
        console.log('Creator buy-in deposited:', depositSignature);
      }

      return { 
        signature, 
        success: true,
        sovereignId: sovereignId.toString(),
        sovereignPDA: sovereignPDA.toBase58(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.protocolState });
    },
  });
}

/**
 * Hook to deposit into a sovereign during bonding phase
 */
export function useDeposit() {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sovereignId, 
      amountGor 
    }: { 
      sovereignId: string | number; 
      amountGor: number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Convert GOR to lamports
      const amountLamports = BigInt(Math.floor(amountGor * LAMPORTS_PER_GOR));
      
      // Build the transaction
      const tx = await buildDepositTx(
        program,
        publicKey,
        BigInt(sovereignId),
        amountLamports
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
      if (publicKey) {
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(), 
            publicKey.toBase58()
          ) 
        });
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.walletDeposits(publicKey.toBase58()) 
        });
      }
    },
  });
}

/**
 * Hook to withdraw from a sovereign during bonding phase
 */
export function useWithdraw() {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sovereignId, 
      amountGor 
    }: { 
      sovereignId: string | number; 
      amountGor: number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Convert GOR to lamports
      const amountLamports = BigInt(Math.floor(amountGor * LAMPORTS_PER_GOR));
      
      // Build the transaction
      const tx = await buildWithdrawTx(
        program,
        publicKey,
        BigInt(sovereignId),
        amountLamports
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
      if (publicKey) {
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(), 
            publicKey.toBase58()
          ) 
        });
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.walletDeposits(publicKey.toBase58()) 
        });
      }
    },
  });
}

/**
 * Hook to finalize: create the engine pool (single step)
 * Transitions from Finalizing -> Recovery
 */
export function useFinalizeEnginePool() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildFinalizeEnginePoolTx(
        program,
        publicKey,
        BigInt(sovereignId),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

// ============================================================
// Emergency Functions
// ============================================================

/**
 * Hook to emergency unlock a sovereign (protocol authority only)
 */
export function useEmergencyUnlock() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildEmergencyUnlockTx(
        program,
        publicKey,
        BigInt(sovereignId),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

/**
 * Hook to emergency withdraw deposited GOR (investors)
 */
export function useEmergencyWithdraw() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      originalDepositor,
    }: {
      sovereignId: string | number;
      /** If the wallet is the original depositor (pre-finalization), omit this. */
      originalDepositor?: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const holder = publicKey;
      const depositorKey = originalDepositor
        ? new PublicKey(originalDepositor)
        : publicKey;

      // Fetch deposit record to check if NFT was minted
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), program.programId);
      const depositRecord = await fetchDepositRecord(program, sovereignPDA, depositorKey);
      
      let nftMint: PublicKey | undefined;
      let nftTokenAccount: PublicKey | undefined;

      if (depositRecord?.nftMinted && depositRecord?.nftMint) {
        // Post-finalization bearer NFT mode — find the NFT token account
        nftMint = depositRecord.nftMint as PublicKey;
        const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
        const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        nftTokenAccount = getAssociatedTokenAddressSync(
          nftMint,
          holder,
          false,
          TOKEN_PROGRAM_ID,
        );
      }

      const tx = await buildEmergencyWithdrawTx(
        program,
        holder,
        depositorKey,
        BigInt(sovereignId),
        nftMint,
        nftTokenAccount,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
      if (publicKey) {
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(), 
            publicKey.toBase58()
          ) 
        });
      }
    },
  });
}

/**
 * Hook to emergency withdraw creator escrow + creation fee
 */
export function useEmergencyWithdrawCreator() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      burnTokens = false,
    }: {
      sovereignId: string | number;
      burnTokens?: boolean;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildEmergencyWithdrawCreatorTx(
        program,
        publicKey,
        BigInt(sovereignId),
        burnTokens,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

/**
 * Hook to mint a Genesis NFT for a depositor
 * Available after finalization (Recovery or Active state)
 */
export function useMintGenesisNft() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildMintGenesisNftTx(
        program,
        publicKey,
        publicKey, // depositor is the connected wallet
        BigInt(sovereignId)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(),
            publicKey.toBase58()
          )
        });
      }
    },
  });
}

/**
 * Hook to claim LP fees from the engine pool.
 * NFT bearer (whoever holds the Genesis NFT) claims their proportional share
 * of accumulated swap fees.
 */
export function useClaimPoolLpFees() {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      originalDepositor,
      nftMint,
    }: {
      sovereignId: string | number;
      originalDepositor: string;
      nftMint: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildClaimPoolLpFeesTx(
        program,
        publicKey,
        new PublicKey(originalDepositor),
        BigInt(sovereignId),
        new PublicKey(nftMint),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to claim creator fees from the engine pool.
 * Only available when sovereign is in Active state.
 */
export function useClaimPoolCreatorFees() {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildClaimPoolCreatorFeesTx(
        program,
        publicKey,
        BigInt(sovereignId),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to update the sell/transfer fee on a sovereign's token mint.
 * Creator only. Max 3% (300 bps).
 */
export function useUpdateSellFee() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      newFeeBps,
    }: {
      sovereignId: string | number;
      newFeeBps: number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildUpdateSellFeeTx(
        program,
        publicKey,
        BigInt(sovereignId),
        newFeeBps,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tokenFeeStats', variables.sovereignId.toString()] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

/**
 * Hook to permanently renounce sell fee control.
 * Sets fee to 0% and removes authority — IRREVERSIBLE.
 * Creator only. Requires Active state (recovery complete).
 */
export function useRenounceSellFee() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildRenounceSellFeeTx(
        program,
        publicKey,
        BigInt(sovereignId),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tokenFeeStats', variables.sovereignId.toString()] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

/**
 * Hook to execute engine pool unwind.
 * Drains all liquidity from the engine pool after governance approval.
 * Permissionless — anyone can call after observation period ends.
 */
export function useExecuteEngineUnwind() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildExecuteEngineUnwindTx(
        program,
        publicKey,
        BigInt(sovereignId),
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereigns });
    },
  });
}

/**
 * Hook for creator to claim accumulated transfer fee tokens from the vault.
 * Optionally harvests from source token accounts in the same transaction.
 */
export function useClaimTransferFees() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      sourceTokenAccounts,
    }: {
      sovereignId: string | number;
      sourceTokenAccounts?: string[];
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const sourceKeys = (sourceTokenAccounts || []).map((a) => new PublicKey(a));

      const tx = await buildClaimTransferFeesTx(
        program,
        publicKey,
        BigInt(sovereignId),
        sourceKeys,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: ['tokenFeeStats', variables.sovereignId.toString()] });
    },
  });
}

/**
 * Hook to swap buy (GOR → Tokens) via engine pool.
 */
export function useSwapBuy() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      gorAmount,
      minTokensOut = BigInt(0),
    }: {
      sovereignId: string | number;
      gorAmount: bigint;
      minTokensOut?: bigint;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildSwapBuyTx(
        program,
        publicKey,
        BigInt(sovereignId),
        gorAmount,
        minTokensOut,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

/**
 * Hook to swap sell (Tokens → GOR) via engine pool.
 */
export function useSwapSell() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      tokenAmount,
      minGorOut = BigInt(0),
    }: {
      sovereignId: string | number;
      tokenAmount: bigint;
      minGorOut?: bigint;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildSwapSellTx(
        program,
        publicKey,
        BigInt(sovereignId),
        tokenAmount,
        minGorOut,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
    },
  });
}

// ============================================================
// NFT Marketplace Hooks
// ============================================================

/**
 * Hook to list a Genesis NFT for sale on the marketplace.
 */
export function useListNft() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      nftMint,
      priceLamports,
    }: {
      sovereignId: string | number;
      nftMint: string;
      priceLamports: bigint;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const nftMintPk = new PublicKey(nftMint);
      const tx = await buildListNftTx(
        program,
        publicKey,
        BigInt(sovereignId),
        nftMintPk,
        priceLamports
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: ['sovereignNfts'] });
    },
  });
}

/**
 * Hook to buy a listed Genesis NFT from the marketplace.
 */
export function useBuyNft() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      nftMint,
      seller,
      royaltyWallet,
    }: {
      sovereignId: string | number;
      nftMint: string;
      seller: string;
      royaltyWallet: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildBuyNftTx(
        program,
        publicKey,
        BigInt(sovereignId),
        new PublicKey(nftMint),
        new PublicKey(seller),
        new PublicKey(royaltyWallet)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: ['sovereignNfts'] });
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(),
            publicKey.toBase58()
          ),
        });
      }
    },
  });
}

/**
 * Hook to delist (remove listing) a Genesis NFT from the marketplace.
 */
export function useDelistNft() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      nftMint,
      seller,
    }: {
      sovereignId: string | number;
      nftMint: string;
      seller: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildDelistNftTx(
        program,
        publicKey,
        BigInt(sovereignId),
        new PublicKey(nftMint),
        new PublicKey(seller)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: ['sovereignNfts'] });
    },
  });
}

/**
 * Hook to transfer a Genesis NFT to another wallet (free, no royalty).
 * NFT must NOT be listed.
 */
export function useTransferNft() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      nftMint,
      recipient,
    }: {
      sovereignId: string | number;
      nftMint: string;
      recipient: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildTransferNftTx(
        program,
        publicKey,
        new PublicKey(recipient),
        BigInt(sovereignId),
        new PublicKey(nftMint)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return { signature, success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sovereign(variables.sovereignId) });
      queryClient.invalidateQueries({ queryKey: ['sovereignNfts'] });
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(),
            publicKey.toBase58()
          ),
        });
      }
    },
  });
}
