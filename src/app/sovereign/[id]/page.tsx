'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { useSovereign, useDepositRecord, useEnginePool, useProtocolState } from '@/hooks/useSovereign';
import { useDeposit, useWithdraw, useFinalizeEnginePool, useWithdrawFailed, useWithdrawCreatorFailed, useTokenRedemption } from '@/hooks/useTransactions';
import { useProposals } from '@/hooks/useGovernance';
import { usePoolSnapshot } from '@/hooks/usePoolSnapshot';
import { useTokenImage } from '@/hooks/useTokenImage';
import { StatusBadge } from '@/components/StatusBadge';
import { SovereignPageDisplay } from '@/components/SovereignPageDisplay';
import { useSovereignPage } from '@/hooks/useSovereignPage';
import { LAMPORTS_PER_GOR, config } from '@/lib/config';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

export default function SovereignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const sovereignId = params.id as string;

  const { data: sovereign, isLoading, error } = useSovereign(sovereignId);
  const { data: depositRecord } = useDepositRecord(sovereignId);
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const finalizeEnginePool = useFinalizeEnginePool();
  const withdrawFailed = useWithdrawFailed();
  const withdrawCreatorFailed = useWithdrawCreatorFailed();
  const tokenRedemption = useTokenRedemption();


  const { data: imageUrl } = useTokenImage(sovereign?.metadataUri);
  const { data: sovereignPage } = useSovereignPage(sovereignId);
  const { data: enginePool } = useEnginePool(sovereignId);
  const { data: poolSnapshot } = usePoolSnapshot(sovereign?.sovereignId);

  const { data: protocolState } = useProtocolState();
  const { data: proposals } = useProposals(sovereign?.sovereignId);

  // Fetch user's token balance for this sovereign's token mint
  const isRedemptionStatus = sovereign?.status === 'Halted' || sovereign?.status === 'Retired'
    || sovereign?.status === 'Unwinding' || sovereign?.status === 'Unwound';
  const { data: userTokenBalance } = useQuery({
    queryKey: ['userTokenBalance', publicKey?.toBase58(), sovereign?.tokenMint],
    queryFn: async () => {
      if (!publicKey || !sovereign?.tokenMint) return 0;
      try {
        const mint = new PublicKey(sovereign.tokenMint);
        // Try Token-2022 first, then SPL Token
        for (const programId of [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID]) {
          try {
            const ata = getAssociatedTokenAddressSync(mint, publicKey, false, programId);
            const info = await connection.getAccountInfo(ata);
            if (info && info.data.length >= 72) {
              const decoded = AccountLayout.decode(info.data);
              return Number(decoded.amount);
            }
          } catch { /* try next */ }
        }
        return 0;
      } catch {
        return 0;
      }
    },
    staleTime: 15_000,
    enabled: !!publicKey && !!sovereign?.tokenMint && isRedemptionStatus,
  });

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [windDownExpanded, setWindDownExpanded] = useState(false);







  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--card-bg)] rounded w-1/3" />
          <div className="h-48 bg-[var(--card-bg)] rounded" />
          <div className="h-48 bg-[var(--card-bg)] rounded" />
        </div>
      </div>
    );
  }

  if (error || !sovereign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card card-clean text-center py-12">
          <h2 className="h2 mb-2" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>Sovereign Not Found</h2>
          <p className="text-[var(--muted)] mb-4">
            Sovereign #{sovereignId} does not exist or could not be loaded.
          </p>
          <Link href="/sovereigns" className="btn-money">
            Back to All Sovereigns
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = publicKey?.toBase58() === sovereign.creator;
  const isBonding = sovereign.status === 'Bonding';
  const bondDeadlinePassed = sovereign.bondDeadline < new Date();
  const timeRemaining = sovereign.bondDeadline > new Date()
    ? formatDistanceToNow(sovereign.bondDeadline, { addSuffix: false })
    : 'Ended';

  // Lifecycle phase helpers
  const isBondingPhase = ['Bonding', 'Finalizing', 'PoolCreated'].includes(sovereign.status);
  const isPostRecovery = ['Recovery', 'Active', 'Unwinding', 'Unwound', 'Halted', 'Retired'].includes(sovereign.status);

  // Pool price formatted for display (spotPrice is ×1e9 precision)
  const tokenPriceGor = enginePool?.spotPrice ? (enginePool.spotPrice / 1e9) : 0;
  const recoveryPct = enginePool && Number(enginePool.recoveryTarget) > 0
    ? (Number(enginePool.totalRecovered) / Number(enginePool.recoveryTarget)) * 100
    : 0;

  // Spread: prefer backend pool snapshot (uses real bin data for accurate sell price).
  // Client-side fallback uses lastPrice (most recent execution price) as a proxy
  // for the active bin's sell rate, vs CPAMM spot as the buy price.
  // Positive = buy spread (buy costs more than sell returns).
  // Negative = sell premium (seller gets more than CPAMM spot — happens during sell runs).
  let spreadPct: number | null = null;
  if (poolSnapshot && poolSnapshot.spreadPct != null) {
    spreadPct = poolSnapshot.spreadPct;
  } else if (enginePool) {
    const buySpot = enginePool.spotPrice / 1e9; // gorReserve / tokenReserve
    const lastExecPrice = Number(enginePool.lastPrice) / 1e9; // last swap execution price
    if (buySpot > 0 && lastExecPrice > 0) {
      spreadPct = ((buySpot - lastExecPrice) / buySpot) * 100;
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || !connected) return;
    try {
      await deposit.mutateAsync({
        sovereignId,
        amountGor: parseFloat(depositAmount),
      });
      setDepositAmount('');
    } catch (err: any) {
      console.error('Deposit failed:', err);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !connected) return;
    try {
      await withdraw.mutateAsync({
        sovereignId,
        amountGor: parseFloat(withdrawAmount),
      });
      setWithdrawAmount('');
    } catch (err: any) {
      console.error('Withdraw failed:', err);
    }
  };

  const handleFinalize = async () => {
    if (!connected || !sovereign) return;
    try {
      if (sovereign.status === 'Finalizing') {
        // Single-step engine pool finalization
        await finalizeEnginePool.mutateAsync({
          sovereignId,
        });
      }
    } catch (err: any) {
      console.error('Finalize failed:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link href="/sovereigns" className="text-[var(--muted)] hover:text-white text-sm mb-4 inline-block">
        &larr; All Sovereigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={sovereign.tokenSymbol || sovereign.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[var(--border)]"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--card-bg)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-lg font-bold">
              {(sovereign.tokenSymbol || sovereign.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="h1 mb-1" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>{sovereign.name}</h1>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {sovereign.tokenSymbol && (
                <>
                  <span className="text-[var(--money-green)] font-medium">
                    {sovereign.tokenName} ({sovereign.tokenSymbol})
                  </span>
                  <span className="text-[var(--faint)]">|</span>
                </>
              )}
              <span className="text-[var(--muted)]">
                {sovereign.sovereignType === 'TokenLaunch' ? 'Token Launch' : 'BYO Token'}
              </span>
              <span className="text-[var(--faint)]">|</span>
              <span className="text-[var(--muted)]">
                Created {format(sovereign.createdAt, 'MMM d, yyyy')}
              </span>
              <span className="text-[var(--faint)]">|</span>
              <div className="flex items-center gap-2">
                <a
                  href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--money-green)] hover:underline"
                  title="Sovereign Account"
                >
                  Sovereign
                </a>
                {sovereign.tokenMint && sovereign.tokenMint !== '11111111111111111111111111111111' && (
                  <>
                    <span className="text-[var(--faint)]">·</span>
                    <a
                      href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.tokenMint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--money-green)] hover:underline"
                      title="Token Mint"
                    >
                      Token
                    </a>
                  </>
                )}
                {sovereign.creator && (
                  <>
                    <span className="text-[var(--faint)]">·</span>
                    <a
                      href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--money-green)] hover:underline"
                      title="Creator Wallet"
                    >
                      Creator
                    </a>
                  </>
                )}
                {sovereign.poolState && sovereign.poolState !== '11111111111111111111111111111111' && (
                  <>
                    <span className="text-[var(--faint)]">·</span>
                    <a
                      href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.poolState}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--money-green)] hover:underline"
                      title="Liquidity Pool"
                    >
                      Pool
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && (
            <Link
              href={`/sovereign/${sovereignId}/edit`}
              className="px-3 py-1.5 rounded-lg bg-[var(--dark-green-bg)] border border-[var(--border)] text-[var(--money-green)] text-xs font-bold hover:border-[var(--money-green)] transition-colors"
            >
              ✏️ Edit Page
            </Link>
          )}
          <StatusBadge status={sovereign.status as any} />
        </div>
      </div>

      {/* ── Wind-Down Notice ── */}
      {sovereign && (sovereign.hasActiveProposal || sovereign.activityCheckInitiated || sovereign.status === 'Unwinding' || sovereign.status === 'Unwound') && (
        <WindDownBanner
          sovereign={sovereign}
          proposals={proposals}
          protocolState={protocolState}
          expanded={windDownExpanded}
          onToggle={() => setWindDownExpanded(!windDownExpanded)}
        />
      )}

      {/* ── Info Strip (horizontal, full-width) ── */}
      <div className="card card-clean p-4 mb-6">
        <div className="flex flex-col gap-4">

          {/* Row 1: Key Stats + Progress */}
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-3">
            {/* Key Stats */}
            {isBondingPhase ? (
              <>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Bond Target</div>
                  <div className="text-sm font-bold text-white">{sovereign.bondTargetGor.toLocaleString()} GOR</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Deposited</div>
                  <div className="text-sm font-bold text-[var(--money-green)]">{sovereign.totalDepositedGor.toLocaleString()} GOR</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Depositors</div>
                  <div className="text-sm font-bold text-white">{sovereign.depositorCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">
                    {isBonding ? 'Time Left' : 'Transfer Fee'}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {isBonding ? timeRemaining : sovereign.feeControlRenounced ? '0% 🔒' : `${(sovereign.sellFeeBps / 100).toFixed(1)}%`}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">24h Change</div>
                  <div className={`text-sm font-bold ${
                    poolSnapshot?.priceChange24h && poolSnapshot.priceChange24h > 0
                      ? 'text-[var(--profit)]'
                      : poolSnapshot?.priceChange24h && poolSnapshot.priceChange24h < 0
                      ? 'text-[var(--loss)]'
                      : 'text-[var(--muted)]'
                  }`}>
                    {poolSnapshot?.priceChange24h != null && poolSnapshot.priceChange24h !== 0
                      ? `${poolSnapshot.priceChange24h > 0 ? '+' : ''}${poolSnapshot.priceChange24h.toFixed(2)}%`
                      : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Price</div>
                  <div className="text-sm font-bold text-[var(--money-green)]">
                    {tokenPriceGor > 0 ? `${tokenPriceGor.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">GOR Reserve</div>
                  <div className="text-sm font-bold text-white">
                    {enginePool ? enginePool.gorReserveGor.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Fees Earned</div>
                  <div className="text-sm font-bold text-[var(--money-green)]">
                    {enginePool ? `${enginePool.totalFeesCollectedGor.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Spread</div>
                  <div className={`text-sm font-bold ${spreadPct != null && spreadPct < 0 ? 'text-[var(--profit)]' : 'text-white'}`}>
                    {spreadPct != null
                      ? spreadPct < 0
                        ? `${Math.abs(spreadPct).toFixed(1)}% (sell premium)`
                        : `${spreadPct.toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                {isPostRecovery && enginePool && (
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Tokens Circulating</div>
                    <div className="text-sm font-bold text-white">
                      {Math.round(enginePool.totalTokensSoldFormatted).toLocaleString()}
                      {' / '}
                      {Math.round(enginePool.totalTokenSupplyFormatted).toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Trades</div>
                  <div className="text-sm font-bold text-white">
                    {enginePool ? enginePool.totalTrades.toLocaleString() : '—'}
                  </div>
                </div>
              </>
            )}

            {/* Fees */}
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Swap Fee</div>
              <div className="text-sm font-bold text-white">{((enginePool?.swapFeeBps ?? sovereign.swapFeeBps) / 100).toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-0.5">Transfer Fee</div>
              <div className="text-sm font-bold text-white">
                {sovereign.feeControlRenounced ? '0% 🔒' : `${(sovereign.sellFeeBps / 100).toFixed(1)}% ⚙️`}
              </div>
            </div>
          </div>

          {/* Row 2: Progress bars (if applicable) */}
          {(isBonding || (sovereign.status === 'Recovery' && enginePool && !enginePool.recoveryComplete)) && (
            <div className="flex flex-wrap gap-6">
              {isBonding && (
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--muted)]">Bond Progress</span>
                    <span className="text-white font-bold">{sovereign.bondingProgress.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar money">
                    <div className="fill" style={{ width: `${Math.min(sovereign.bondingProgress, 100)}%` }} />
                  </div>
                </div>
              )}
              {sovereign.status === 'Recovery' && enginePool && !enginePool.recoveryComplete && (
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--muted)]">Recovery</span>
                    <span className="text-white font-bold">{recoveryPct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar money">
                    <div className="fill" style={{ width: `${Math.min(recoveryPct, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 3: Details + Position + Actions (only if has content) */}
          {(isBondingPhase || sovereign.creatorEscrowGor > 0 || (connected && depositRecord && !isCreator) || (connected && isBonding) || (connected && sovereign.status === 'Finalizing') || (connected && sovereign.status === 'Halted') || (connected && sovereign.status === 'Failed') || !connected) && (
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3 text-xs border-t border-[var(--border)] pt-3">
            {isBondingPhase && (
              <>
                <div className="flex gap-2">
                  <span className="text-[var(--muted)]">Deadline</span>
                  <span className="text-white">{format(sovereign.bondDeadline, 'MMM d, yyyy HH:mm')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[var(--muted)]">Duration</span>
                  <span className="text-white">{Math.round(Number(sovereign.bondDuration) / 86400)} days</span>
                </div>
              </>
            )}
            {sovereign.creatorEscrowGor > 0 && (
              <div className="flex gap-2">
                <span className="text-[var(--muted)]">Creator Buy-in</span>
                <span className="text-white">{sovereign.creatorEscrowGor.toLocaleString()} GOR</span>
              </div>
            )}

            {/* Position */}
            {connected && depositRecord && !isCreator && (
              <div className="flex items-center justify-center gap-4 w-full">
                <div className="flex gap-2">
                  <span className="text-[var(--muted)]">DR:</span>
                  <span className="text-[var(--money-green)] font-bold">{depositRecord.amountGor.toLocaleString()} GOR</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[var(--muted)]">Share:</span>
                  <span className="text-white">{depositRecord.sharesPercent.toFixed(2)}%</span>
                </div>
              </div>
            )}

            {/* Inline Actions */}
            {connected && isBonding && !bondDeadlinePassed && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className={`px-2 py-1 rounded text-[10px] font-medium ${
                        activeTab === 'deposit'
                          ? 'bg-[var(--money-green)] text-black'
                          : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-white'
                      }`}
                    >
                      Deposit
                    </button>
                    {depositRecord && (
                      <button
                        onClick={() => setActiveTab('withdraw')}
                        className={`px-2 py-1 rounded text-[10px] font-medium ${
                          activeTab === 'withdraw'
                            ? 'bg-[var(--money-green)] text-black'
                            : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-white'
                        }`}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                  {activeTab === 'deposit' && (
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00 GOR"
                        className="w-28 bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1 text-white text-xs"
                        min="0"
                        step="0.1"
                      />
                      <button
                        onClick={handleDeposit}
                        disabled={!depositAmount || deposit.isPending}
                        className="btn-money px-3 py-1 text-xs"
                      >
                        {deposit.isPending ? '...' : 'Go'}
                      </button>
                    </div>
                  )}
                  {activeTab === 'withdraw' && depositRecord && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--muted)]">Max: {depositRecord.amountGor.toLocaleString()}</span>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00 GOR"
                        className="w-28 bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1 text-white text-xs"
                        min="0"
                        max={depositRecord.amountGor}
                        step="0.1"
                      />
                      <button
                        onClick={handleWithdraw}
                        disabled={!withdrawAmount || withdraw.isPending}
                        className="btn-money px-3 py-1 text-xs"
                      >
                        {withdraw.isPending ? '...' : 'Go'}
                      </button>
                    </div>
                  )}
                  {deposit.error && <span className="text-red-400 text-[10px]">{(deposit.error as Error).message}</span>}
                  {withdraw.error && <span className="text-red-400 text-[10px]">{(withdraw.error as Error).message}</span>}
                </div>
              </>
            )}

            {connected && isBonding && bondDeadlinePassed && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-red-400 font-medium">Bonding failed — deadline passed</span>
                  <Link href="/governance" className="px-3 py-1 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700">
                    Governance →
                  </Link>
                </div>
              </>
            )}

            {connected && sovereign.status === 'Finalizing' && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">Bond target reached!</span>
                  <button
                    onClick={handleFinalize}
                    disabled={finalizeEnginePool.isPending}
                    className="btn-money px-3 py-1 text-xs"
                  >
                    {finalizeEnginePool.isPending ? 'Creating Pool...' : 'Finalize'}
                  </button>
                  {finalizeEnginePool.error && <span className="text-red-400 text-[10px]">{(finalizeEnginePool.error as Error).message}</span>}
                  {finalizeEnginePool.isSuccess && <span className="text-[var(--slime)] text-[10px]">Pool created!</span>}
                </div>
              </>
            )}

            {connected && (sovereign.status === 'Halted' || sovereign.status === 'Retired') && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex flex-col gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-red-400 font-bold">⚠️ Halted — Claim your funds</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(userTokenBalance ?? 0) > 0 && sovereign.tokenRedemptionPoolGor > 0 && (
                      <button
                        onClick={() => tokenRedemption.mutateAsync({ sovereignId, sovereignStatus: sovereign.status })}
                        disabled={tokenRedemption.isPending}
                        className="px-3 py-1 rounded text-xs font-bold bg-[var(--money-green)] text-black hover:brightness-110 disabled:opacity-40"
                      >
                        {tokenRedemption.isPending ? 'Redeeming...' : `Redeem ${((userTokenBalance ?? 0) / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sovereign.tokenSymbol || 'tokens'} for GOR`}
                      </button>
                    )}
                    {depositRecord && depositRecord.amountGor > 0 && (
                      <Link href={`/governance?sovereign=${sovereignId}`} className="px-3 py-1 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700">
                        Governance → Claim {depositRecord.amountGor.toLocaleString()} GOR
                      </Link>
                    )}
                    {!(userTokenBalance ?? 0) && !depositRecord && (
                      <span className="text-xs text-[var(--muted)]">No tokens or deposits to claim</span>
                    )}
                  </div>
                  {tokenRedemption.isSuccess && <span className="text-[var(--slime)] text-[10px]">Tokens redeemed for GOR!</span>}
                  {tokenRedemption.error && <span className="text-red-400 text-[10px]">{(tokenRedemption.error as Error).message}</span>}
                  {sovereign.tokenRedemptionDeadline && sovereign.tokenRedemptionPoolGor > 0 && (
                    <span className="text-[10px] text-[var(--muted)]">
                      Redemption window {sovereign.tokenRedemptionDeadline > new Date() ? `closes ${formatDistanceToNow(sovereign.tokenRedemptionDeadline, { addSuffix: true })}` : 'has expired'}
                    </span>
                  )}
                </div>
              </>
            )}

            {connected && (sovereign.status === 'Unwinding' || sovereign.status === 'Unwound') && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex flex-col gap-2 bg-[var(--money-green)]/5 border border-[var(--money-green)]/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-[var(--money-green)] font-bold">{sovereign.status === 'Unwound' ? '✅ Unwound' : '🔄 Unwinding'} — Claim your funds</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(userTokenBalance ?? 0) > 0 && sovereign.tokenRedemptionPoolGor > 0 && (
                      <button
                        onClick={() => tokenRedemption.mutateAsync({ sovereignId, sovereignStatus: sovereign.status })}
                        disabled={tokenRedemption.isPending}
                        className="px-3 py-1 rounded text-xs font-bold bg-[var(--money-green)] text-black hover:brightness-110 disabled:opacity-40"
                      >
                        {tokenRedemption.isPending ? 'Redeeming...' : `Redeem ${((userTokenBalance ?? 0) / LAMPORTS_PER_GOR).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sovereign.tokenSymbol || 'tokens'} for GOR`}
                      </button>
                    )}
                    {depositRecord && depositRecord.amountGor > 0 && (
                      <Link href={`/governance?sovereign=${sovereignId}`} className="px-3 py-1 rounded text-xs font-bold bg-[var(--money-green)]/20 text-[var(--money-green)] hover:bg-[var(--money-green)]/30 border border-[var(--money-green)]/30">
                        Governance → Claim {depositRecord.amountGor.toLocaleString()} GOR
                      </Link>
                    )}
                    {!(userTokenBalance ?? 0) && !depositRecord && (
                      <span className="text-xs text-[var(--muted)]">No tokens or deposits to claim</span>
                    )}
                  </div>
                  {tokenRedemption.isSuccess && <span className="text-[var(--slime)] text-[10px]">Tokens redeemed for GOR!</span>}
                  {tokenRedemption.error && <span className="text-red-400 text-[10px]">{(tokenRedemption.error as Error).message}</span>}
                  {sovereign.tokenRedemptionDeadline && sovereign.tokenRedemptionPoolGor > 0 && (
                    <span className="text-[10px] text-[var(--muted)]">
                      Redemption window {sovereign.tokenRedemptionDeadline > new Date() ? `closes ${formatDistanceToNow(sovereign.tokenRedemptionDeadline, { addSuffix: true })}` : 'has expired'}
                    </span>
                  )}
                </div>
              </>
            )}

            {connected && sovereign.status === 'Failed' && (
              <>
                <div className="hidden sm:block w-px self-stretch bg-[var(--border)]" />
                <div className="flex flex-col gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-red-400 font-bold">Bonding Failed — Reclaim your funds</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {depositRecord && depositRecord.amountGor > 0 && !isCreator && (
                      <button
                        onClick={async () => {
                          await withdrawFailed.mutateAsync({ sovereignId });
                        }}
                        disabled={withdrawFailed.isPending}
                        className="px-3 py-1 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                      >
                        {withdrawFailed.isPending ? 'Reclaiming...' : `Reclaim ${depositRecord.amountGor.toLocaleString()} GOR`}
                      </button>
                    )}
                    {isCreator && (
                      <button
                        onClick={async () => {
                          await withdrawCreatorFailed.mutateAsync({ sovereignId });
                        }}
                        disabled={withdrawCreatorFailed.isPending}
                        className="px-3 py-1 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"
                      >
                        {withdrawCreatorFailed.isPending ? 'Reclaiming...' : 'Reclaim Escrow & Fees'}
                      </button>
                    )}
                    <Link href="/governance" className="px-3 py-1 rounded text-xs font-bold bg-[var(--card-bg)] text-[var(--muted)] hover:text-white border border-[var(--border)]">
                      Governance →
                    </Link>
                  </div>
                  {withdrawFailed.error && <span className="text-red-400 text-[10px]">{(withdrawFailed.error as Error).message}</span>}
                  {withdrawFailed.isSuccess && <span className="text-[var(--slime)] text-[10px]">Deposit reclaimed!</span>}
                  {withdrawCreatorFailed.error && <span className="text-red-400 text-[10px]">{(withdrawCreatorFailed.error as Error).message}</span>}
                  {withdrawCreatorFailed.isSuccess && <span className="text-[var(--slime)] text-[10px]">Escrow & fees reclaimed!</span>}
                </div>
              </>
            )}

            {!connected && (
              <span className="text-[var(--muted)] text-xs ml-auto">Connect wallet for actions</span>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ── Creator Content Area (full width) ── */}
      <div className="w-full">
        {sovereignPage ? (
          <SovereignPageDisplay page={sovereignPage} />
        ) : (
          <div className="card card-clean p-8 text-center">
            <p className="text-[var(--muted)] text-sm">
              {isCreator
                ? 'Your page is empty. Click "Edit Page" to add content.'
                : 'The creator hasn\'t set up a page yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Wind-Down Banner — shows governance unwind progress
// ============================================================

type WindDownStep = {
  label: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
  detail?: string;
};

function WindDownBanner({
  sovereign,
  proposals,
  protocolState,
  expanded,
  onToggle,
}: {
  sovereign: any;
  proposals: any[] | undefined;
  protocolState: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const activeProposal = proposals?.find((p: any) => p.status === 'Active');
  const passedProposal = proposals?.find((p: any) => p.status === 'Passed');
  const executedProposal = proposals?.find((p: any) => p.status === 'Executed');

  const now = new Date();
  const proposal = activeProposal || passedProposal || executedProposal;

  // Determine which step we're on
  const steps: WindDownStep[] = [];

  // Step 1: Proposal Created
  if (proposal) {
    const votingStarted = proposal.votingStartsAt ? proposal.votingStartsAt <= now : true;
    const inDiscussion = proposal.votingStartsAt && !votingStarted;

    // Step 1: Discussion Period (the proposal creation IS the discussion period start)
    if (proposal.votingStartsAt) {
      steps.push({
        label: 'Discussion Period',
        description: 'A wind-down proposal has been initiated — grace period for the creator to address community concerns',
        status: inDiscussion ? 'active' : 'completed',
        detail: inDiscussion
          ? `Proposed by ${proposal.proposer.slice(0, 4)}…${proposal.proposer.slice(-4)} on ${format(proposal.createdAt, 'MMM d, yyyy h:mm a')}. Voting opens ${format(proposal.votingStartsAt, 'MMM d h:mm a')} (${formatDistanceToNow(proposal.votingStartsAt, { addSuffix: true })})`
          : `Proposed by ${proposal.proposer.slice(0, 4)}…${proposal.proposer.slice(-4)} — discussion ended, voting opened ${format(proposal.votingStartsAt, 'MMM d h:mm a')}`,
      });
    } else {
      // No discussion period (legacy proposal)
      steps.push({
        label: 'Proposal Created',
        description: 'A community member initiated a wind-down vote',
        status: 'completed',
        detail: proposal.createdAt
          ? `Proposed by ${proposal.proposer.slice(0, 4)}…${proposal.proposer.slice(-4)} on ${format(proposal.createdAt, 'MMM d, yyyy h:mm a')}`
          : undefined,
      });
    }

    // Step 2: Voting
    const votingEnded = proposal.votingEndsAt ? proposal.votingEndsAt < now : false;
    if (!inDiscussion) {
      const quorumPct = proposal.quorumBps > 0 ? ((proposal.totalVotedBps / proposal.quorumBps) * 100).toFixed(0) : '0';
      const forPct = proposal.totalVotedBps > 0
        ? ((proposal.votesForBps / proposal.totalVotedBps) * 100).toFixed(0) : '0';

      steps.push({
        label: 'Community Vote',
        description: `${proposal.quorumBps ? (proposal.quorumBps / 100).toFixed(0) : 67}% quorum required, ${proposal.passThresholdBps ? (proposal.passThresholdBps / 100).toFixed(0) : 51}% to pass`,
        status: votingEnded ? 'completed' : (proposal.status === 'Active' && votingStarted) ? 'active' : 'upcoming',
        detail: votingEnded
          ? `Voting ended — ${proposal.voterCount} voter(s), ${forPct}% FOR, quorum ${quorumPct}%`
          : proposal.votingEndsAt
            ? `${proposal.voterCount} vote(s) so far — ends ${format(proposal.votingEndsAt, 'MMM d h:mm a')} (${formatDistanceToNow(proposal.votingEndsAt, { addSuffix: true })})`
            : undefined,
      });
    }

    // Step 4: Observation Period (90 days)
    const observationDays = protocolState?.observationPeriod
      ? Math.round(protocolState.observationPeriod / 86400)
      : 90;

    if (proposal.status === 'Passed' || proposal.status === 'Executed' || sovereign.status === 'Unwinding' || sovereign.status === 'Unwound') {
      steps.push({
        label: `Observation Period (${observationDays} days)`,
        description: 'Monitoring fee activity to confirm the sovereign is no longer viable',
        status: sovereign.status === 'Unwinding' || sovereign.status === 'Unwound' ? 'completed' : 'active',
        detail: proposal.timelockEndsAt
          ? sovereign.status === 'Unwinding' || sovereign.status === 'Unwound'
            ? 'Observation completed — unwind proceeding'
            : `Observation ends ${format(proposal.timelockEndsAt, 'MMM d, yyyy')} (${formatDistanceToNow(proposal.timelockEndsAt, { addSuffix: true })})`
          : undefined,
      });
    } else {
      steps.push({
        label: `Observation Period (${observationDays} days)`,
        description: 'If vote passes, protocol monitors fee activity before unwinding',
        status: 'upcoming',
      });
    }

    // Step 5: Unwind Execution
    steps.push({
      label: 'Unwind Execution',
      description: 'Liquidity removed, funds distributed to depositors',
      status: sovereign.status === 'Unwound' ? 'completed' : sovereign.status === 'Unwinding' ? 'active' : 'upcoming',
      detail: sovereign.status === 'Unwound' && sovereign.unwoundAt
        ? `Unwound on ${format(sovereign.unwoundAt, 'MMM d, yyyy')}`
        : sovereign.status === 'Unwinding'
          ? 'Liquidity is being removed and prepared for distribution'
          : undefined,
    });

    // Step 6: Claim
    steps.push({
      label: 'Claim Funds',
      description: 'Depositors can claim their share of the unwound liquidity',
      status: sovereign.status === 'Unwound' ? 'active' : 'upcoming',
    });
  } else if (sovereign.activityCheckInitiated) {
    // Activity check flow (automated, not governance)
    steps.push({
      label: 'Activity Check Initiated',
      description: 'The protocol detected low activity and started an automated review',
      status: 'completed',
      detail: sovereign.activityCheckInitiatedAt
        ? `Started ${format(sovereign.activityCheckInitiatedAt, 'MMM d, yyyy h:mm a')}`
        : undefined,
    });
    steps.push({
      label: 'Observation Period',
      description: 'Monitoring fee activity to determine if the sovereign is still viable',
      status: sovereign.status === 'Unwinding' ? 'completed' : 'active',
    });
    steps.push({
      label: 'Unwind Execution',
      description: 'If activity stays low, liquidity will be removed and distributed',
      status: sovereign.status === 'Unwinding' ? 'active' : 'upcoming',
    });
    steps.push({
      label: 'Claim Funds',
      description: 'Depositors can claim their share',
      status: sovereign.status === 'Unwound' ? 'active' : 'upcoming',
    });
  }

  // Headline varies by status
  let headline = '⚠️ Wind-Down In Progress';
  let headlineColor = 'text-[var(--money-green)]';
  if (sovereign.status === 'Unwound') {
    headline = '✅ Wind-Down Complete';
    headlineColor = 'text-[var(--money-green)]';
  } else if (sovereign.status === 'Unwinding') {
    headline = '🔄 Unwinding In Progress';
    headlineColor = 'text-[var(--hazard-orange)]';
  } else if (proposal && proposal.votingStartsAt && proposal.votingStartsAt > now) {
    headline = '🗳️ Unwind Proposal — Discussion Period';
  } else if (activeProposal) {
    headline = '🗳️ Unwind Proposal — Voting Open';
  } else if (passedProposal) {
    headline = '⏳ Unwind Proposal Passed — Observation Period';
  } else if (sovereign.activityCheckInitiated) {
    headline = '⚠️ Activity Check — Low Activity Detected';
  }

  // Current step summary for collapsed view
  const currentStep = steps.find(s => s.status === 'active');
  const currentStepIndex = steps.findIndex(s => s.status === 'active');

  return (
    <div className={`mb-6 rounded-xl border overflow-hidden ${
      sovereign.status === 'Unwound'
        ? 'border-[var(--money-green)]/30 bg-[var(--money-green)]/5'
        : 'border-[var(--money-green)]/25 bg-[var(--money-green)]/5'
    }`}>
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${headlineColor}`}>{headline}</span>
          {currentStep && !expanded && (
            <span className="text-xs text-[var(--muted)]">
              — Step {currentStepIndex + 1}/{steps.length}: {currentStep.label}
            </span>
          )}
        </div>
        <span className="text-[var(--muted)] text-xs">
          {expanded ? '▲ Hide details' : '▼ View details'}
        </span>
      </button>

      {/* Expanded step tracker */}
      {expanded && steps.length > 0 && (
        <div className="px-4 pb-4 pt-1">
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Vertical timeline */}
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 ${
                    step.status === 'completed'
                      ? 'bg-[var(--money-green)] border-[var(--money-green)] text-black'
                      : step.status === 'active'
                      ? 'bg-[var(--money-green)]/15 border-[var(--money-green)] text-[var(--money-green)]'
                      : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--muted)]'
                  }`}>
                    {step.status === 'completed' ? '✓' : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[24px] ${
                      step.status === 'completed' ? 'bg-[var(--money-green)]/40' : 'bg-[var(--border)]'
                    }`} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-4 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                  <div className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-[var(--money-green)]'
                      : step.status === 'active' ? 'text-[var(--money-green)]'
                      : 'text-[var(--muted)]'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{step.description}</div>
                  {step.detail && (
                    <div className={`text-xs mt-1 ${
                      step.status === 'active' ? 'text-[var(--money-green)]/80' : 'text-[var(--muted)]/60'
                    }`}>
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

