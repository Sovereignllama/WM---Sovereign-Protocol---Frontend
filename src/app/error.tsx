'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Sovereign] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-[var(--muted)] text-sm mb-6 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-lg text-sm font-bold bg-[var(--money-green)] text-black hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );
}
