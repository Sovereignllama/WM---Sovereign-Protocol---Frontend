'use client';

import { useProtocolState, useSovereigns } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { LAMPORTS_PER_GOR } from '@/lib/config';
import { useReadOnlyProgram } from '@/hooks/useProgram';
import { fetchEnginePool } from '@/lib/program/client';

export default function DocsPageZh() {
  const program = useReadOnlyProgram();
  const { data: protocolState, isLoading: protocolLoading } = useProtocolState();
  const { data: sovereignsData } = useSovereigns();

  const activeSovereign = useMemo(
    () => sovereignsData?.find((s: any) => s.status === 'Active' || s.status === 'Recovery'),
    [sovereignsData],
  );

  const { data: enginePool } = useQuery({
    queryKey: ['docsEnginePoolZh', activeSovereign?.sovereignId],
    queryFn: () => fetchEnginePool(program!, BigInt(activeSovereign!.sovereignId)),
    enabled: !!program && !!activeSovereign,
    staleTime: 60_000,
  });

  const fees = useMemo(() => {
    const creationFeeBps = protocolState?.creationFeeBps ?? 50;
    const unwindFeeBps = protocolState?.unwindFeeBps ?? 2000;
    const proposalFeeLamports = protocolState?.governanceUnwindFeeLamports ?? '50000000';
    const defaultSwapBps = protocolState?.defaultSwapFeeBps || 30;
    const creatorShareBps = enginePool?.creatorFeeShareBps ?? 2000;
    const binShareBps = enginePool?.binFeeShareBps ?? 3000;
    const lpShareBps = 10000 - creatorShareBps;

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
            <h1 className="h1" style={{ color: 'var(--text-light)' }}>文档</h1>
            <a href="/docs" className="text-sm text-[var(--muted)] hover:text-[var(--hazard-yellow)]">
              English →
            </a>
          </div>
          <p className="text-[var(--muted)]">
            关于 Sovereign 流动性协议的所有信息。
          </p>
        </div>

        {/* Table of Contents */}
        <div className="card mb-8">
          <h2 className="h3 mb-4" style={{ color: 'var(--text-light)' }}>目录</h2>
          <ul className="space-y-2 text-[var(--muted)]">
            <li><a href="#overview" className="hover:text-[var(--hazard-yellow)]">→ 什么是 Sovereign 协议？</a></li>
            <li><a href="#how-it-works" className="hover:text-[var(--hazard-yellow)]">→ 运作原理</a></li>
            <li><a href="#launch-types" className="hover:text-[var(--hazard-yellow)]">→ 发射类型</a></li>
            <li><a href="#lifecycle" className="hover:text-[var(--hazard-yellow)]">→ $overeign 生命周期</a></li>
            <li><a href="#recovery" className="hover:text-[var(--hazard-yellow)]">→ 回本优先机制</a></li>
            <li><a href="#fees" className="hover:text-[var(--hazard-yellow)]">→ 费用与收益</a></li>
            <li><a href="#governance" className="hover:text-[var(--hazard-yellow)]">→ 治理与解锁</a></li>
            <li><a href="#genesis-nft" className="hover:text-[var(--hazard-yellow)]">→ 创世 NFT</a></li>
          </ul>
        </div>

        {/* Current Protocol Fees (on-chain) */}
        <div className="card mb-8" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
          <h2 className="h3 mb-2" style={{ color: 'var(--hazard-yellow)' }}>当前协议费用</h2>
          <p className="text-xs text-[var(--muted)] mb-4">实时链上协议状态</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--text-light)' }}>
                {protocolLoading ? '...' : `${fees.creationFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">创建费</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-orange)' }}>
                {protocolLoading ? '...' : `${fees.activeSwapFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">活跃交换费率</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--profit)' }}>
                {protocolLoading ? '...' : `${fees.lpPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">LP 份额</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">扣除 Bin 份额后</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-yellow)' }}>
                {protocolLoading ? '...' : `${fees.creatorPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">创作者份额</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">扣除 Bin 份额后</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: '#00c8ff' }}>
                {protocolLoading ? '...' : `${fees.binPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Bin 份额（交换费）</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--loss)' }}>
                {protocolLoading ? '...' : `${fees.unwindFee}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">解锁费</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <section id="overview" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>什么是 Sovereign 协议？</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Sovereign 流动性协议是一个公平发射平台，让创作者通过社区债券来为其代币引导流动性。
              该协议以<strong>投资者保护为先</strong>——这意味着在投资者收回全部本金之前，100% 的交易费用都归投资者所有。
            </p>
            <p>
              与传统发射平台不同——创作者可能跑路或提取价值——Sovereign 协议确保创作者有切身利益，
              投资者通过智能合约机制得到保护。
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>运作原理</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>协议的运作流程很简单：</p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li><strong>创作者发射</strong> — 设置代币、债券目标和持续时间来创建 $overeign</li>
              <li><strong>投资者债券 GOR</strong> — 社区在债券期间存入 GOR</li>
              <li><strong>债券完成</strong> — 如果达到目标，流动性池自动创建</li>
              <li><strong>回本阶段</strong> — 100% 的交易费用流向投资者直到他们收回 GOR（可通过治理解锁）</li>
              <li><strong>活跃阶段</strong> — 回本后，LP 被锁定，交易继续（仅可通过链上低交易量机制解锁）</li>
            </ol>
          </div>
        </section>

        {/* Launch Types */}
        <section id="launch-types" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>发射类型</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>代币发射</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>• 创建全新代币</li>
                <li>• 内置卖出费用（0-3%）</li>
                <li>• 100% 供应量进入 LP</li>
                <li>• 可选创作者买入（最高 1%）</li>
                <li>• 适合新项目</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-2xl mb-2">🔗</div>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>自带代币</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>• 带上您现有的代币</li>
                <li>• 无卖出费用（仅交换费用）</li>
                <li>• 需要最少 30% 的供应量</li>
                <li>• 适合现有项目</li>
                <li>• 公平引导流动性</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Lifecycle */}
        <section id="lifecycle" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>$overeign 生命周期</h2>
          
          <div className="space-y-6">
            <div className="card border-l-4" style={{ borderLeftColor: 'var(--hazard-yellow)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>1. 债券阶段</h3>
              <p className="text-[var(--muted)]">
                投资者向债券目标存入 GOR。创作者设定目标（最低 50 GOR）和持续时间（7-30 天）。
                如果达到目标，$overeign 继续进行。如果没有，所有存款人获得全额退款。
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>2. 回本阶段</h3>
              <p className="text-[var(--muted)]">
                债券完成后，流动性池被创建，交易开始。投资者获得
                <strong style={{ color: 'var(--hazard-yellow)' }}> 创世 NFT </strong>代表他们在池中的份额。在此阶段，
                <strong style={{ color: 'var(--profit)' }}> 100% 的交易费用归创世 NFT 持有者</strong>，
                直到他们收回原始 GOR 存款。LP 被锁定，只有创世 NFT 持有者可以赚取费用。
                在此阶段可通过治理解锁流动性。
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--slime)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>3. 活跃阶段</h3>
              <p className="text-[var(--muted)]">
                投资者收回本金后，$overeign 进入活跃阶段。LP 被锁定，外部流动性提供者可以加入，
                交易正常继续。费用仍流向创世 NFT 持有者。流动性只能通过链上低交易量机制解锁。
              </p>
            </div>
          </div>
        </section>

        {/* Recovery */}
        <section id="recovery" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>回本优先机制</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              Sovereign 协议的核心创新是<strong>回本优先</strong>方法：
            </p>
            <div className="card" style={{ background: 'rgba(46, 235, 127, 0.1)', borderColor: 'rgba(46, 235, 127, 0.3)' }}>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>100% LP 费用</strong>归投资者直到他们收回 GOR</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>创作者在回本期间获得零 LP 费用</strong>——只有卖出费用收入（如果配置了的话）</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>LP 在回本期间被锁定</strong>，除非交易量低于最低阈值否则保持锁定</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--profit)]">✓</span>
                  <span><strong>治理保护</strong>——投资者可以投票解锁（创作者不能投票）</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>费用与收益</h2>
          
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 text-[var(--muted)]">费用类型</th>
                    <th className="text-left py-3 text-[var(--muted)]">范围</th>
                    <th className="text-left py-3 text-[var(--muted)]">描述</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-light)]">
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">交换费（回本期）</td>
                    <td className="py-3">1% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">创作者设定的回本期费率——100% 归投资者以加速回本</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">交换费（活跃期）</td>
                    <td className="py-3">{fees.activeSwapFee}%</td>
                    <td className="py-3 text-[var(--muted)]">回本完成后的协议默认费率——在 LP、创作者和 Bin 交易者之间分配</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">卖出费</td>
                    <td className="py-3">0% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">仅限代币发射——卖出税，归创作者金库</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">创建费</td>
                    <td className="py-3">{fees.creationFee}%</td>
                    <td className="py-3 text-[var(--muted)]">债券目标的百分比——托管，债券失败可退还</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">治理解锁费</td>
                    <td className="py-3">{fees.proposalFee} GOR</td>
                    <td className="py-3 text-[var(--muted)]">在回本期间创建解锁提案的费用</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold">解锁费</td>
                    <td className="py-3">{fees.unwindFee}%</td>
                    <td className="py-3 text-[var(--muted)]">从治理解锁返还的 GOR 中扣除</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card mt-4">
              <h3 className="h3 mb-3" style={{ color: 'var(--text-light)' }}>各阶段费用分配</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 text-[var(--muted)]">阶段</th>
                      <th className="text-left py-2 text-[var(--muted)]">流动性提供者</th>
                      <th className="text-left py-2 text-[var(--muted)]">创作者</th>
                      <th className="text-left py-2 text-[var(--muted)]">交易者（Bin 奖励）</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text-light)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2 font-bold">回本期</td>
                      <td className="py-2 text-[var(--profit)]">100%</td>
                      <td className="py-2 text-[var(--loss)]">0%</td>
                      <td className="py-2 text-[var(--loss)]">0%</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold">活跃期</td>
                      <td className="py-2 text-[var(--profit)]">{fees.lpPortion}%</td>
                      <td className="py-2 text-[var(--hazard-yellow)]">{fees.creatorPortion}%</td>
                      <td className="py-2 text-[var(--profit)]">{fees.binPortion}% 交换费</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[var(--muted)] mt-3">
                LP 费用根据每位流动性提供者的存款份额按比例分配。
                买入 Bin 的交易者在卖出时可获得累积的 Bin 奖励（默认 {fees.binPortion}% 交换费，最高 50%）。
              </p>
            </div>
          </div>
        </section>

        {/* Governance */}
        <section id="governance" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>治理与解锁</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              在回本阶段，投资者拥有治理权来保护他们的投资：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>投资者可以投票</strong>解锁 $overeign 并退出</li>
              <li>• <strong>创作者不能投票</strong>——只有代币存款人可以参与</li>
              <li>• <strong>需要 67% 法定人数</strong>——大多数投资者必须参与</li>
              <li>• <strong>需要 51% 批准</strong>——简单多数通过</li>
              <li>• <strong>时间锁</strong>——在执行前给予讨论时间，并让代币持有者有时间平仓</li>
            </ul>
            <div className="card mt-4" style={{ background: 'rgba(242, 183, 5, 0.1)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
              <p className="text-sm">
                <strong>解锁会发生什么？</strong><br/>
                如果治理通过解锁投票，流动性池将被关闭。
                投资者可以领取他们的 GOR（减去任何不足），创作者可以领取剩余的代币。
              </p>
            </div>
          </div>
        </section>

        {/* Auto-Unwind */}
        <section id="auto-unwind" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>低交易量保护</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              如果 $overeign 在较长时间内（90-365 天）交易活动非常低，
              协议会触发<strong>活动检查</strong>：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• 如果交易量保持在阈值以下，LP 可以被解锁</li>
              <li>• 这保护投资者不会被困在死项目中</li>
              <li>• 投资者收回他们的 GOR，创作者获得剩余代币</li>
            </ul>
          </div>
        </section>

        {/* Genesis NFT */}
        <section id="genesis-nft" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>创世 NFT</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              当债券完成时，每个投资者都会收到一个<strong>创世 NFT</strong>，
              代表他们在流动性头寸中的份额：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>追踪您的份额</strong>——总存款的百分比</li>
              <li>• <strong>赚取费用</strong>——领取您的交易费用份额</li>
              <li>• <strong>可转让</strong>——出售或转让您的头寸</li>
              <li>• <strong>治理权</strong>——在回本期间对提案进行投票</li>
            </ul>
            <div className="card mt-4">
              <p className="text-sm text-[var(--muted)]">
                <strong>注意：</strong>创作者不会收到创世 NFT。他们不能领取 LP 费用——
                他们唯一的收入来自卖出费用（如果配置了的话）。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12">
          <div className="card card-highlight text-center py-8">
            <h2 className="h2 mb-4" style={{ color: 'var(--text-light)' }}>准备发射了吗？</h2>
            <p className="text-[var(--muted)] mb-6">
              创建您的 $overeign，以公平的方式引导流动性。
            </p>
            <a href="/mint" className="btn btn-primary btn-lg inline-block">
              发射您的 $overeign
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
