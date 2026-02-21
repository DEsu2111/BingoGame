'use client';

import Image from 'next/image';
import { useMemo } from 'react';

type Player = {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  tag: 'Pro' | 'Elite' | 'Rookie';
  wins: number;
  losses: number;
  xp: number; // 0-100
  skill: number; // 0-100
};

const TAG_COLORS: Record<Player['tag'], string> = {
  Pro: 'from-cyan-400 to-blue-500 text-slate-900',
  Elite: 'from-emerald-400 to-emerald-600 text-emerald-950',
  Rookie: 'from-amber-300 to-rose-300 text-slate-900',
};

export default function PlayerDashboard() {
  const players = useMemo<Player[]>(
    () => [
      {
        id: 'p1',
        name: 'Ava Storm',
        avatar: 'https://ui-avatars.com/api/?name=Ava+Storm&background=1f2937&color=f8fafc',
        status: 'online',
        tag: 'Elite',
        wins: 42,
        losses: 12,
        xp: 86,
        skill: 78,
      },
      {
        id: 'p2',
        name: 'Liam Blaze',
        avatar: 'https://ui-avatars.com/api/?name=Liam+Blaze&background=111827&color=f8fafc',
        status: 'offline',
        tag: 'Pro',
        wins: 35,
        losses: 20,
        xp: 72,
        skill: 68,
      },
      {
        id: 'p3',
        name: 'Mia Nova',
        avatar: 'https://ui-avatars.com/api/?name=Mia+Nova&background=0f172a&color=f8fafc',
        status: 'online',
        tag: 'Rookie',
        wins: 18,
        losses: 25,
        xp: 54,
        skill: 44,
      },
      {
        id: 'p4',
        name: 'Ezra Flux',
        avatar: 'https://ui-avatars.com/api/?name=Ezra+Flux&background=0b1222&color=f8fafc',
        status: 'online',
        tag: 'Pro',
        wins: 28,
        losses: 16,
        xp: 65,
        skill: 60,
      },
    ],
    [],
  );

  return (
    <section className="glass-dark rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Player Dashboard</p>
          <h2 className="text-xl font-bold text-slate-50">Live Competitors</h2>
        </div>
        <button className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition">
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-white/5 uppercase text-[11px] tracking-[0.12em] text-slate-300">
              <tr>
                {['player', 'status', 'tag', 'wins', 'losses', 'xp', 'skill', 'actions'].map((heading) => (
                  <th key={heading} className="px-3 py-3 text-left font-bold">
                    <span className="inline-flex items-center gap-1">
                      {heading}
                      <span className="text-slate-500">↕</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr
                  key={player.id}
                  className={`border-t border-white/5 transition ${
                    idx % 2 === 0 ? 'bg-white/3' : 'bg-white/1'
                  } hover:border-cyan-400/60 hover:bg-white/8 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_10px_25px_rgba(0,0,0,0.35)]`}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`avatar-ring ${player.status === 'online' ? 'ring-on' : 'ring-off'}`}>
                        <Image
                          src={player.avatar}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-50">{player.name}</p>
                        <p className="text-xs text-slate-400">#{player.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        player.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      <span className={`status-dot ${player.status === 'online' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {player.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full bg-gradient-to-r ${TAG_COLORS[player.tag]} px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-md`}
                    >
                      {player.tag}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-300">{player.wins}</td>
                  <td className="px-3 py-3 font-semibold text-rose-300">{player.losses}</td>
                  <td className="px-3 py-3">
                    <Progress label="XP" value={player.xp} color="from-cyan-400 to-blue-500" />
                  </td>
                  <td className="px-3 py-3">
                    <Progress label="Skill" value={player.skill} color="from-emerald-400 to-emerald-600" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button className="btn-glow">View Profile</button>
                      <button className="btn-pulse">Challenge</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} shadow-[0_0_12px_rgba(56,189,248,0.6)] animate-progress`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
