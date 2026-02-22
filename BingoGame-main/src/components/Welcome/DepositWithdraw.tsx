'use client';

import { useState } from 'react';

interface DepositWithdrawProps {
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
}

export default function DepositWithdraw({ onDeposit, onWithdraw }: DepositWithdrawProps) {
  const [amount, setAmount] = useState<number>(0);

  return (
    <div className="flex flex-col gap-2 text-xs text-white">
      <span className="font-semibold uppercase tracking-wide text-[10px]">Deposit or Withdraw</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={amount || ''}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="w-28 rounded border border-white/30 bg-transparent px-2 py-1 text-sm text-white outline-none transition focus:border-emerald-400"
          placeholder="Amount"
        />
        <button
          type="button"
          onClick={() => {
            if (amount > 0) onDeposit(amount);
            setAmount(0);
          }}
          className="rounded bg-emerald-500 px-3 py-1 text-xs font-bold text-black hover:bg-emerald-400"
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => {
            if (amount > 0) onWithdraw(amount);
            setAmount(0);
          }}
          className="rounded bg-rose-500 px-3 py-1 text-xs font-bold text-white hover:bg-rose-400"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}
