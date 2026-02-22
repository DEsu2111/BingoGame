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

export default function ResultOverlay() {
  return <ResultPage />;
}
