'use client';

import { useState } from 'react';

interface DepositWithdrawProps {
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
}

export default function DepositWithdraw({ onDeposit, onWithdraw }: DepositWithdrawProps) {
  const [amount, setAmount] = useState<number>(0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-slate-700">Deposit or Withdraw</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={amount || ''}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="w-40 rounded-md border border-slate-300 px-3 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:shadow-sm"
          placeholder="Amount"
        />
        <button
          type="button"
        onClick={() => {
          if (amount > 0) onDeposit(amount);
          setAmount(0);
        }}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Deposit
      </button>
      <button
        type="button"
        onClick={() => {
          if (amount > 0) onWithdraw(amount);
          setAmount(0);
        }}
        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Withdraw
      </button>
      </div>
    </div>
  );
}
