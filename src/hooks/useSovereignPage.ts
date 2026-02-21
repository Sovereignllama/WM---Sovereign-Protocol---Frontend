'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';
import {
  fetchSovereignPage,
  saveSovereignPage,
  uploadPageImage,
  SovereignPageData,
  SovereignPageInput,
} from '@/lib/sovereignPage';

/**
 * Fetch sovereign page data (public)
 */
export function useSovereignPage(sovereignId: number | undefined) {
  return useQuery({
    queryKey: ['sovereignPage', sovereignId],
    queryFn: () => fetchSovereignPage(sovereignId!),
    enabled: !!sovereignId,
    staleTime: 30_000,
  });
}

/**
 * Hook to sign a message with the connected wallet.
 * Returns a function that produces { wallet, timestamp, signature }.
 */
export function useSignPageAuth(sovereignId: number | undefined) {
  const { publicKey, signMessage } = useWallet();

  return useCallback(async () => {
    if (!publicKey || !signMessage || !sovereignId) {
      throw new Error('Wallet not connected or signMessage not supported');
    }

    const wallet = publicKey.toBase58();
    const timestamp = Date.now();
    const message = `Edit Sovereign #${sovereignId} page at ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = await signMessage(messageBytes);
    const signature = Buffer.from(signatureBytes).toString('base64');

    return { wallet, timestamp, signature };
  }, [publicKey, signMessage, sovereignId]);
}

/**
 * Mutation to save sovereign page
 */
export function useSaveSovereignPage(sovereignId: number | undefined) {
  const queryClient = useQueryClient();
  const signAuth = useSignPageAuth(sovereignId);

  return useMutation({
    mutationFn: async (page: SovereignPageInput) => {
      if (!sovereignId) throw new Error('No sovereignId');
      const { wallet, timestamp, signature } = await signAuth();
      return saveSovereignPage(sovereignId, wallet, timestamp, signature, page);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sovereignPage', sovereignId] });
    },
  });
}

/**
 * Mutation to upload an image for the page
 */
export function useUploadPageImage(sovereignId: number | undefined) {
  const signAuth = useSignPageAuth(sovereignId);

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'cover' | 'gallery' }) => {
      if (!sovereignId) throw new Error('No sovereignId');
      const { wallet, timestamp, signature } = await signAuth();
      return uploadPageImage(sovereignId, wallet, timestamp, signature, file, type);
    },
  });
}
