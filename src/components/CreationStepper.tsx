'use client';

import { CreationProgress } from '@/hooks/useTransactions';

const EXPLORER_URL = 'https://trashscan.io/tx';

interface CreationStepperProps {
  progress: CreationProgress | null;
  error?: string | null;
  onClose?: () => void;
}

export default function CreationStepper({ progress, error, onClose }: CreationStepperProps) {
  if (!progress) return null;

  const allDone = progress.steps.every(s => s.status === 'confirmed');
  const hasError = !!error || progress.steps.some(s => s.status === 'error');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-[var(--border)] bg-[var(--dark-green-bg)] p-6 shadow-[var(--shadow)]">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {allDone
              ? '$overeign Created!'
              : hasError
                ? 'Creation Failed'
                : 'Creating $overeign...'}
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            {allDone
              ? 'All transactions confirmed on-chain.'
              : hasError
                ? 'An error occurred during creation.'
                : 'Please approve each transaction in your wallet.'}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {progress.steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                step.status === 'signing' || step.status === 'confirming'
                  ? 'border-[var(--money-green)]/30 bg-[rgba(46,235,127,0.04)] shadow-[0_0_8px_rgba(46,235,127,0.12)]'
                  : step.status === 'confirmed'
                    ? 'border-[rgba(46,235,127,0.3)] bg-[rgba(46,235,127,0.04)]'
                    : step.status === 'error'
                      ? 'border-[var(--loss)] bg-[rgba(229,72,77,0.06)]'
                      : 'border-[var(--border)] bg-transparent'
              }`}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0">
                {step.status === 'confirmed' ? (
                  <div className="w-8 h-8 rounded-full bg-[var(--profit)] flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="#14110A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : step.status === 'signing' || step.status === 'confirming' ? (
                  <div className="w-8 h-8 rounded-full bg-[var(--money-green)] flex items-center justify-center">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="#14110A" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : step.status === 'error' ? (
                  <div className="w-8 h-8 rounded-full bg-[var(--loss)] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3L11 11M11 3L3 11" stroke="#14110A" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[rgba(11,14,12,0.55)] border border-[var(--border)] flex items-center justify-center">
                    <span className="text-sm font-bold text-[var(--muted)]">{idx + 1}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${
                    step.status === 'confirmed'
                      ? 'text-[var(--profit)]'
                      : step.status === 'signing' || step.status === 'confirming'
                        ? 'text-[var(--money-green)]'
                        : step.status === 'error'
                          ? 'text-[var(--loss)]'
                          : 'text-[var(--muted)]'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-[var(--faint)]">
                    {step.status === 'signing' && 'Awaiting signature...'}
                    {step.status === 'confirming' && 'Confirming...'}
                    {step.status === 'confirmed' && 'Confirmed'}
                    {step.status === 'error' && 'Failed'}
                  </span>
                </div>
                {step.signature && (
                  <a
                    href={`${EXPLORER_URL}/${step.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--money-green)] hover:underline truncate block mt-0.5"
                  >
                    {step.signature.slice(0, 20)}...{step.signature.slice(-8)}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[rgba(229,72,77,0.1)] border border-[var(--loss)] text-sm text-[var(--loss)]">
            {error}
          </div>
        )}

        {/* Progress bar */}
        {!allDone && !hasError && (
          <div className="mt-5">
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--money-green)] transition-all duration-500 ease-out"
                style={{
                  width: `${((progress.steps.filter(s => s.status === 'confirmed').length) / progress.totalSteps) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--faint)] text-center mt-2">
              Step {progress.currentStep + 1} of {progress.totalSteps}
            </p>
          </div>
        )}

        {/* Close button (only when done or errored) */}
        {(allDone || hasError) && onClose && (
          <button
            onClick={onClose}
            className={`mt-5 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              allDone
                ? 'bg-[var(--profit)] text-[#14110A] hover:bg-[var(--slime)]'
                : 'bg-[var(--border)] text-[var(--text)] hover:bg-[var(--concrete)]'
            }`}
          >
            {allDone ? 'View $overeign →' : 'Close'}
          </button>
        )}
      </div>
    </div>
  );
}
