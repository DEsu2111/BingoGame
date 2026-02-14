// Bottom status bar with win/loss messaging and Play Again control.
'use client';

import { useGame } from '@/context/GameContext';

export default function StatsBar() {
  const { state, dispatch } = useGame();

  const wins = state.results.filter((result) => result.type === 'win').length;
  const losses = state.results.filter((result) => result.type === 'loss').length;
  const recentResults = state.results.slice(0, 5);

  const message =
    state.winStatus === 'win'
      ? `Congratulations! You won $${state.winAmount.toFixed(2)}.`
      : state.winStatus === 'loss'
        ? `You matched ${state.matchedCount} numbers. Better luck next round.`
        : 'Game in progress. Keep marking called numbers manually.';

  return (
    <footer className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-center">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
          className="rounded-md bg-linear-to-r from-slate-900 to-slate-700 px-4 py-2 text-sm font-semibold text-white hover:from-slate-800 hover:to-slate-600 active:scale-95"
        >
          Play Again
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
        <div className="rounded-lg bg-linear-to-r from-emerald-50 to-emerald-100 px-3 py-2 font-semibold text-emerald-800 shadow-sm">
          Balance: ${state.balance.toFixed(2)}
        </div>
        <div className="rounded-lg bg-linear-to-r from-sky-50 to-sky-100 px-3 py-2 font-semibold text-sky-800 shadow-sm">
          Bet: ${state.betAmount.toFixed(2)}
        </div>
        <div className="rounded-lg bg-linear-to-r from-blue-50 to-blue-100 px-3 py-2 font-semibold text-blue-800 shadow-sm">
          Wins: {wins}
        </div>
        <div className="rounded-lg bg-linear-to-r from-rose-50 to-rose-100 px-3 py-2 font-semibold text-rose-800 shadow-sm">
          Losses: {losses}
        </div>
        <div className="rounded-lg bg-linear-to-r from-amber-50 to-amber-100 px-3 py-2 font-semibold text-amber-800 shadow-sm">
          Called: {state.calledNumbers.size}/75
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm shadow-inner">
        <p className="mb-2 text-center text-base font-bold text-slate-900">Recent Results</p>
        {recentResults.length === 0 ? (
          <p className="text-slate-600">No rounds finished yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Bet</th>
                  <th className="px-2 py-1">Payout</th>
                  <th className="px-2 py-1">Matched</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.slice(0, 5).map((result, idx) => {
                  const isWin = result.type === 'win';
                  return (
                    <tr
                      key={result.id}
                      className={`border-t ${isWin ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}
                    >
                      <td className="px-2 py-1 font-semibold">{idx + 1}</td>
                      <td className="px-2 py-1 font-semibold">{isWin ? 'Win' : 'Loss'}</td>
                      <td className="px-2 py-1">${result.betAmount.toFixed(2)}</td>
                      <td className="px-2 py-1">${result.payout.toFixed(2)}</td>
                      <td className="px-2 py-1">{result.matchedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </footer>
  );
}

