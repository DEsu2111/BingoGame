interface BalanceDisplayProps {
  balance: number;
}

export default function BalanceDisplay({ balance }: BalanceDisplayProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-slate-500">Current Balance</p>
      <p className="text-3xl font-bold text-slate-900">${balance.toFixed(2)}</p>
    </div>
  );
}
