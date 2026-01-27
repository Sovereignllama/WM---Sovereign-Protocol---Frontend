'use client';

import { SovereignDisplayData, SovereignStatus } from '@/types/sovereign';
import { SovereignCard } from './SovereignCard';

interface SovereignListProps {
  sovereigns: SovereignDisplayData[];
  filter?: SovereignStatus | 'all' | 'lowVolume';
  emptyMessage?: string;
}

export function SovereignList({ sovereigns, filter = 'all', emptyMessage }: SovereignListProps) {
  const filteredSovereigns = filter === 'all' 
    ? sovereigns 
    : filter === 'lowVolume'
    ? sovereigns.filter(s => s.activityCheckInitiated)
    : sovereigns.filter(s => s.status === filter);

  if (filteredSovereigns.length === 0) {
    return (
      <div className="card card-clean text-center py-12">
        <div className="text-4xl mb-4">👑</div>
        <p className="text-[var(--muted)]">
          {emptyMessage || 'No sovereigns found'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {filteredSovereigns.map((sovereign) => (
        <SovereignCard key={sovereign.sovereignId.toString()} sovereign={sovereign} />
      ))}
    </div>
  );
}
