'use client';

import Link from 'next/link';
import { SovereignDisplayData } from '@/types/sovereign';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface SovereignCardProps {
  sovereign: SovereignDisplayData;
}

export function SovereignCard({ sovereign }: SovereignCardProps) {
  const timeRemaining = sovereign.bondDeadline > new Date() 
    ? formatDistanceToNow(sovereign.bondDeadline, { addSuffix: true })
    : 'Ended';

  return (
    <Link href={`/sovereign/${sovereign.sovereignId}`}>
      <div className="card card-clean hover:border-[rgba(242,183,5,0.35)] transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="h3 text-white mb-1">{sovereign.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">
                {sovereign.tokenSymbol || 'TOKEN'}
              </span>
              <span className="text-[var(--faint)]">•</span>
              <span className="text-sm text-[var(--faint)]">
                {sovereign.sovereignType === 'TokenLaunch' ? 'Token Launch' : 'BYO Token'}
              </span>
            </div>
          </div>
          <StatusBadge status={sovereign.status} />
        </div>

        {/* Progress Bar */}
        {sovereign.status === 'Bonding' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--muted)]">Bond Progress</span>
              <span className="text-white font-bold">{sovereign.bondProgress.toFixed(1)}%</span>
            </div>
            <div className="progress-bar money">
              <div 
                className="fill" 
                style={{ width: `${Math.min(sovereign.bondProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Recovery Progress */}
        {sovereign.status === 'Recovery' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--muted)]">Recovery Progress</span>
              <span className="text-white font-bold">{sovereign.recoveryProgress.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="fill" 
                style={{ width: `${Math.min(sovereign.recoveryProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat">
            <div className="k">Target</div>
            <div className="v text-lg">{sovereign.bondTargetSol} GOR</div>
          </div>
          <div className="stat">
            <div className="k">Raised</div>
            <div className="v text-lg">{sovereign.totalDepositedSol} GOR</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--faint)]">👥</span>
            <span className="text-sm text-[var(--muted)]">
              {sovereign.depositorCount} depositor{sovereign.depositorCount !== 1 ? 's' : ''}
            </span>
          </div>
          {sovereign.status === 'Bonding' && (
            <span className="text-sm text-[var(--hazard-yellow)]">
              {timeRemaining}
            </span>
          )}
          {sovereign.status === 'Recovery' && sovereign.sellFeeBps > 0 && (
            <span className="text-sm text-[var(--slime)]">
              {(sovereign.sellFeeBps / 100).toFixed(1)}% sell fee
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
