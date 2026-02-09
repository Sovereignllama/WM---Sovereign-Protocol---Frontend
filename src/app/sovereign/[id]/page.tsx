'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSovereign, useDepositRecord } from '@/hooks/useSovereign';
import { useDeposit, useWithdraw, useClaimDepositorFees, useFinalizeCreatePool, useFinalizeAddLiquidity, useEmergencyUnlock, useEmergencyWithdraw, useEmergencyWithdrawCreator, useMintGenesisNft } from '@/hooks/useTransactions';
import { useTokenImage } from '@/hooks/useTokenImage';
import { StatusBadge } from '@/components/StatusBadge';
import { LAMPORTS_PER_GOR, config } from '@/lib/config';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

export default function SovereignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const sovereignId = params.id as string;

  const { data: sovereign, isLoading, error } = useSovereign(sovereignId);
  const { data: depositRecord } = useDepositRecord(sovereignId);
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const claimFees = useClaimDepositorFees();
  const finalizeCreatePool = useFinalizeCreatePool();
  const finalizeAddLiquidity = useFinalizeAddLiquidity();
  const emergencyUnlock = useEmergencyUnlock();
  const emergencyWithdraw = useEmergencyWithdraw();
  const emergencyWithdrawCreator = useEmergencyWithdrawCreator();
  const mintGenesisNft = useMintGenesisNft();
  const { data: imageUrl } = useTokenImage(sovereign?.metadataUri);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'claim'>('deposit');

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
          <h2 className="h2 text-white mb-2">Sovereign Not Found</h2>
          <p className="text-[var(--muted)] mb-4">
            Sovereign #{sovereignId} does not exist or could not be loaded.
          </p>
          <Link href="/" className="btn-money">
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

  const handleClaimFees = async () => {
    if (!connected) return;
    try {
      await claimFees.mutateAsync({ sovereignId });
    } catch (err: any) {
      console.error('Claim fees failed:', err);
    }
  };

  const handleMintGenesisNft = async () => {
    if (!connected) return;
    try {
      await mintGenesisNft.mutateAsync({ sovereignId });
    } catch (err: any) {
      console.error('Mint Genesis NFT failed:', err);
    }
  };

  const handleFinalize = async () => {
    if (!connected || !sovereign) return;
    try {
      if (sovereign.status === 'Finalizing') {
        // Step 1: Create pool — ammConfig stored on sovereign at creation
        const ammConfig = sovereign.ammConfig;
        if (!ammConfig || ammConfig === '11111111111111111111111111111111') {
          console.error('Sovereign has no AMM config set');
          return;
        }
        await finalizeCreatePool.mutateAsync({
          sovereignId,
          tokenMint: sovereign.tokenMint,
          ammConfig,
        });
      } else if (sovereign.status === 'PoolCreated') {
        // Step 2: Add liquidity
        await finalizeAddLiquidity.mutateAsync({
          sovereignId,
          tokenMint: sovereign.tokenMint,
          poolState: sovereign.poolState || '',
        });
      }
    } catch (err: any) {
      console.error('Finalize failed:', err);
    }
  };

  const handleEmergencyUnlock = async () => {
    if (!connected) return;
    try {
      await emergencyUnlock.mutateAsync({ sovereignId });
    } catch (err: any) {
      console.error('Emergency unlock failed:', err);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!connected) return;
    try {
      await emergencyWithdraw.mutateAsync({ sovereignId });
    } catch (err: any) {
      console.error('Emergency withdraw failed:', err);
    }
  };

  const handleEmergencyWithdrawCreator = async (burnTokens: boolean) => {
    if (!connected) return;
    try {
      await emergencyWithdrawCreator.mutateAsync({ sovereignId, burnTokens });
    } catch (err: any) {
      console.error('Emergency withdraw creator failed:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link href="/" className="text-[var(--muted)] hover:text-white text-sm mb-4 inline-block">
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
            <h1 className="h1 text-white mb-1">{sovereign.name}</h1>
          <div className="flex items-center gap-3 text-sm">
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
        <StatusBadge status={sovereign.status as any} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card card-clean p-4">
          <div className="text-xs text-[var(--muted)] mb-1">Bond Target</div>
          <div className="text-lg font-bold text-white">{sovereign.bondTargetGor.toLocaleString()} GOR</div>
        </div>
        <div className="card card-clean p-4">
          <div className="text-xs text-[var(--muted)] mb-1">Total Deposited</div>
          <div className="text-lg font-bold text-[var(--money-green)]">{sovereign.totalDepositedGor.toLocaleString()} GOR</div>
        </div>
        <div className="card card-clean p-4">
          <div className="text-xs text-[var(--muted)] mb-1">Depositors</div>
          <div className="text-lg font-bold text-white">{sovereign.depositorCount}</div>
        </div>
        <div className="card card-clean p-4">
          <div className="text-xs text-[var(--muted)] mb-1">
            {isBonding ? 'Time Remaining' : 'Sell Fee'}
          </div>
          <div className="text-lg font-bold text-white">
            {isBonding ? timeRemaining : `${(sovereign.sellFeeBps / 100).toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Progress */}
      {isBonding && (
        <div className="card card-clean p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--muted)]">Bond Progress</span>
            <span className="text-white font-bold">{sovereign.bondingProgress.toFixed(1)}%</span>
          </div>
          <div className="progress-bar money">
            <div
              className="fill"
              style={{ width: `${Math.min(sovereign.bondingProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
            <span>{sovereign.totalDepositedGor.toLocaleString()} GOR</span>
            <span>{sovereign.bondTargetGor.toLocaleString()} GOR</span>
          </div>
        </div>
      )}

      {sovereign.status === 'Recovery' && (
        <div className="card card-clean p-4 mb-6">
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
          <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
            <span>{sovereign.totalRecoveredGor.toLocaleString()} GOR recovered</span>
            <span>{sovereign.recoveryTargetGor.toLocaleString()} GOR target</span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Sovereign Info */}
        <div className="card card-clean p-4">
          <h3 className="h3 text-white mb-3">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Creator</span>
              <a
                href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--money-green)] hover:underline font-mono text-xs"
              >
                {sovereign.creator.slice(0, 4)}...{sovereign.creator.slice(-4)}
                {isCreator && <span className="text-[var(--money-green)] ml-1">(you)</span>}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Token Mint</span>
              <a
                href={`${config.explorerUrl}${config.explorerAddressPath}${sovereign.tokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--money-green)] hover:underline font-mono text-xs"
              >
                {sovereign.tokenMint.slice(0, 4)}...{sovereign.tokenMint.slice(-4)}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Bond Deadline</span>
              <span className="text-white">{format(sovereign.bondDeadline, 'MMM d, yyyy HH:mm')}</span>
            </div>
            {sovereign.finalizedAt && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Finalized</span>
                <span className="text-white">{format(sovereign.finalizedAt, 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Pool & Fee Settings */}
          <h3 className="h3 text-white mt-5 mb-3">Pool &amp; Fee Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pool Swap Fee</span>
              <span className="text-white">{(sovereign.swapFeeBps / 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Token Sell Fee</span>
              <span className="text-white">{(sovereign.sellFeeBps / 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Fee Mode</span>
              <span className="text-white">{sovereign.feeMode}</span>
            </div>
            {sovereign.feeThresholdBps > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Creator Fee Share</span>
                <span className="text-white">{(sovereign.feeThresholdBps / 100).toFixed(1)}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Bond Duration</span>
              <span className="text-white">{Math.round(Number(sovereign.bondDuration) / 86400)} days</span>
            </div>
            {sovereign.creatorEscrowGor > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Creator Buy-in</span>
                <span className="text-white">{sovereign.creatorEscrowGor.toLocaleString()} GOR</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pool Restricted</span>
              <span className="text-white">{sovereign.poolRestricted ? 'Genesis NFT Only' : 'Open'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Fee Control</span>
              <span className={sovereign.feeControlRenounced ? 'text-[var(--slime)]' : 'text-[var(--hazard-yellow)]'}>
                {sovereign.feeControlRenounced ? '🔒 Renounced' : '⚙️ Creator Controlled'}
              </span>
            </div>
            {sovereign.totalFeesCollectedGor > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Total Fees Collected</span>
                <span className="text-[var(--money-green)]">{sovereign.totalFeesCollectedGor.toLocaleString()} GOR</span>
              </div>
            )}
          </div>
        </div>

        {/* Your Position */}
        <div className="card card-clean p-4">
          <h3 className="h3 text-white mb-3">Your Position</h3>
          {!connected ? (
            <p className="text-[var(--muted)] text-sm">Connect wallet to view your position</p>
          ) : !depositRecord ? (
            <p className="text-[var(--muted)] text-sm">No deposit yet</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Deposited</span>
                <span className="text-[var(--money-green)] font-bold">{depositRecord.amountGor.toLocaleString()} GOR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Share</span>
                <span className="text-white">{depositRecord.sharesPercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Fees Claimed</span>
                <span className="text-white">{depositRecord.feesClaimedGor.toLocaleString()} GOR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Genesis NFT</span>
                {depositRecord.nftMinted ? (
                  <span className="text-[var(--money-green)] font-bold">Minted ✓</span>
                ) : (sovereign.status === 'Recovery' || sovereign.status === 'Active') ? (
                  <button
                    onClick={handleMintGenesisNft}
                    disabled={mintGenesisNft.isPending}
                    className="btn-money px-3 py-1 text-xs"
                  >
                    {mintGenesisNft.isPending ? 'Minting...' : 'Mint Now'}
                  </button>
                ) : (
                  <span className="text-[var(--muted)]">Not yet</span>
                )}
              </div>
              {mintGenesisNft.error && (
                <p className="text-red-400 text-xs mt-1">{(mintGenesisNft.error as Error).message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {connected && (
        <div className="card card-clean p-4">
          <div className="flex gap-2 mb-4">
            {isBonding && !bondDeadlinePassed && (
              <>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
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
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      activeTab === 'withdraw'
                        ? 'bg-[var(--money-green)] text-black'
                        : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    Withdraw
                  </button>
                )}
              </>
            )}
            {depositRecord && (sovereign.status === 'Recovery' || sovereign.status === 'Active') && (
              <button
                onClick={() => setActiveTab('claim')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'claim'
                    ? 'bg-[var(--money-green)] text-black'
                    : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-white'
                }`}
              >
                Claim Fees
              </button>
            )}
          </div>

          {/* Deposit Tab */}
          {activeTab === 'deposit' && isBonding && !bondDeadlinePassed && (
            <div>
              <label className="text-sm text-[var(--muted)] block mb-2">Amount (GOR)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded px-3 py-2 text-white"
                  min="0"
                  step="0.1"
                />
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || deposit.isPending}
                  className="btn-money px-6"
                >
                  {deposit.isPending ? 'Depositing...' : 'Deposit'}
                </button>
              </div>
              {deposit.error && (
                <p className="text-red-400 text-sm mt-2">{(deposit.error as Error).message}</p>
              )}
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && isBonding && depositRecord && (
            <div>
              <label className="text-sm text-[var(--muted)] block mb-2">
                Amount (GOR) - Max: {depositRecord.amountGor.toLocaleString()}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded px-3 py-2 text-white"
                  min="0"
                  max={depositRecord.amountGor}
                  step="0.1"
                />
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || withdraw.isPending}
                  className="btn-money px-6"
                >
                  {withdraw.isPending ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
              {withdraw.error && (
                <p className="text-red-400 text-sm mt-2">{(withdraw.error as Error).message}</p>
              )}
            </div>
          )}

          {/* Claim Tab */}
          {activeTab === 'claim' && depositRecord && (
            <div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Claim your share of accumulated trading fees.
              </p>
              <button
                onClick={handleClaimFees}
                disabled={claimFees.isPending}
                className="btn-money px-6"
              >
                {claimFees.isPending ? 'Claiming...' : 'Claim Fees'}
              </button>
              {claimFees.error && (
                <p className="text-red-400 text-sm mt-2">{(claimFees.error as Error).message}</p>
              )}
            </div>
          )}

          {/* Bonding ended message */}
          {isBonding && bondDeadlinePassed && (
            <p className="text-[var(--muted)] text-sm">
              Bonding period has ended. Awaiting finalization or refund.
            </p>
          )}

          {/* Finalize button - shown when sovereign is in Finalizing state */}
          {sovereign.status === 'Finalizing' && (
            <div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Bond target reached! Step 1: Create the SAMM liquidity pool.
              </p>
              <button
                onClick={handleFinalize}
                disabled={finalizeCreatePool.isPending}
                className="btn-money px-6 w-full"
              >
                {finalizeCreatePool.isPending ? 'Creating Pool...' : 'Step 1: Create Pool'}
              </button>
              {finalizeCreatePool.error && (
                <p className="text-red-400 text-sm mt-2">{(finalizeCreatePool.error as Error).message}</p>
              )}
              {finalizeCreatePool.isSuccess && (
                <p className="text-[var(--slime)] text-sm mt-2">
                  Pool created! Refreshing for step 2...
                </p>
              )}
            </div>
          )}

          {/* Add liquidity button - shown when sovereign is in PoolCreated state */}
          {sovereign.status === 'PoolCreated' && (
            <div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Pool created. Step 2: Add initial liquidity and transition to Recovery.
              </p>
              <button
                onClick={handleFinalize}
                disabled={finalizeAddLiquidity.isPending}
                className="btn-money px-6 w-full"
              >
                {finalizeAddLiquidity.isPending ? 'Adding Liquidity...' : 'Step 2: Add Liquidity'}
              </button>
              {finalizeAddLiquidity.error && (
                <p className="text-red-400 text-sm mt-2">{(finalizeAddLiquidity.error as Error).message}</p>
              )}
              {finalizeAddLiquidity.isSuccess && (
                <p className="text-[var(--slime)] text-sm mt-2">
                  Sovereign finalized successfully! Refreshing...
                </p>
              )}
            </div>
          )}

          {/* Emergency Withdraw - shown when sovereign is EmergencyUnlocked */}
          {sovereign.status === 'EmergencyUnlocked' && (
            <div>
              <p className="text-sm text-red-400 mb-3 font-medium">
                ⚠️ This sovereign has been emergency unlocked. All participants can reclaim their funds.
              </p>
              {isCreator ? (
                <div>
                  {sovereign.sovereignType === 'TokenLaunch' ? (
                    <>
                      <p className="text-sm text-[var(--muted)] mb-3">
                        Choose how to handle the token supply:
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEmergencyWithdrawCreator(false)}
                          disabled={emergencyWithdrawCreator.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium flex-1"
                        >
                          {emergencyWithdrawCreator.isPending ? 'Processing...' : '🔄 Recover Tokens'}
                        </button>
                        <button
                          onClick={() => handleEmergencyWithdrawCreator(true)}
                          disabled={emergencyWithdrawCreator.isPending}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium flex-1"
                        >
                          {emergencyWithdrawCreator.isPending ? 'Processing...' : '🔥 Burn Supply'}
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-2">
                        Both options also reclaim your escrow GOR and creation fee.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--muted)] mb-3">
                        Your BYO tokens will be returned to your wallet along with escrow GOR and creation fee.
                      </p>
                      <button
                        onClick={() => handleEmergencyWithdrawCreator(false)}
                        disabled={emergencyWithdrawCreator.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-medium w-full"
                      >
                        {emergencyWithdrawCreator.isPending ? 'Processing...' : '🔄 Recover Tokens, Escrow & Fee'}
                      </button>
                    </>
                  )}
                  {emergencyWithdrawCreator.error && (
                    <p className="text-red-400 text-sm mt-2">{(emergencyWithdrawCreator.error as Error).message}</p>
                  )}
                  {emergencyWithdrawCreator.isSuccess && (
                    <p className="text-[var(--slime)] text-sm mt-2">Creator funds reclaimed successfully!</p>
                  )}
                </div>
              ) : depositRecord ? (
                <div>
                  {(() => {
                    const isPostFinalization = !!sovereign.finalizedAt;
                    const unwindGor = sovereign.unwindSolBalanceGor || 0;
                    const totalDepGor = sovereign.totalDepositedGor || 1;
                    const depositGor = depositRecord.amountGor;
                    const reclaimableGor = isPostFinalization && unwindGor > 0
                      ? (unwindGor * depositGor) / totalDepGor
                      : depositGor;
                    return (
                      <>
                        <p className="text-sm text-[var(--muted)] mb-1">
                          Original deposit: <span className="text-white font-bold">{depositGor.toLocaleString()} GOR</span>
                        </p>
                        {isPostFinalization && (
                          <p className="text-sm text-[var(--muted)] mb-2">
                            Reclaimable (your share): <span className="text-[var(--money-green)] font-bold">
                              {reclaimableGor > 0 ? reclaimableGor.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'} GOR
                            </span>
                            {unwindGor === 0 && (
                              <span className="text-[var(--hazard-yellow)] ml-2 text-xs">
                                (LP not yet removed — awaiting admin action)
                              </span>
                            )}
                          </p>
                        )}
                        <button
                          onClick={handleEmergencyWithdraw}
                          disabled={emergencyWithdraw.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-medium w-full"
                        >
                          {emergencyWithdraw.isPending ? 'Withdrawing...' : 'Reclaim Deposited GOR'}
                        </button>
                      </>
                    );
                  })()}
                  {emergencyWithdraw.error && (
                    <p className="text-red-400 text-sm mt-2">{(emergencyWithdraw.error as Error).message}</p>
                  )}
                  {emergencyWithdraw.isSuccess && (
                    <p className="text-[var(--slime)] text-sm mt-2">Funds reclaimed successfully!</p>
                  )}
                </div>
              ) : (
                <p className="text-[var(--muted)] text-sm">No deposit to reclaim.</p>
              )}
            </div>
          )}

          {/* Retired - sovereign is fully wound down */}
          {sovereign.status === 'Retired' && (
            <div>
              <p className="text-sm text-[var(--muted)]">
                This sovereign has been retired. All funds have been reclaimed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
