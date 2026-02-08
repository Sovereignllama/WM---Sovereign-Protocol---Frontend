'use client';

import { SovereignStatus } from '@/types/sovereign';

interface StatusBadgeProps {
  status: SovereignStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<SovereignStatus, { label: string; className: string }> = {
    Bonding: { label: 'Bonding', className: 'badge bonding' },
    Finalizing: { label: 'Finalizing', className: 'badge bonding' },
    PoolCreated: { label: 'Pool Created', className: 'badge bonding' },
    Recovery: { label: 'Recovery', className: 'badge recovery' },
    Active: { label: 'Active', className: 'badge active' },
    Unwinding: { label: 'Unwinding', className: 'badge recovery' },
    Unwound: { label: 'Unwound', className: 'badge' },
    Failed: { label: 'Failed', className: 'badge loss' },
    EmergencyUnlocked: { label: 'Emergency', className: 'badge loss' },
    Retired: { label: 'Retired', className: 'badge' },
  };

  const config = statusConfig[status];

  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
}
