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
    const remainderPct = (10000 - binShareBps) / 100;
    const lpEffective = (lpShareBps / 10000) * remainderPct;
    const creatorEffective = (creatorShareBps / 10000) * remainderPct;

    return {
      creationFee: (creationFeeBps / 100).toFixed(2),
      activeSwapFee: (defaultSwapBps / 100).toFixed(2),
      lpPortion: lpEffective.toFixed(0),
      creatorPortion: creatorEffective.toFixed(0),
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
            <li><a href="#overview" className="hover:text-[var(--hazard-yellow)]">→ 什么是 $overeign 协议？</a></li>
            <li><a href="#how-it-works" className="hover:text-[var(--hazard-yellow)]">→ 运作原理</a></li>
            <li><a href="#slamm" className="hover:text-[var(--hazard-yellow)]">→ SLAMM 引擎</a></li>
            <li><a href="#launch-types" className="hover:text-[var(--hazard-yellow)]">→ 发射类型</a></li>
            <li><a href="#lifecycle" className="hover:text-[var(--hazard-yellow)]">→ $overeign 生命周期</a></li>
            <li><a href="#fees" className="hover:text-[var(--hazard-yellow)]">→ 费用与收益</a></li>
            <li><a href="#governance" className="hover:text-[var(--hazard-yellow)]">→ 治理与解锁</a></li>
            <li><a href="#dead-pool" className="hover:text-[var(--hazard-yellow)]">→ Dead Pool — 失败项目保护</a></li>
            <li><a href="#genesis-nft" className="hover:text-[var(--hazard-yellow)]">→ $overeign NFT</a></li>
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
              <div className="text-[10px] text-[var(--muted)] opacity-60">占总交换费</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: 'var(--hazard-yellow)' }}>
                {protocolLoading ? '...' : `${fees.creatorPortion}%`}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">创作者份额</div>
              <div className="text-[10px] text-[var(--muted)] opacity-60">占总交换费</div>
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
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>什么是 $overeign 协议？</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              <strong>$overeign 协议</strong>是一个让所有人都能获益的代币发射平台。
              创作者发射代币，投资者提供流动性，交易费用回流给参与者——
              从承担风险的投资者开始。
            </p>
            <p>
              核心机制：当你为代币发射提供资金时，<strong>你优先获得回报</strong>。
              100% 的交易费用归投资者所有，直到他们收回每一分投入。
              之后创作者才开始获得收益。没有跑路，没有锁定后被遗忘的资金——
              从第一天起就是利益一致的。
            </p>
            <p>
              背后是专门打造的交换引擎 <strong>SLAMM</strong>。它消除了传统交易所
              中蚕食投资者价值的隐性成本（即<em>无常损失</em>），永久锁定流动性
              防止创作者跑路，并赋予投资者治理投票权——如果项目沉寂，
              可以投票收回资本。你的 trash，你做主。
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
              <li><strong>债券完成</strong> — 如果达到目标，SLAMM 引擎自动创建流动性池</li>
              <li><strong>回本阶段</strong> — 100% 的交易费用流向投资者直到他们收回 GOR（可通过治理解锁）</li>
              <li><strong>活跃阶段</strong> — 回本后，LP 被锁定，交易继续（仅可通过链上低交易量机制解锁）</li>
            </ol>
          </div>
        </section>

        {/* SLAMM Engine */}
        <section id="slamm" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>SLAMM 引擎</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              SLAMM（<strong>$overeign Liquid Automated Market Maker</strong>）是驱动每个 $overeign 的交换引擎。
              与传统交易所不同：<strong>买入和卖出分别定价</strong>，从而消除了其他平台上蚕食投资者价值的隐性成本
              （即<em>无常损失</em>）。
            </p>
            <p>
              您的 GOR 和代币存放在<strong>独立的金库</strong>中——它们永远不会混合。
              这意味着您的投资价值不会因为代币价格波动而下降。您的 GOR 始终是您的 GOR。
            </p>
            <p>
              与大多数交易所从每笔交易中抽取一部分给自己不同，
              <strong> SLAMM 零协议抽成</strong>。每一个基点的交易费用都给了建设和资助 $overeign 的人——
              投资者、创作者和交易者。没有中间商税。
            </p>

            <div className="card" style={{ background: 'rgba(46, 235, 127, 0.05)', borderColor: 'rgba(46, 235, 127, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>买入机制</h3>
              <p className="text-[var(--muted)] mb-3">
                买入使用标准恒定乘积定价（CPAMM: x × y = k），实现平滑、连续的价格发现。
                随着需求增加，价格自然上升——就像任何交易所一样。
              </p>
              <p className="text-[var(--muted)]">
                代币供应被分为 <strong>Bins</strong>——小组，让引擎精确跟踪每波买家支付的价格。
                随着买入填充每个 Bin，引擎记录花费的 GOR，为该 Bin 创建锁定购买价。
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(242, 183, 5, 0.05)', borderColor: 'rgba(242, 183, 5, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--hazard-yellow)' }}>卖出机制</h3>
              <p className="text-[var(--muted)]">
                卖出<strong>不使用相同的定价曲线</strong>。每个已填充的 Bin 按其<strong>锁定价</strong>支付——
                买家在该 Bin 中支付的加权平均价格，加上累积的费用奖励。这意味着卖家的收益基于真实需求，
                而非任意曲线。
              </p>
            </div>

            <div className="card" style={{ background: 'rgba(0, 200, 255, 0.05)', borderColor: 'rgba(0, 200, 255, 0.2)' }}>
              <h3 className="h3 mb-3" style={{ color: '#00c8ff' }}>偿付能力保证</h3>
              <p className="text-[var(--muted)]">
                引擎在每笔交易上执行硬性不变量：<strong>GOR 储备永远不能低于原始债券金额</strong>。
                池始终有足够的 GOR 来支撑每一个流通中的代币。这个链上检查自动运行——无需信任。
              </p>
            </div>

            <div className="card">
              <h3 className="h3 mb-3" style={{ color: 'var(--text-light)' }}>SLAMM 对比传统 AMM</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 text-[var(--muted)]">特性</th>
                      <th className="text-left py-2 text-[var(--muted)]">SLAMM</th>
                      <th className="text-left py-2 text-[var(--muted)]">传统 AMM</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text-light)]">
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">买入定价</td>
                      <td className="py-2 text-[var(--profit)]">CPAMM（平滑）</td>
                      <td className="py-2 text-[var(--muted)]">标准曲线定价</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">卖出定价</td>
                      <td className="py-2 text-[var(--profit)]">锁定价（历史均价）</td>
                      <td className="py-2 text-[var(--muted)]">与买入相同的曲线</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">无常损失（LP）</td>
                      <td className="py-2 text-[var(--profit)]">已消除</td>
                      <td className="py-2 text-[var(--loss)]">始终存在</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">LP 提取</td>
                      <td className="py-2 text-[var(--profit)]">活跃时永久锁定</td>
                      <td className="py-2 text-[var(--loss)]">可提取（跑路风险）</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2">偿付能力底线</td>
                      <td className="py-2 text-[var(--profit)]">链上强制执行</td>
                      <td className="py-2 text-[var(--loss)]">无</td>
                    </tr>
                    <tr>
                      <td className="py-2">费用受益方</td>
                      <td className="py-2 text-[var(--profit)]">回本前 100% 归 LP，之后归创作者、LP 和交易者——零协议抽成</td>
                      <td className="py-2 text-[var(--loss)]">协议抽成，剩余归 LP</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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
                <li>• 内置转账费用（0-3%）</li>
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
                <li>• 无转账费用（仅交换费用）</li>
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
                创作者设定 GOR 债券目标（最低由协议治理设定）和持续时间（7-30 天）。
                流动性提供者存入 GOR 来资助流动性池。如果达到目标，$overeign 进入最终化阶段。
                如果没有，所有存款人获得全额退款——零风险。
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>2. 回本阶段</h3>
              <p className="text-[var(--muted)]">
                债券完成后，SLAMM 引擎创建流动性池，交易开始。流动性提供者获得
                <strong style={{ color: 'var(--hazard-yellow)' }}> $overeign NFT </strong>代表他们在池中的份额。在此阶段，
                <strong style={{ color: 'var(--profit)' }}> 100% 的交易费用归 $overeign NFT 持有者</strong>，
                直到他们收回原始 GOR 存款。创作者在此阶段获得零费用。
              </p>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--slime)' }}>
              <h3 className="h3 mb-2" style={{ color: 'var(--text-light)' }}>3. 活跃阶段</h3>
              <p className="text-[var(--muted)]">
                流动性提供者收回本金后，$overeign 进入活跃阶段。
                交易费用在流动性提供者、创作者和通过 Bin 费用奖励的交易者之间分配。流动性永久锁定——
                所有人的被动收入。创作者也可以领取其累积费用份额。
              </p>
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
                    <td className="py-3 font-bold">转账费</td>
                    <td className="py-3">0% - 3%</td>
                    <td className="py-3 text-[var(--muted)]">Token-2022 转账费——创作者在发射时设定。可放弃（永久设为 0%）</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">创建费</td>
                    <td className="py-3">{fees.creationFee}%（最高 10%）</td>
                    <td className="py-3 text-[var(--muted)]">债券目标的百分比——创建时支付给协议金库（不可退还）</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 font-bold">治理解锁费</td>
                    <td className="py-3">{fees.proposalFee} GOR</td>
                    <td className="py-3 text-[var(--muted)]">创建解锁提案的费用（回本或活跃阶段均可）</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold">解锁费</td>
                    <td className="py-3">5% - 20%</td>
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
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>治理</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              $overeign 协议赋予创作者和流动性提供者治理权，管理其 $overeign 的全生命周期：
            </p>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--hazard-yellow)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--hazard-yellow)' }}>创作者控制</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>调整转账费</strong> — 修改 Token-2022 转账费率（0% - 3%）</li>
                <li>&bull; <strong>放弃转账费</strong> — 永久设为 0% 并移除权限（不可逆）</li>
                <li>&bull; <strong>设置创作者费用钱包</strong> — 将创作者费用收入重定向到其他钱包</li>
              </ul>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: 'var(--profit)' }}>
              <h3 className="h3 mb-3" style={{ color: 'var(--profit)' }}>流动性提供者控制（通过 $overeign NFT）</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>领取费用</strong> — 链上领取您的交易费用份额</li>
                <li>&bull; <strong>对提案投票</strong> — 每个 $overeign NFT 拥有一票，按存款金额加权</li>
                <li>&bull; <strong>提议解锁</strong> — 任何 NFT 持有者都可以为其 $overeign 提出解锁投票</li>
                <li>&bull; <strong>转让头寸</strong> — 出售或转让您的 $overeign NFT（治理权随之转移）</li>
              </ul>
            </div>

            <div className="card border-l-4" style={{ borderLeftColor: '#00c8ff' }}>
              <h3 className="h3 mb-3" style={{ color: '#00c8ff' }}>协议级治理</h3>
              <ul className="space-y-2 ml-4 text-[var(--muted)]">
                <li>&bull; <strong>设置默认交换费</strong> — 协议管理员设定回本后交换费率（当前 {fees.activeSwapFee}%）</li>
                <li>&bull; <strong>调整 Bin 费用份额</strong> — 修改分配给 Bin 奖励的费用比例（最高 50%）</li>
                <li>&bull; <strong>调整创作者费用份额</strong> — 修改创作者的回本后费用份额</li>
                <li>&bull; <strong>紧急暂停</strong> — 遇到严重问题时暂停协议</li>
              </ul>
            </div>

            <div className="card mt-4" style={{ background: 'rgba(242, 183, 5, 0.1)', borderColor: 'rgba(242, 183, 5, 0.3)' }}>
              <p className="text-sm">
                <strong>投票规则：</strong>只有 $overeign NFT 持有者可以投票——创作者不能参与。
                需要 67% 法定人数和 51% 批准才能通过。如果投票通过，观察期开始
                （默认 90 天），期间交易继续。如果观察期内费用增长低于阈值，
                解锁可以被执行。
              </p>
            </div>
          </div>
        </section>

        {/* Dead Pool */}
        <section id="dead-pool" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>Dead Pool — 失败项目保护</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              虽然永久锁定流动性给创作者带来安心，但流动性提供者需要在项目失败时有退出路径。
              $overeign 协议通过创新的 <strong>Dead Pool</strong> 机制解决这个问题：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• 每个池有一个<strong>最低交易量阈值</strong>，在观察期内衡量（30-365 天，默认 90 天）</li>
              <li>• 如果交易活动低于此阈值，池将<strong>符合治理解锁条件</strong></li>
              <li>• 流动性提供者可以投票解锁池并收回资本</li>
              <li>• 创作者不能投票——只有存入 GOR 的流动性提供者参与治理</li>
              <li>• 这确保流动性提供者永远不会被困在死项目中，同时仍为活跃项目提供锁定流动性的稳定性</li>
            </ul>
          </div>
        </section>

        {/* Genesis NFT */}
        <section id="genesis-nft" className="mb-10">
          <h2 className="h2 mb-4" style={{ color: 'var(--hazard-yellow)' }}>$overeign NFT</h2>
          <div className="space-y-4 text-[var(--text-light)]">
            <p>
              当债券完成时，每个流动性提供者都会收到一个 <strong>$overeign NFT</strong>，
              代表他们在流动性头寸中的份额：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>追踪您的份额</strong>——与您的 GOR 存款成比例</li>
              <li>• <strong>赚取费用</strong>——链上领取您的交易费用份额</li>
              <li>• <strong>可转让</strong>——出售或转让您的头寸</li>
              <li>• <strong>治理权</strong>——在回本或活跃阶段对解锁提案投票</li>
            </ul>
            <div className="card mt-4">
              <p className="text-sm text-[var(--muted)]">
                <strong>注意：</strong>创作者不会收到 $overeign NFT。在回本期间，他们的费用份额被锁定。
                回本后，创作者可以领取其累积的费用份额。
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
