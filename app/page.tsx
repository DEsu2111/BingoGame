'use client';

import { useGame } from '@/context/GameContext';
import Welcome from '@/components/Welcome/Welcome';
import GameBoard from '@/components/Game/GameBoard';
import SelectCards from '@/components/Welcome/SelectCards';
import ResultPage from '@/components/Result/ResultPage';

export default function Home() {
  const { state } = useGame();
  if (state.mode === 'welcome') return <Welcome />;
  if (state.mode === 'select') return <SelectCards />;
  if (state.mode === 'result') return <ResultPage />;
  return <GameBoard />;
}
