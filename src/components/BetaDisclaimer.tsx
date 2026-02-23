'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sovereign-beta-acknowledged';

export function BetaDisclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 rounded-xl border border-[var(--hazard-yellow)] bg-[var(--landfill-black)] p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-bold text-[var(--hazard-yellow)]">
            Beta Software — Use at Your Own Risk
          </h2>
        </div>

        <p className="text-sm text-[var(--muted)] mb-4">
          Sovereign Protocol is currently in <span className="text-white font-semibold">beta</span>. By proceeding, you acknowledge and accept the following:
        </p>

        <ol className="space-y-3 text-sm mb-6">
          <li className="flex gap-2">
            <span className="text-[var(--hazard-yellow)] font-bold shrink-0">1.</span>
            <span>
              <span className="text-white font-semibold">Unaudited Code</span>
              <span className="text-[var(--muted)]"> — The smart contracts have not yet undergone a formal security audit. Bugs, vulnerabilities, or unexpected behavior may exist.</span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--hazard-yellow)] font-bold shrink-0">2.</span>
            <span>
              <span className="text-white font-semibold">Loss of Funds</span>
              <span className="text-[var(--muted)]"> — You may lose some or all funds deposited into the protocol. There is no guarantee of recovery.</span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--hazard-yellow)] font-bold shrink-0">3.</span>
            <span>
              <span className="text-white font-semibold">Experimental Mechanics</span>
              <span className="text-[var(--muted)]"> — The sovereign lifecycle (bonding, recovery, active trading, governance, and unwind), the SLAMM engine, fee distribution, and governance mechanisms are experimental and may not perform as expected.</span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--hazard-yellow)] font-bold shrink-0">4.</span>
            <span>
              <span className="text-white font-semibold">No Warranty</span>
              <span className="text-[var(--muted)]"> — The protocol is provided &quot;as is&quot; with no warranties of any kind, express or implied.</span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--hazard-yellow)] font-bold shrink-0">5.</span>
            <span>
              <span className="text-white font-semibold">Not Financial Advice</span>
              <span className="text-[var(--muted)]"> — Nothing on this site constitutes financial, investment, or legal advice.</span>
            </span>
          </li>
        </ol>

        <p className="text-xs text-[var(--faint)] mb-4">
          By clicking the button below you confirm you have read and accept these risks.
        </p>

        <button
          onClick={handleAccept}
          className="w-full py-3 rounded-lg bg-[var(--hazard-yellow)] text-black font-bold text-sm hover:brightness-110 transition-all"
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  );
}
