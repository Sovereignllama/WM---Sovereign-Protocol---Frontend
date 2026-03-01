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
  buildMintNftFromPositionTx,
  buildUpdateSellFeeTx,
  buildRenounceSellFeeTx,
  buildListNftTx,
  buildBuyNftTx,
  buildDelistNftTx,
  buildTransferNftTx,
  buildBurnNftIntoPositionTx,
  buildMarkBondingFailedTx,
  buildWithdrawFailedTx,
  buildWithdrawCreatorFailedTx,
  CreateSovereignFrontendParams,
  fetchDepositRecord,
  fetchSovereignById,
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
  /** Available after step 1 (create_sovereign) confirms — used for resume */
  sovereignId?: string;
  /** Available after step 1 (create_sovereign) confirms — used for resume */
  sovereignPDA?: string;
}

export type OnCreationProgress = (progress: CreationProgress) => void;

/**
 * Extended params that include optional resume fields.
 * When resumeSovereignId is set, the hook skips already-completed steps.
 */
export interface CreateSovereignMutationParams extends CreateSovereignFrontendParams {
  /** If set, resume creation from where it left off */
  resumeSovereignId?: bigint;
  /** PDA of the existing sovereign (required when resumeSovereignId is set) */
  resumeSovereignPDA?: PublicKey;
}

/**
 * Hook to create a new sovereign with step-by-step progress reporting.
 * Supports resuming a partially-created sovereign when `resumeSovereignId` is passed.
 */
export function useCreateSovereign(onProgress?: OnCreationProgress) {
  const program = useProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  // Helper to build the steps array and report progress
  const report = (
    steps: CreationStepInfo[],
    currentStep: number,
    sovereignId?: string,
    sovereignPDA?: string,
  ) => {
    progressRef.current?.({
      currentStep,
      totalSteps: steps.length,
      steps: [...steps],
      sovereignId,
      sovereignPDA,
    });
  };

  return useMutation({
    mutationFn: async (params: CreateSovereignMutationParams): Promise<CreateSovereignResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const isResume = !!params.resumeSovereignId;
      const isTokenLaunch = params.sovereignType === 'TokenLaunch';
      const hasBuyIn = params.creatorBuyIn && params.creatorBuyIn > BigInt(0);

      // ── Determine completed steps when resuming ──
      let createSovereignDone = false;
      let createTokenDone = false;
      let depositDone = false;
      let sovereignId: bigint;
      let sovereignPDA: PublicKey;

      if (isResume) {
        sovereignId = params.resumeSovereignId!;
        sovereignPDA = params.resumeSovereignPDA!;

        // Fetch current on-chain state to determine which steps completed
        try {
          const sovereign = await fetchSovereignById(program, sovereignId);
          createSovereignDone = true;

          // Token Launch: check if tokenMint is set (non-zero pubkey)
          if (isTokenLaunch) {
            const mintKey = sovereign.tokenMint as PublicKey;
            createTokenDone = mintKey && !mintKey.equals(PublicKey.default);
          }

          // Check if creator already deposited (creatorEscrow > 0)
          if (hasBuyIn) {
            const escrow = sovereign.creatorEscrow;
            depositDone = escrow && (typeof escrow.toNumber === 'function'
              ? escrow.toNumber() > 0
              : Number(escrow) > 0);
          }
        } catch {
          throw new Error('Could not fetch sovereign state for resume. The sovereign may not exist on-chain.');
        }
      } else {
        // Will be set after step 1
        sovereignId = 0n;
        sovereignPDA = PublicKey.default;
      }

      // ── Build step list, marking completed steps ──
      const steps: CreationStepInfo[] = [
        {
          label: 'Creating $overeign',
          status: createSovereignDone ? 'confirmed' : 'pending',
        },
      ];
      if (isTokenLaunch) {
        steps.push({
          label: 'Creating Token',
          status: createTokenDone ? 'confirmed' : 'pending',
        });
      }
      if (hasBuyIn) {
        steps.push({
          label: 'Creator Buy-in',
          status: depositDone ? 'confirmed' : 'pending',
        });
      }

      // Find the first non-confirmed step
      let stepIdx = steps.findIndex(s => s.status !== 'confirmed');
      if (stepIdx === -1) {
        // Everything is already done — just return
        report(
          steps, steps.length - 1,
          sovereignId.toString(), sovereignPDA.toBase58(),
        );
        return {
          signature: '',
          success: true,
          sovereignId: sovereignId.toString(),
          sovereignPDA: sovereignPDA.toBase58(),
        };
      }

      // Report initial state (shows already-confirmed steps)
      let firstSignature = '';
      report(
        steps, stepIdx,
        isResume ? sovereignId.toString() : undefined,
        isResume ? sovereignPDA.toBase58() : undefined,
      );

      // ── Step: create_sovereign (skip if already done) ──
      if (!createSovereignDone) {
        steps[stepIdx].status = 'signing';
        report(steps, stepIdx);

        const { tx, sovereignPDA: newPDA, sovereignId: newId } = await buildCreateSovereignTx(
          program,
          publicKey,
          params
        );
        sovereignId = newId;
        sovereignPDA = newPDA;

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        firstSignature = await sendTransaction(tx, connection, {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
        });

        steps[stepIdx].status = 'confirming';
        steps[stepIdx].signature = firstSignature;
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());

        await connection.confirmTransaction({
          signature: firstSignature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        steps[stepIdx].status = 'confirmed';
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());
        stepIdx++;
      }

      // ── Step: create_token (Token Launch only, skip if already done) ──
      if (isTokenLaunch && !createTokenDone) {
        steps[stepIdx].status = 'signing';
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());

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
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());

        await connection.confirmTransaction({
          signature: tokenSignature,
          blockhash: tokenBlockhash,
          lastValidBlockHeight: tokenLastValid,
        }, 'confirmed');

        steps[stepIdx].status = 'confirmed';
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());
        if (!firstSignature) firstSignature = tokenSignature;
        console.log('Token created:', tokenSignature);
        stepIdx++;
      } else if (isTokenLaunch && createTokenDone) {
        // Skip past the already-confirmed token step
        stepIdx++;
      }

      // ── Step: creator buy-in deposit (skip if already done) ──
      if (hasBuyIn && !depositDone) {
        steps[stepIdx].status = 'signing';
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());

        const depositTx = await buildDepositTx(
          program,
          publicKey,
          sovereignId,
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
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());

        await connection.confirmTransaction({
          signature: depositSignature,
          blockhash: depositBlockhash,
          lastValidBlockHeight: depositLastValid,
        }, 'confirmed');

        steps[stepIdx].status = 'confirmed';
        report(steps, stepIdx, sovereignId.toString(), sovereignPDA.toBase58());
        if (!firstSignature) firstSignature = depositSignature;
        console.log('Creator buy-in deposited:', depositSignature);
      }

      return {
        signature: firstSignature,
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
 * Hook to mint an NFT from a deposit record (reservoir model).
 * Carves `amountLamports` from the DR into a new NFT.
 * Available after finalization (Recovery or Active state).
 */
export function useMintNftFromPosition() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      amountLamports,
    }: {
      sovereignId: string | number;
      amountLamports: string | bigint;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const amount = new BN(amountLamports.toString());

      const tx = await buildMintNftFromPositionTx(
        program,
        publicKey,
        BigInt(sovereignId),
        amount
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
        // Invalidate NFT queries so the new NFT shows up
        queryClient.invalidateQueries({ queryKey: ['sovereignNfts'] });
        queryClient.invalidateQueries({ queryKey: ['myNftsForSovereign'] });
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
    }: {
      sovereignId: string | number;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildClaimPoolLpFeesTx(
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
 * Hook to burn/merge an NFT back into the holder's deposit record.
 * Burns the NFT token, closes the NftPosition, credits DR.
 */
export function useBurnNftIntoPosition() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sovereignId,
      nftMint,
    }: {
      sovereignId: string | number;
      nftMint: string;
    }): Promise<TransactionResult> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildBurnNftIntoPositionTx(
        program,
        publicKey,
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
      queryClient.invalidateQueries({ queryKey: ['myNftsForSovereign'] });
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

// ============================================================
// Failed Bonding
// ============================================================

/**
 * Permissionless crank: mark a sovereign's bonding as failed
 * (deadline passed + target not met → transitions Bonding → Failed).
 */
export function useMarkBondingFailed() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sovereignId }: { sovereignId: string }) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildMarkBondingFailedTx(
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
      queryClient.invalidateQueries({ queryKey: ['sovereigns'] });
    },
  });
}

