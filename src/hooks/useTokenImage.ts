'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Fetches the token image URL from a metadata URI (IPFS JSON).
 * Caches the result so the metadata JSON is only fetched once per URI.
 */
export function useTokenImage(metadataUri?: string) {
  return useQuery({
    queryKey: ['tokenImage', metadataUri],
    queryFn: async () => {
      if (!metadataUri) return null;
      const res = await fetch(metadataUri);
      if (!res.ok) return null;
      const json = await res.json();
      return (json.image as string) || null;
    },
    staleTime: Infinity, // metadata never changes
    enabled: !!metadataUri,
  });
}
