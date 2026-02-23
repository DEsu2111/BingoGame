/**
 * ResultOverlay.tsx — Round Result Wrapper
 *
 * A thin wrapper that renders the ResultPage component when
 * the game round ends. This exists as a separate component
 * so that page.tsx stays clean and the result screen can be
 * lazy-loaded or enhanced independently in the future.
 */
'use client';

import ResultPage from '@/components/Result/ResultPage';

type ResultOverlayProps = {
  nickname: string;
  lastWinner: string | null;
  onLogout: () => void;
};

export default function ResultOverlay({ nickname, lastWinner, onLogout }: ResultOverlayProps) {
  return <ResultPage nickname={nickname} lastWinner={lastWinner} onLogout={onLogout} />;
}