/**
 * Withdraw deposited GOR from a failed bonding (investor).
 * Closes deposit record and refunds full deposit.
 */
export function useWithdrawFailed() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sovereignId }: { sovereignId: string }) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      // Defense-in-depth: the on-chain instruction rejects the creator.
      // Fetch sovereign to verify before submitting a doomed tx.
      const { getSovereignPDA } = await import('@/lib/program/pdas');
      const [sovereignPDA] = getSovereignPDA(BigInt(sovereignId), program.programId);
      const sovereignAccount = await (program.account as any).sovereignState.fetch(sovereignPDA);
      if (sovereignAccount.creator.toBase58() === publicKey.toBase58()) {
        throw new Error('Creator must use "Reclaim Escrow & Fees" instead. This instruction is for depositors only.');
      }

      const tx = await buildWithdrawFailedTx(
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
      queryClient.invalidateQueries({ queryKey: ['sovereigns'] });
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.depositRecord(
            variables.sovereignId.toString(),
            publicKey.toBase58()
          ),
        });
        queryClient.invalidateQueries({ queryKey: ['walletDeposits', publicKey.toBase58()] });
      }
    },
  });
}

/**
 * Creator withdraws escrowed GOR + creation fee from a failed bonding.
 */
export function useWithdrawCreatorFailed() {
  const program = useProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sovereignId }: { sovereignId: string }) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const tx = await buildWithdrawCreatorFailedTx(
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
      queryClient.invalidateQueries({ queryKey: ['sovereigns'] });
    },
  });
}
