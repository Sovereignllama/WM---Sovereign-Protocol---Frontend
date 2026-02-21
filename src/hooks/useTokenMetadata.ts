'use client';

import { useQuery } from '@tanstack/react-query';

interface TokenMetadata {
  image: string | null;
  description: string | null;
}

/**
 * Fetches both the token image URL and description from a metadata URI (IPFS JSON).
 * Caches the result so the metadata JSON is only fetched once per URI.
 */
export function useTokenMetadata(metadataUri?: string) {
  return useQuery<TokenMetadata>({
    queryKey: ['tokenMetadata', metadataUri],
    queryFn: async () => {
      if (!metadataUri) return { image: null, description: null };
      const res = await fetch(metadataUri);
      if (!res.ok) return { image: null, description: null };
      const json = await res.json();
      return {
        image: (json.image as string) || null,
        description: (json.description as string) || null,
      };
    },
    staleTime: Infinity, // metadata never changes
    enabled: !!metadataUri,
  });
}
