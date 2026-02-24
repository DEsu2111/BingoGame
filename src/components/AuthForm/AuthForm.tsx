/**
 * AuthForm.tsx - Login / Signup Form Component
 */
'use client';

import React from 'react';

type HelpTopic = {
  id: string;
  title: string;
  keywords: string[];
  answer: string[];
};

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'join',
    title: 'How do I join a round?',
    keywords: ['join', 'enter', 'start', 'signup', 'log in', 'login', 'nickname'],
    answer: [
      '1) Open the game inside Telegram.',
      '2) If this is your first time, set a nickname (min 3 characters).',
      '3) Tap Log in/Sign up, then choose 2 cards in the Welcome screen before countdown ends.',
    ],
  },
  {
    id: 'play',
    title: 'How do I play during ACTIVE round?',
    keywords: ['play', 'mark', 'active', 'tap', 'number', 'called'],
    answer: [
      '1) Watch the current called number.',
      '2) Tap matching numbers on your two cards.',
      '3) You can only mark numbers that were called (FREE center is auto-marked).',
    ],
  },
  {
    id: 'win',
    title: 'How do I win?',
    keywords: ['win', 'bingo', 'line', 'result', 'winner'],
    answer: [
      'Make a valid bingo pattern first (row/column/diagonal based on game rules).',
      'When the server verifies your marked pattern, the round ends and result screen shows winner.',
    ],
  },
  {
    id: 'cards',
    title: 'Card rules and limits',
    keywords: ['card', 'cards', 'reserved', 'taken', 'slots'],
    answer: [
      'Each player joins with exactly 2 cards.',
      'If selected slots are already reserved by others, choose different ones.',
      'If you do not join before round starts, you will spectate until next round.',
    ],
  },
];

function findHelpTopic(query: string): HelpTopic {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return HELP_TOPICS[0];

  let bestTopic = HELP_TOPICS[0];
  let bestScore = 0;

  for (const topic of HELP_TOPICS) {
    const score = topic.keywords.reduce((sum, keyword) => (
      normalized.includes(keyword) ? sum + 1 : sum
    ), 0);

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

type AuthFormProps = {
  countdown: number;
  isFirstTime: boolean;
  nicknameInput: string;
  isNicknameValid: boolean;
  connected: boolean;
  ready: boolean;
  authError: string | null;
  gameError: string | null;
  onNicknameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const AuthForm = React.memo(({
  countdown,
  isFirstTime,
  nicknameInput,
  isNicknameValid,
  connected,
  ready,
  authError,
  gameError,
  onNicknameChange,
  onSubmit,
}: AuthFormProps) => {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [helpQuery, setHelpQuery] = React.useState('');
  const [activeHelpId, setActiveHelpId] = React.useState(HELP_TOPICS[0].id);
  const [chatReply, setChatReply] = React.useState<string[] | null>(null);

  const activeTopic = HELP_TOPICS.find((topic) => topic.id === activeHelpId) ?? HELP_TOPICS[0];

  const handleAskHelp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const topic = findHelpTopic(helpQuery);
    setActiveHelpId(topic.id);
    setChatReply(topic.answer);
    setHelpQuery('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white px-4">
      <form
        onSubmit={onSubmit}
        aria-label={isFirstTime ? 'Sign up form' : 'Log in form'}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Online Bingo Game</p>
            <h1 className="text-2xl font-black">{isFirstTime ? 'Sign up' : 'Log in'}</h1>
          </div>
          <div
            className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-right"
            aria-live="polite"
            aria-label={`Time until next round: ${countdown} seconds`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200 font-semibold" aria-hidden="true">Next Round</p>
            <p className="text-lg font-black text-rose-300 tabular-nums" aria-hidden="true">{countdown}s</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          {!ready
            ? 'Open this page inside Telegram to continue.'
            : isFirstTime
              ? 'First time: verify, then choose a nickname to play.'
              : 'Log in to continue playing with your nickname.'}
        </p>

        <button
          type="button"
          onClick={() => setHelpOpen((prev) => !prev)}
          className="w-full rounded-lg border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-left text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
          aria-expanded={helpOpen}
          aria-controls="help-chat-panel"
        >
          {helpOpen ? 'Hide Help Chat' : 'Help Chat: How to join and play?'}
        </button>

        {helpOpen ? (
          <section
            id="help-chat-panel"
            className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-3"
            aria-label="Help chat panel"
          >
            <div className="grid grid-cols-1 gap-2">
              {HELP_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setActiveHelpId(topic.id);
                    setChatReply(topic.answer);
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    activeHelpId === topic.id
                      ? 'border-emerald-300/50 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {topic.title}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-2">Answer</p>
              <div className="space-y-1">
                {(chatReply ?? activeTopic.answer).map((line) => (
                  <p key={line} className="text-xs text-slate-100">{line}</p>
                ))}
              </div>
            </div>

            <form onSubmit={handleAskHelp} className="flex gap-2">
              <input
                value={helpQuery}
                onChange={(e) => setHelpQuery(e.target.value)}
                placeholder="Ask: how to join, play, win..."
                aria-label="Ask help question"
                className="min-w-0 flex-1 rounded-lg bg-slate-950 border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-900"
              >
                Ask
              </button>
            </form>
          </section>
        ) : null}

        <input
          value={nicknameInput}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Nickname (min 3 characters)"
          aria-label="Enter your nickname"
          required
          minLength={3}
          className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        />

        <button
          type="submit"
          disabled={!ready || (isFirstTime && !isNicknameValid)}
          aria-label={isFirstTime ? 'Submit sign up' : 'Submit login'}
          className="w-full rounded-lg bg-emerald-500 text-slate-900 font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isFirstTime ? 'Sign up' : connected ? 'Log in' : 'Log in (connecting...)'}
        </button>

        <p className="text-[11px] text-slate-400" role="status">
          Status: {connected ? 'connected' : 'waiting for server...'}
        </p>

        <div role="alert" className="space-y-1">
          {!isNicknameValid && nicknameInput.length > 0 ? (
            <p className="text-[11px] text-rose-300">Nickname must be at least 3 characters.</p>
          ) : null}
          {authError ? <p className="text-[11px] text-rose-300">{authError}</p> : null}
          {gameError ? <p className="text-[11px] text-rose-300">{gameError}</p> : null}
        </div>
      </form>
    </div>
  );
});

AuthForm.displayName = 'AuthForm';

export default AuthForm;
