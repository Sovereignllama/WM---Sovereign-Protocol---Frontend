'use client';

export default function DocsPage() {
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
            <li><a href="#overview" className="hover:text-[var(--hazard-yellow)]">→ What is Sovereign Protocol?</a></li>
            <li><a href="#how-it-works" className="hover:text-[var(--hazard-yellow)]">→ How It Works</a></li>
            <li><a href="#launch-types" className="hover:text-[var(--hazard-yellow)]">→ Launch Types</a></li>
            <li><a href="#lifecycle" className="hover:text-[var(--hazard-yellow)]">→ The $overeign Lifecycle</a></li>
            <li><a href="#recovery" className="hover:text-[var(--hazard-yellow)]">→ Recovery-First Mechanics</a></li>
            <li><a href="#fees" className="hover:text-[var(--hazard-yellow)]">→ Fees & Revenue</a></li>
            <li><a href="#governance" className="hover:text-[var(--hazard-yellow)]">→ Governance & Unwind</a></li>
            <li><a href="#genesis-nft" className="hover:text-[var(--hazard-yellow)]">→ $overeign NFTs</a></li>
          </ul>
        </div>

        {/* Overview */}
        <section id="overview" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>What is Sovereign Protocol?</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Sovereign Liquidity Protocol is a fair launch platform that lets creators bootstrap liquidity 
              for their tokens through community bonding. The protocol is designed with <strong>investor protection first</strong> — 
              meaning 100% of trading fees go to investors until they recover their entire principal.
            </p>
            <p>
              Unlike traditional launchpads where creators can rug-pull or extract value, Sovereign Protocol 
              ensures that creators have skin in the game and investors are protected through smart contract mechanics.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>How It Works</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>The protocol works in a simple flow:</p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li><strong>Creator launches</strong> — Sets up a $overeign with their token, bond target, and duration</li>
              <li><strong>Investors bond GOR</strong> — Community deposits GOR during the bonding period</li>
              <li><strong>Bond completes</strong> — If target is met, liquidity pool is created automatically</li>
              <li><strong>Recovery phase</strong> — 100% of trading fees flow to investors until they recover their GOR (unlockable via governance)</li>
              <li><strong>Active phase</strong> — After recovery, the LP is locked and trading continues (unlockable only via on-chain low volume mechanic)</li>
            </ol>
          </div>
        </section>

        {/* Launch Types */}
        <section id="launch-types" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Launch Types</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>Token Launch</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>• Create a brand new token</li>
                <li>• Built-in sell fee (0-3%)</li>
                <li>• 100% of supply goes to LP</li>
                <li>• Optional creator buy-in (max 1%)</li>
                <li>• Perfect for new projects</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-2xl mb-2">🔗</div>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>BYO Token</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>• Bring your existing token</li>
                <li>• No sell fee (swap fees only)</li>
                <li>• Minimum 30% of supply required</li>
                <li>• Great for existing projects</li>
                <li>• Bootstrap liquidity fairly</li>
              </ul>
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
                Investors deposit GOR towards the bond target. The creator sets a target (minimum 50 GOR) 
                and a duration (7-30 days). If the target is met, the $overeign proceeds. If not, 
                all depositors get a full refund.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>2. Recovery Phase</h3>
              <p className="text-[var(--muted)]">
                Once bonding completes, a liquidity pool is created and trading begins. Investors receive 
                <strong style={{ color: 'var(--hazard-yellow)' }}> $overeign NFTs</strong> representing their share of the pool. During this phase, 
                <strong style={{ color: 'var(--profit)' }}> 100% of all trading fees go to $overeign NFT holders</strong> until 
                they've recovered their original GOR deposit. The LP is locked and only $overeign NFT holders 
                can earn fees. Liquidity can be unlocked via governance during this phase.
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--slime)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>3. Active Phase</h3>
              <p className="text-[var(--muted)]">
                After investors recover their principal, the $overeign enters the Active phase. 
                The LP is locked, external liquidity providers can join, and 
                trading continues normally. Fees still flow to $overeign NFT holders. Liquidity can only be unlocked through the on-chain low volume mechanic.
              </p>
            </div>
          </div>
        </section>

        {/* Recovery */}
        <section id="recovery" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Recovery-First Mechanics</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              The core innovation of Sovereign Protocol is the <strong>recovery-first</strong> approach:
            </p>
            <div className="card" style={{ background: 'rgba(46, 235, 127, 0.1)', borderColor: 'rgba(46, 235, 127, 0.3)' }}>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>100% of LP fees</strong> go to investors until they recover their GOR</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>Creators get zero LP fees</strong> during recovery — only sell fee revenue (if configured)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>LP is locked</strong> during recovery and stays locked unless volume fails minimum threshold</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>Governance protection</strong> — investors can vote to unwind if needed (creator cannot vote)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Fees & Revenue</h2>
          
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 text-[var(--muted)]">Fee Type</th>
                    <th className="text-left py-3 text-[var(--muted)]">Range</th>
                    <th className="text-left py-3 text-[var(--muted)]">Description</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-light)]">
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Swap Fee</td>
                    <td className="py-3">0.3% - 2%</td>
                    <td className="py-3 text-[var(--muted)]">Trading fee on each swap — 100% goes to investors during recovery</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Sell Fee</td>
                    <td className="py-3">0% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">Token Launch only — tax on sells, goes to creator treasury</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Creation Fee</td>
                    <td className="py-3">0.5%</td>
                    <td className="py-3 text-[var(--muted)]">Of bond target — escrowed, refundable if bonding fails</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">Governance Unwind Fee</td>
                    <td className="py-3">0.05 GOR</td>
                    <td className="py-3 text-[var(--muted)]">Fee to create an unwind proposal during recovery</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold">Unwind Fee</td>
                    <td className="py-3">5%</td>
                    <td className="py-3 text-[var(--muted)]">Taken from GOR returned during governance unwind</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Governance */}
        <section id="governance" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Governance & Unwind</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              During the Recovery phase, investors have governance rights to protect their investment:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Investors can vote</strong> to unwind the $overeign and exit</li>
              <li>• <strong>Creators cannot vote</strong> — only token depositors can participate</li>
              <li>• <strong>67% quorum required</strong> — most investors must participate</li>
              <li>• <strong>51% approval needed</strong> — simple majority to pass</li>
              <li>• <strong>Timelock</strong> — gives time for discussion before execution and for token holders to close their positions</li>
            </ul>
            <div className="card mt-4" style={{ background: 'rgba(242, 183, 5, 0.1)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
              <p className="text-sm">
                <strong>What happens on Unwind?</strong><br/>
                If governance passes an unwind vote, the liquidity pool is closed. 
                Investors can claim their GOR back (minus any shortfall), and the creator can claim the remaining tokens.
              </p>
            </div>
          </div>
        </section>

        {/* Auto-Unwind */}
        <section id="auto-unwind" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Low Volume Protection</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              If a $overeign has very low trading activity for an extended period (90-365 days), 
              the protocol triggers an <strong>activity check</strong>:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• The LP can be unwound if volume remains below threshold</li>
              <li>• This protects investors from being stuck in dead projects</li>
              <li>• Investors get their GOR back, creator gets remaining tokens</li>
            </ul>
          </div>
        </section>

        {/* Genesis NFT */}
        <section id="genesis-nft" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>$overeign NFTs</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              When bonding completes, each investor receives a <strong>$overeign NFT</strong> representing 
              their share of the liquidity position:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Tracks your share</strong> — % of total deposit</li>
              <li>• <strong>Earns fees</strong> — claim your portion of trading fees</li>
              <li>• <strong>Transferable</strong> — sell or transfer your position</li>
              <li>• <strong>Governance rights</strong> — vote on proposals during recovery</li>
            </ul>
            <div className="card mt-4">
              <p className="text-sm text-[var(--muted)]">
                <strong>Note:</strong> Creators do NOT receive $overeign NFTs. They cannot claim LP fees — 
                their only revenue is from sell fees (if configured).
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12">
          <div className="card card-highlight text-center py-8">
            <h2 className="h2 mb-4" style={{ color: 'var(--text-light)' }}>Ready to launch?</h2>
            <p className="text-[var(--muted)] mb-6">
              Create your $overeign and bootstrap liquidity the fair way.
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
