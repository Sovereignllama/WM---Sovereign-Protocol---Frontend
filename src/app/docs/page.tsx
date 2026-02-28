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
    const creationFeeBps = protocolState?.creationFeeBps ?? 100;
    const unwindFeeBps = protocolState?.unwindFeeBps ?? 2000;
    const proposalFeeLamports = protocolState?.governanceUnwindFeeLamports ?? '50000000';
    // Protocol default swap fee (post-recovery), fallback 30 bps (0.30%)
    const defaultSwapBps = protocolState?.defaultSwapFeeBps || 30;
    // Engine pool fee splits (on-chain)
    const creatorShareBps = enginePool?.creatorFeeShareBps ?? 5000;  // 50%
    const binShareBps = enginePool?.binFeeShareBps ?? 3000;          // 30%
    const lpShareBps = 10000 - creatorShareBps;                      // remainder after bin share
    // Effective percentages of total swap fees
    const remainderPct = (10000 - binShareBps) / 100; // e.g. 70%
    const lpEffective = (lpShareBps / 10000) * remainderPct; // e.g. 80% of 70% = 56%
    const creatorEffective = (creatorShareBps / 10000) * remainderPct; // e.g. 20% of 70% = 14%

    const nftMintFeeBps = protocolState?.nftMintFeeBps ?? 500;
    const observationPeriodSecs = Number(protocolState?.observationPeriod ?? 7_776_000);
    const observationDays = Math.round(observationPeriodSecs / 86400);

    return {
      creationFee: (creationFeeBps / 100).toFixed(2),
      activeSwapFee: (defaultSwapBps / 100).toFixed(2),
      lpPortion: lpEffective.toFixed(0),
      creatorPortion: creatorEffective.toFixed(0),
      binPortion: (binShareBps / 100).toFixed(0),
      unwindFee: (unwindFeeBps / 100).toFixed(0),
      proposalFee: (Number(proposalFeeLamports) / LAMPORTS_PER_GOR).toFixed(2),
      nftMintFee: (nftMintFeeBps / 100).toFixed(0),
      observationDays,
    };
  }, [protocolState, enginePool]);
  return (
    <div className="h-full md:overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="h1" style={{ color: '#d4ffe6', textShadow: '0 0 20px rgba(46,235,127,0.6), 0 0 40px rgba(46,235,127,0.3)' }}>Documentation</h1>
            <a href="/docs/zh" className="text-sm text-[var(--muted)] hover:text-[var(--money-green)]">
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
            <li><a href="#overview" className="hover:text-[var(--money-green)]">→ What is $overeign Protocol?</a></li>
            <li><a href="#how-it-works" className="hover:text-[var(--money-green)]">→ How It Works</a></li>
            <li><a href="#slamm" className="hover:text-[var(--money-green)]">→ The SLAMM Engine</a></li>
            <li><a href="#lifecycle" className="hover:text-[var(--money-green)]">→ The $overeign Lifecycle</a></li>
            <li><a href="#fees" className="hover:text-[var(--money-green)]">→ Current Fees & Revenues</a></li>
            <li><a href="#governance" className="hover:text-[var(--money-green)]">→ Governance</a></li>
            <li><a href="#lp-recovery" className="hover:text-[var(--money-green)]">→ LP Recovery</a></li>
            <li><a href="#genesis-nft" className="hover:text-[var(--money-green)]">→ $overeign NFTs</a></li>
          </ul>
        </div>

        {/* Current Protocol Fees (on-chain) */}
        <div className="card mb-8" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
          <h2 className="h3 mb-2" style={{ color: 'var(--money-green)' }}>Current Protocol Fees</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Live from on-chain protocol state</p>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
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
              <div className="text-[10px] text-[var(--muted)] opacity-60">of total swap fees</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--money-green)' }}>
                {protocolLoading ? '...' : `${fees.creatorPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Creator Portion</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">of total swap fees</div>
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
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--text-light)' }}>
                {protocolLoading ? '...' : `${fees.nftMintFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">NFT Mint Fee</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-orange)' }}>
                {protocolLoading ? '...' : `${fees.proposalFee} GOR`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Proposal Fee</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: '#00c8ff' }}>
                {protocolLoading ? '...' : `${fees.observationDays}d`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Observation Period</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <section id="overview" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>What is $overeign Protocol?</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              <strong>$overeign Protocol</strong> is a token launchpad where everyone gets paid.
              Creators launch tokens, investors fund the liquidity, and trading fees flow back
              to the people who made it happen — starting with the investors who took the risk.
            </p>
            <p>
              Here&apos;s the deal: when you fund a token launch, <strong>you get paid back first</strong>.
              100% of all trading fees go to investors until they&apos;ve recovered every coin they put in.
              Only after that does the creator start earning. No rug-pulls, no locked-and-forgotten
              funds — just aligned incentives from day one.
            </p>
            <p>
              Behind the scenes, a purpose-built swap engine called <strong>SLAMM</strong> makes
              this possible. It eliminates the value leak that plagues traditional exchanges
              (called <em>impermanent loss</em>), keeps liquidity permanently locked so creators
              can&apos;t pull the rug, and gives investors a governance vote to recover their capital
              if a project goes quiet. Your trash, your rules.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>How It Works</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>The protocol supports two launch modes:</p>
            <div className="card mb-4" style={{ background: 'rgba(46, 235, 127, 0.05)', borderColor: 'rgba(46, 235, 127, 0.2)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--profit)' }}>Token Launch</h3>
              <p className="text-[var(--muted)]">
                Create a brand-new token with the protocol. Set your token name, symbol, supply, and metadata.
                The protocol mints the token via Token-2022 and manages the full lifecycle.
              </p>
            </div>
            <div className="card mb-4" style={{ background: 'rgba(0, 200, 255, 0.05)', borderColor: 'rgba(0, 200, 255, 0.2)' }}>
              <h3 className="h3 mb-2" style={{ color: '#00c8ff' }}>BYO Token (Bring Your Own)</h3>
              <p className="text-[var(--muted)]">
                Already have a token? Deposit it into a $overeign to bootstrap liquidity.
                The creator deposits a portion of supply into the protocol, and LPs fund the GOR side.
                Works with both SPL Token and Token-2022 mints.
              </p>
            </div>
            <p className="mb-2">Both modes follow the same lifecycle:</p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li><strong>Creator launches</strong> — Create or deposit your token, set your funding goal, and rally Liquidity Providers behind your vision</li>
              <li><strong>LPs deposit GOR</strong> — Liquidity Providers deposit GOR to establish the price floor and earn fees</li>
              <li><strong>Bond completes</strong> — If the target is met, the SLAMM engine creates the liquidity pool automatically</li>
              <li><strong>Recovery phase</strong> — 100% of trading fees flow to Liquidity Providers until they recover their GOR</li>
              <li><strong>Active phase</strong> — Fees split between Liquidity Providers, creators, and traders via bin fees. Passive income for all</li>
            </ol>
          </div>
        </section>

        {/* SLAMM Engine */}
        <section id="slamm" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>The SLAMM Engine</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              SLAMM (<strong>$overeign Liquid Automated Market Maker</strong>) is the swap engine
              that powers every $overeign. It works differently from traditional exchanges:
              <strong> buys and sells are priced separately</strong>, which is how it eliminates
              the hidden cost that drains value from investors on other platforms (known
              as <em>impermanent loss</em>).
            </p>
            <p>
              Your GOR and the token are held in <strong>separate vaults</strong> — they&apos;re never
              mixed together. This means the value of your investment can&apos;t decline just because
              the token price moves. Your GOR stays your GOR.
            </p>
            <p>
              And unlike most exchanges that skim a cut of every trade for themselves,
              <strong> SLAMM takes zero protocol fees</strong>. Every single basis point of trading
              fees goes to the people who built and funded the $overeign — investors, creators, and
              traders. No middleman tax.
            </p>

            <div className="card" style={{ background: 'rgba(46, 235, 127, 0.05)', borderColor: 'rgba(46, 235, 127, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>How Buying Works</h3>
              <p className="text-[var(--muted)] mb-3">
                Buys use standard constant-product pricing (CPAMM: x × y = k) for smooth, continuous
                price discovery. As demand increases, the price rises naturally — just like any exchange.
              </p>
              <p className="text-[var(--muted)]">
                The token supply is divided into <strong>bins</strong> — small groups that let the engine
                track exactly what each wave of buyers paid. As buys fill each bin, the engine records
                the GOR spent, creating a locked purchase rate for that bin.
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--money-green)' }}>How Selling Works</h3>
              <p className="text-[var(--muted)]">
                Sells <strong>do not use the same pricing curve</strong>. Instead, each filled bin pays out
                at its <strong>locked rate</strong> — the weighted-average price that buyers paid into that bin,
                plus any accumulated fee bonuses. This means sellers are paid based on real demand, not an
                arbitrary curve.
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(0, 200, 255, 0.05)', borderColor: 'rgba(0, 200, 255, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: '#00c8ff' }}>Solvency Guarantee</h3>
              <p className="text-[var(--muted)]">
                The engine enforces a hard invariant on every single trade: <strong>GOR reserves can never
                drop below the original bonding amount</strong>. The pool always has enough GOR to back
                every token in circulation. This on-chain check runs automatically — no trust required.
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
                      <td className="py-2 text-[var(--muted)]">Standard curve pricing</td>
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
                      <td className="py-2 text-[var(--profit)]">100% to LPs until recovery, then Creators, LPs & traders — zero protocol skim</td>
                      <td className="py-2 text-[var(--loss)]">Protocol takes a cut, remainder to LPs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Lifecycle */}
        <section id="lifecycle" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>The $overeign Lifecycle</h2>

          <div className="space-y-6">
            <div className="card border-l-4" style={{ borderLeftColor: 'var(--money-green)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>1. Bonding Phase</h3>
              <p className="text-[var(--muted)]">
                The creator sets a GOR bond target (minimum set by protocol governance) and a duration (7 or 14 days).
                Liquidity Providers deposit GOR to fund the liquidity pool. If the target is met, the $overeign
                proceeds to finalization. If not, all depositors get a full refund — no risk.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>2. Recovery Phase</h3>
              <p className="text-[var(--muted)]">
                Once bonding completes, the SLAMM engine creates the liquidity pool and trading begins.
                During recovery, <strong style={{ color: 'var(--profit)' }}>100% of all trading fees
                flow to Liquidity Providers</strong> proportional to their deposit until they&apos;ve recovered their
                original GOR. The creator earns zero fees during this phase.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--slime)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>3. Active Phase</h3>
              <p className="text-[var(--muted)]">
                After Liquidity Providers recover their principal, the $overeign enters the Active phase.
                Trading fees now split between Liquidity Providers, the creator, and traders via bin fee bonuses. The liquidity remains permanently locked —
                passive income for everyone. The creator can also claim their share of accumulated fees.
              </p>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>Current Fees & Revenues</h2>

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
                    <td className="py-3 font-bold">Transfer Fee</td>
                    <td className="py-3">0% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">Token-2022 transfer fee on sells — set by creator at launch. Can be renounced (permanently set to 0%)</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Creation Fee</td>
                    <td className="py-3">{fees.creationFee}% (up to 10%)</td>
                    <td className="py-3 text-[var(--muted)]">Of bond target — minimum 50 GOR goes to protocol treasury immediately; remainder is escrowed and fully refunded if bonding fails</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Governance Unwind Fee</td>
                    <td className="py-3">{fees.proposalFee} GOR</td>
                    <td className="py-3 text-[var(--muted)]">Fee to create an unwind proposal (available during Recovery or Active phase)</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Unwind Fee</td>
                    <td className="py-3">5% - 20%</td>
                    <td className="py-3 text-[var(--muted)]">Taken from GOR returned during governance unwind</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold">NFT Mint Fee</td>
                    <td className="py-3">{fees.nftMintFee}% (max 25%)</td>
                    <td className="py-3 text-[var(--muted)]">Charged from the holder&apos;s wallet when minting a $overeign NFT from a deposit position — paid to the protocol treasury</td>
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
                      <td className="py-2 text-[var(--money-green)]">{fees.creatorPortion}%</td>
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
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>Governance</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              $overeign Protocol gives both creators and Liquidity Providers governance controls
              to manage their $overeign throughout its lifecycle:
            </p>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--money-green)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--money-green)' }}>Creator Controls</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>Adjust transfer fee</strong> &mdash; change the Token-2022 transfer fee on sells (0% - 3%)</li>
                <li>&bull; <strong>Renounce transfer fee</strong> &mdash; permanently set transfer fee to 0% and remove the authority (irreversible)</li>
                <li>&bull; <strong>Set creator fee wallet</strong> &mdash; redirect creator fee earnings to a different wallet</li>
              </ul>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>Liquidity Provider Controls (via Deposit Position)</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>Claim fees</strong> &mdash; claim your proportional share of accumulated trading fees on-chain</li>
                <li>&bull; <strong>Vote on proposals</strong> &mdash; each deposit position carries voting weight proportional to your GOR contribution</li>
                <li>&bull; <strong>Propose unwind</strong> &mdash; any Liquidity Provider with an active deposit position can propose an unwind vote</li>
                <li>&bull; <strong>Mint $overeign NFT</strong> &mdash; convert part or all of your deposit into a tradeable NFT on the LP Marketplace</li>
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
                <strong>Voting rules:</strong> Only Liquidity Providers with an active deposit position can vote &mdash; creators cannot participate.
                67% quorum required with 51% approval to pass. If the vote passes, an observation period begins
                (default 90 days) during which trading continues. If fee growth stays below the threshold during
                observation, the unwind can be executed.
              </p>
            </div>
          </div>
        </section>

        {/* LP Recovery */}
        <section id="lp-recovery" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>LP Recovery</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Permanently locked liquidity protects token holders from rug-pulls, but Liquidity Providers
              need an exit path if a project fails to gain traction. The protocol provides a structured
              governance process to recover capital from underperforming $overeigns.
            </p>

            <div className="space-y-3">
              <div className="card border-l-4" style={{ borderLeftColor: 'var(--money-green)' }}>
                <h3 className="h3 mb-1" style={{ color: 'var(--text-light)' }}>1. Propose Unwind</h3>
                <p className="text-[var(--muted)] text-sm">
                  Any Liquidity Provider with an active deposit position can submit an unwind proposal
                  by paying a {fees.proposalFee} GOR proposal fee. This signals intent to recover capital
                  and opens the process for community deliberation.
                </p>
              </div>

              <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
                <h3 className="h3 mb-1" style={{ color: 'var(--text-light)' }}>2. Discussion Period (3 days)</h3>
                <p className="text-[var(--muted)] text-sm">
                  A grace period gives the creator time to address concerns, engage with the community,
                  or take action before voting begins. No votes can be cast during this window.
                </p>
              </div>

              <div className="card border-l-4" style={{ borderLeftColor: '#00c8ff' }}>
                <h3 className="h3 mb-1" style={{ color: 'var(--text-light)' }}>3. Voting Period (7 days)</h3>
                <p className="text-[var(--muted)] text-sm">
                  Liquidity Providers vote for or against the unwind, weighted by their deposit position.
                  Creators cannot vote. Requires 67% quorum and 51% approval to pass.
                </p>
              </div>

              <div className="card border-l-4" style={{ borderLeftColor: 'var(--hazard-orange)' }}>
                <h3 className="h3 mb-1" style={{ color: 'var(--text-light)' }}>4. Observation Period (90 days)</h3>
                <p className="text-[var(--muted)] text-sm">
                  If the vote passes, the protocol snapshots engine fee counters and begins a 90-day observation
                  window. Trading continues normally. If fee growth remains below the minimum threshold during
                  this period, the unwind remains valid.
                </p>
              </div>

              <div className="card border-l-4" style={{ borderLeftColor: 'var(--loss)' }}>
                <h3 className="h3 mb-1" style={{ color: 'var(--text-light)' }}>5. Execute &amp; Claim</h3>
                <p className="text-[var(--muted)] text-sm">
                  Once the observation period elapses, the SLAMM pool is drained and GOR is returned to the
                  protocol vault. Each Liquidity Provider can then claim their proportional share of GOR,
                  minus the unwind fee ({fees.unwindFee}%).
                </p>
              </div>
            </div>

            <div className="card mt-2" style={{ background: 'rgba(46, 235, 127, 0.05)', borderColor: 'rgba(46, 235, 127, 0.2)' }}>
              <p className="text-sm text-[var(--muted)]">
                This process ensures Liquidity Providers are never permanently stuck in dead projects
                while giving active projects the stability of permanently locked liquidity. The multi-step
                process with discussion, voting, and observation prevents abuse and gives creators every
                opportunity to demonstrate value.
              </p>
            </div>
          </div>
        </section>

        {/* Sovereign NFTs */}
        <section id="genesis-nft" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--money-green)' }}>$overeign NFTs</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Liquidity Providers can mint <strong>$overeign NFTs</strong> from their deposit position at any time
              after bonding completes. NFTs represent a transferable share of the underlying liquidity and can be
              traded on the <strong>LP Marketplace</strong>.
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Mint on demand</strong> — convert part or all of your deposit into an NFT (a {fees.nftMintFee}% mint fee applies)</li>
              <li>• <strong>Trade on the LP Marketplace</strong> — list, buy, and sell $overeign NFTs peer-to-peer</li>
              <li>• <strong>Burn to restore position</strong> — burn your NFT back into your deposit record to reclaim governance weight and fee-earning rights</li>
              <li>• <strong>Represents real liquidity</strong> — each NFT is backed by GOR locked in the protocol</li>
            </ul>
            <div className="card mt-4">
              <p className="text-sm text-[var(--muted)]">
                <strong>Important:</strong> Governance rights (voting, proposing unwinding) remain with the deposit position, not the NFT.
                To participate in governance after minting, burn the NFT back into your deposit record to restore your voting weight.
                Creators do NOT receive $overeign NFTs — only Liquidity Providers who deposited GOR.
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
