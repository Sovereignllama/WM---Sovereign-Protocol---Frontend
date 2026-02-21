'use client';

import { useProtocolState, useSovereigns } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { LAMPORTS_PER_GOR } from '@/lib/config';
import { useReadOnlyProgram } from '@/hooks/useProgram';
import { fetchEnginePool } from '@/lib/program/client';

export default function DocsPage() {
  const program = useReadOnlyProgram();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const { data: sovereignsData } = useSovereigns();

  // Find first active/recovery sovereign for engine pool read
  const activeSovereign = useMemo(
    () => sovereignsData?.find((s: any) => s.status === 'Active' || s.status === 'Recovery'),
    [sovereignsData],
  );

  // Fetch engine pool on-chain to read LP/Creator/Bin fee splits
  const { data: enginePool } = useQuery({
    queryKey: ['docsEnginePool', activeSovereign?.sovereignId],
    queryFn: () => fetchEnginePool(program!, BigInt(activeSovereign!.sovereignId)),
    enabled: !!program && !!activeSovereign,
    staleTime: 60_000,
  });

  // Derive all fee values from on-chain state
  const fees = useMemo(() => {
    const creationFeeBps = protocolState?.creationFeeBps ?? 50;
    const unwindFeeBps = protocolState?.unwindFeeBps ?? 2000;
    const proposalFeeLamports = protocolState?.governanceUnwindFeeLamports ?? '50000000';
    // Protocol default swap fee (post-recovery), fallback 30 bps (0.30%)
    const defaultSwapBps = protocolState?.defaultSwapFeeBps || 30;
    // Engine pool fee splits (on-chain)
    const creatorShareBps = enginePool?.creatorFeeShareBps ?? 2000;  // 20%
    const binShareBps = enginePool?.binFeeShareBps ?? 3000;          // 30%
    const lpShareBps = 10000 - creatorShareBps;                      // remainder

    return {
      creationFee: (creationFeeBps / 100).toFixed(2),
      activeSwapFee: (defaultSwapBps / 100).toFixed(2),
      lpPortion: (lpShareBps / 100).toFixed(0),
      creatorPortion: (creatorShareBps / 100).toFixed(0),
      binPortion: (binShareBps / 100).toFixed(0),
      unwindFee: (unwindFeeBps / 100).toFixed(0),
      proposalFee: (Number(proposalFeeLamports) / LAMPORTS_PER_GOR).toFixed(2),
    };
  }, [protocolState, enginePool]);
  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="h1" style={{ color: 'var(--text-light)' }}>Documentation</h1>
            <a href="/docs/zh" className="text-sm text-[var(--muted)] hover:text-[var(--hazard-yellow)]">
              中文 →
            </a>
          </div>
          <p className="text-[var(--muted)]">
            Everything you need to know about the Sovereign Liquidity Protocol.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="card mb-8">
          <h2 className="h3 mb-4" style={{ color: 'var(--text-light)' }}>Contents</h2>
          <ul className="space-y-2 text-[var(--muted)]">
            <li><a href="#overview" className="hover:text-[var(--hazard-yellow)]">→ What is $overeign Protocol?</a></li>
            <li><a href="#how-it-works" className="hover:text-[var(--hazard-yellow)]">→ How It Works</a></li>
            <li><a href="#slamm" className="hover:text-[var(--hazard-yellow)]">→ The SLAMM Engine</a></li>
            <li><a href="#lifecycle" className="hover:text-[var(--hazard-yellow)]">→ The $overeign Lifecycle</a></li>
            <li><a href="#fees" className="hover:text-[var(--hazard-yellow)]">→ Current Fees & Revenues</a></li>
            <li><a href="#governance" className="hover:text-[var(--hazard-yellow)]">→ Governance</a></li>
            <li><a href="#dead-pool" className="hover:text-[var(--hazard-yellow)]">→ Failed Project Protection</a></li>
            <li><a href="#genesis-nft" className="hover:text-[var(--hazard-yellow)]">→ $overeign NFTs</a></li>
          </ul>
        </div>

        {/* Current Protocol Fees (on-chain) */}
        <div className="card mb-8" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
          <h2 className="h3 mb-2" style={{ color: 'var(--hazard-yellow)' }}>Current Protocol Fees</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Live from on-chain protocol state</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--text-light)' }}>
                {protocolLoading ? '...' : `${fees.creationFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Creation Fee</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-orange)' }}>
                {protocolLoading ? '...' : `${fees.activeSwapFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Active Swap Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--profit)' }}>
                {protocolLoading ? '...' : `${fees.lpPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">LP Portion</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">of fees after bin share</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-yellow)' }}>
                {protocolLoading ? '...' : `${fees.creatorPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Creator Portion</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">of fees after bin share</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: '#00c8ff' }}>
                {protocolLoading ? '...' : `${fees.binPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Bin Portion (of swap fees)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--loss)' }}>
                {protocolLoading ? '...' : `${fees.unwindFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Unwind Fee</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <section id="overview" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>What is $overeign Protocol?</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Unlike traditional launchpads where creators and traders can rug-pull or extract value
              from Liquidity Providers, <strong>$overeign Protocol</strong> is a token launchpad that
              incentivizes creators to create and Liquidity Providers to provide liquidity.
            </p>
            <p>
              It uses a novel swap engine called <strong>SLAMM</strong> ($overeign Liquid Automated
              Market Maker) that <strong>eliminates impermanent loss</strong> for Liquidity Providers.
              100% of trading fees flow to LPs until they recover their entire principal — only then
              do creators begin earning their share.
            </p>
            <p>
              SLAMM creates peace of mind for both sides: <strong>creators</strong> benefit from
              locked liquidity that can only be pulled in the event their project fails, while <strong>Liquidity Providers</strong> are
              protected by a novel <strong>Dead Pool</strong> mechanism — if the pool fails to meet a minimum volume threshold
              over a period of time, LPs can trigger a governance vote to unlock the pool
              and recover their capital.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>How It Works</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>The protocol works in three phases:</p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li><strong>Creator launches</strong> — Create your token, set your funding goal, and rally Liquidity Providers behind your vision</li>
              <li><strong>LPs deposit GOR</strong> — Liquidity Providers deposit GOR to establish the price floor and earn fees</li>
              <li><strong>Bond completes</strong> — If the target is met, the SLAMM engine creates the liquidity pool automatically</li>
              <li><strong>Recovery phase</strong> — 100% of trading fees flow to Liquidity Providers until they recover their GOR</li>
              <li><strong>Active phase</strong> — Fees split between Liquidity Providers, creators, and traders via bin fees. Passive income for all</li>
            </ol>
          </div>
        </section>

        {/* SLAMM Engine */}
        <section id="slamm" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>The SLAMM Engine</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              SLAMM (<strong>$overeign Liquid Automated Market Maker</strong>) is a novel swap engine
              purpose-built for the $overeign Protocol. It uses <strong>asymmetric pricing</strong> — buys and sells
              are priced differently by design, eliminating impermanent loss for Liquidity Providers.
            </p>
            <p>
              Tokens and GOR are held in <strong>separate vaults</strong> — unlike traditional AMMs that pool
              both assets together, SLAMM keeps them isolated. This separation is what makes impermanent
              loss impossible: LP deposits are denominated purely in GOR and never rebalanced against the
              token side, so the value of an LP&apos;s position can never decline due to price movement.
            </p>

            <div className="card" style={{ background: 'rgba(46, 235, 127, 0.05)', borderColor: 'rgba(46, 235, 127, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>How Buying Works (CPAMM)</h3>
              <p className="text-[var(--muted)] mb-3">
                Buys use standard <strong>constant-product pricing</strong> (x × y = k) for smooth, continuous
                price discovery. As demand increases, the price rises naturally — just like any AMM.
              </p>
              <p className="text-[var(--muted)]">
                The token supply is divided into <strong>bins</strong>. As buys fill each bin, the engine records
                exactly how much GOR was paid — creating a locked purchase rate for that bin.
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--hazard-yellow)' }}>How Selling Works (Locked-Rate)</h3>
              <p className="text-[var(--muted)] mb-3">
                Sells <strong>do not use CPAMM</strong>. Instead, each filled bin pays out at its <strong>locked rate</strong> —
                the exact weighted-average price that buyers paid into that bin, plus accumulated fee bonuses.
              </p>
              <p className="text-[var(--muted)]">
                This means sellers always receive at least the average entry price for each bin.
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(0, 200, 255, 0.05)', borderColor: 'rgba(0, 200, 255, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: '#00c8ff' }}>Solvency Guarantee</h3>
              <p className="text-[var(--muted)]">
                Although not required by design,
                the engine enforces a hard invariant: <strong>GOR reserves can never drop below the original bonding amount</strong>.
                The pool always has enough GOR to back every token in circulation. This on-chain check is verified
                on every single trade as an additional layer of safety.
              </p>
            </div>

            <div className="card">
              <h3 className="h3 mb-3" style={{ color: 'var(--text-light)' }}>SLAMM vs Traditional AMMs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 text-[var(--muted)]">Feature</th>
                      <th className="text-left py-2 text-[var(--muted)]">SLAMM</th>
                      <th className="text-left py-2 text-[var(--muted)]">Traditional AMM</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text-light)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">Buy pricing</td>
                      <td className="py-2 text-[var(--profit)]">CPAMM (smooth)</td>
                      <td className="py-2 text-[var(--muted)]">CPAMM / CLMM</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">Sell pricing</td>
                      <td className="py-2 text-[var(--profit)]">Locked-rate (historical avg)</td>
                      <td className="py-2 text-[var(--muted)]">Same curve as buy</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">Impermanent loss (LPs)</td>
                      <td className="py-2 text-[var(--profit)]">Eliminated</td>
                      <td className="py-2 text-[var(--loss)]">Always present</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">LP withdrawal</td>
                      <td className="py-2 text-[var(--profit)]">Permanently locked while active</td>
                      <td className="py-2 text-[var(--loss)]">Withdrawable (rug risk)</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">Solvency floor</td>
                      <td className="py-2 text-[var(--profit)]">Enforced on-chain</td>
                      <td className="py-2 text-[var(--loss)]">None</td>
                    </tr>
                    <tr>
                      <td className="py-2">Fee beneficiary</td>
                      <td className="py-2 text-[var(--profit)]">100% to LPs until recovery, then Creators, LPs & traders</td>
                      <td className="py-2 text-[var(--muted)]">LP providers from day 1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Lifecycle */}
        <section id="lifecycle" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>The $overeign Lifecycle</h2>

          <div className="space-y-6">
            <div className="card border-l-4" style={{ borderLeftColor: 'var(--hazard-yellow)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>1. Bonding Phase</h3>
              <p className="text-[var(--muted)]">
                The creator sets a GOR bond target (minimum 250,000 GOR) and a duration (7-30 days).
                Liquidity Providers deposit GOR to fund the liquidity pool. If the target is met, the $overeign
                proceeds to finalization. If not, all depositors get a full refund — no risk.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>2. Recovery Phase</h3>
              <p className="text-[var(--muted)]">
                Once bonding completes, the SLAMM engine creates the liquidity pool and trading begins.
                Liquidity Providers receive <strong style={{ color: 'var(--hazard-yellow)' }}>$overeign NFTs</strong> representing
                their share. During recovery, <strong style={{ color: 'var(--profit)' }}>100% of all trading fees
                flow to $overeign NFT holders</strong> until they've recovered their original GOR deposit.
                The creator earns zero fees during this phase.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--slime)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>3. Active Phase</h3>
              <p className="text-[var(--muted)]">
                After Liquidity Providers recover their principal, the $overeign enters the Active phase.
                Trading fees now split between Liquidity Providers and the creator. The LP remains permanently locked —
                passive income for everyone. The creator can also claim their share of accumulated fees.
              </p>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Current Fees & Revenues</h2>

          <div className="space-y-4">
            <p className="text-[var(--text-light)]">
              The SLAMM engine has a multi-layered fee system designed to align incentives:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 text-[var(--muted)]">Fee Type</th>
                    <th className="text-left py-3 text-[var(--muted)]">Rate</th>
                    <th className="text-left py-3 text-[var(--muted)]">Description</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-light)]">
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Swap Fee (Recovery)</td>
                    <td className="py-3">1% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">Creator-chosen rate during Recovery — 100% to Liquidity Providers to accelerate principal recovery</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Swap Fee (Active)</td>
                    <td className="py-3">{fees.activeSwapFee}%</td>
                    <td className="py-3 text-[var(--muted)]">Protocol default rate after recovery completes — split between Liquidity Providers, creator, and bin traders</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Sell Fee</td>
                    <td className="py-3">0% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">Token transfer fee on sells — set by creator at launch. Adjustable by governance</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Creation Fee</td>
                    <td className="py-3">0% - 5%</td>
                    <td className="py-3 text-[var(--muted)]">Of bond target (minimum 50 GOR) — escrowed, refundable if bonding fails</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Governance Unwind Fee</td>
                    <td className="py-3">0.05 GOR</td>
                    <td className="py-3 text-[var(--muted)]">Fee to create an unwind proposal during recovery</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold">Unwind Fee</td>
                    <td className="py-3">5% - 20%</td>
                    <td className="py-3 text-[var(--muted)]">Taken from GOR returned during governance unwind</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card mt-4">
              <h3 className="h3 mb-3" style={{ color: 'var(--text-light)' }}>Fee Distribution by Phase</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 text-[var(--muted)]">Phase</th>
                      <th className="text-left py-2 text-[var(--muted)]">Liquidity Providers</th>
                      <th className="text-left py-2 text-[var(--muted)]">Creator</th>
                      <th className="text-left py-2 text-[var(--muted)]">Traders (Bin Fees)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text-light)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2 font-bold">Recovery</td>
                      <td className="py-2 text-[var(--profit)]">100%</td>
                      <td className="py-2 text-[var(--loss)]">0%</td>
                      <td className="py-2 text-[var(--loss)]">0%</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold">Active</td>
                      <td className="py-2 text-[var(--profit)]">{fees.lpPortion}%</td>
                      <td className="py-2 text-[var(--hazard-yellow)]">{fees.creatorPortion}%</td>
                      <td className="py-2 text-[var(--profit)]">{fees.binPortion}% of swap fees</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[var(--muted)] mt-3">
                LP fees are distributed proportionally based on each Liquidity Provider&apos;s deposit share via on-chain per-share accounting.
                Traders who bought into bins earn accumulated bin fee bonuses when they sell (default {fees.binPortion}% of swap fees, max 50%).
              </p>
            </div>
          </div>
        </section>

        {/* Governance */}
        <section id="governance" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Governance</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              $overeign Protocol gives both creators and Liquidity Providers governance controls
              to manage their $overeign throughout its lifecycle:
            </p>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--hazard-yellow)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--hazard-yellow)' }}>Creator Controls</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>Adjust sell fee</strong> &mdash; change the token transfer fee on sells (0% - 3%)</li>
                <li>&bull; <strong>Adjust fee threshold</strong> &mdash; lower the creator fee threshold (can only decrease, never increase)</li>
                <li>&bull; <strong>Renounce sell fee</strong> &mdash; permanently set sell fee to 0% and remove the authority (irreversible)</li>
                <li>&bull; <strong>Renounce fee threshold</strong> &mdash; permanently set to 0, giving up all threshold control (irreversible)</li>
                <li>&bull; <strong>Set creator fee wallet</strong> &mdash; redirect creator fee earnings to a different wallet</li>
              </ul>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>Liquidity Provider Controls (via $overeign NFT)</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>Claim fees</strong> &mdash; claim your proportional share of accumulated trading fees on-chain</li>
                <li>&bull; <strong>Vote on proposals</strong> &mdash; each $overeign NFT carries one vote, weighted by deposit amount</li>
                <li>&bull; <strong>Propose unwind</strong> &mdash; any NFT holder can propose an unwind vote for their $overeign</li>
                <li>&bull; <strong>Transfer position</strong> &mdash; sell or transfer your $overeign NFT (governance rights transfer with it)</li>
              </ul>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: '#00c8ff' }}>
              <h3 className="h3 mb-3" style={{ color: '#00c8ff' }}>Protocol-Level Governance</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>Set default swap fee</strong> &mdash; protocol authority sets the post-recovery swap rate (currently {fees.activeSwapFee}%)</li>
                <li>&bull; <strong>Adjust bin fee share</strong> &mdash; change the portion of fees allocated to bin bonuses (up to 50%)</li>
                <li>&bull; <strong>Adjust creator fee share</strong> &mdash; change the creator&apos;s share of post-recovery fees</li>
                <li>&bull; <strong>Emergency pause</strong> &mdash; pause the protocol in case of critical issues</li>
              </ul>
            </div>

            <div className="card mt-4" style={{ background: 'rgba(242, 183, 5, 0.1)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
              <p className="text-sm">
                <strong>Voting rules:</strong> Only $overeign NFT holders can vote &mdash; creators cannot participate.
                67% quorum required with 51% approval to pass. A timelock period gives token holders time to
                close positions before execution.
              </p>
            </div>
          </div>
        </section>

        {/* Auto-Unwind */}
        <section id="dead-pool" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Failed Project Protection</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              While permanently locked liquidity gives creators peace of mind, Liquidity Providers
              need an exit path if a project fails to gain traction. $overeign Protocol solves this
              with a novel <strong>Dead Pool</strong> mechanism:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• Each pool has a <strong>minimum volume threshold</strong> measured over a period (90-365 days)</li>
              <li>• If trading activity falls below this threshold, the pool becomes <strong>eligible for governance unwind</strong></li>
              <li>• Liquidity Providers can then vote to unlock the pool and recover their capital</li>
              <li>• Creators cannot vote — only LPs who deposited GOR participate in the governance process</li>
              <li>• This ensures LPs are never permanently stuck in dead projects while still giving active projects the stability of locked liquidity</li>
            </ul>
          </div>
        </section>

        {/* Genesis NFT */}
        <section id="genesis-nft" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>$overeign NFTs</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              When bonding completes, each Liquidity Provider receives a <strong>$overeign NFT</strong> representing
              their share of the liquidity position:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Tracks your share</strong> — proportional to your GOR deposit</li>
              <li>• <strong>Earns fees</strong> — claim your portion of trading fees on-chain</li>
              <li>• <strong>Transferable</strong> — sell or transfer your position</li>
              <li>• <strong>Governance rights</strong> — vote on unwind proposals during recovery</li>
            </ul>
            <div className="card mt-4">
              <p className="text-sm text-[var(--muted)]">
                <strong>Note:</strong> Creators do NOT receive $overeign NFTs. During recovery, their fee share
                is locked. After recovery, creators can claim their accumulated share.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12">
          <div className="card card-highlight text-center py-8">
            <h2 className="h2 mb-4" style={{ color: 'var(--text-light)' }}>Ready to launch?</h2>
            <p className="text-[var(--muted)] mb-6">
              Vibe the Dream. Liquidify the Token. Become $overeign.
            </p>
            <a href="/mint" className="btn btn-primary btn-lg inline-block">
              Launch Your $overeign
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
