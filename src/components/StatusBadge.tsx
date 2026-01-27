'use client';

import { SovereignStatus } from '@/types/sovereign';

interface StatusBadgeProps {
  status: SovereignStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<SovereignStatus, { label: string; className: string }> = {
    Bonding: { label: 'Bonding', className: 'badge bonding' },
    Recovery: { label: 'Recovery', className: 'badge recovery' },
    Active: { label: 'Active', className: 'badge active' },
    Failed: { label: 'Failed', className: 'badge loss' },
    Unwound: { label: 'Unwound', className: 'badge' },
  };

  const config = statusConfig[status];

  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
}
