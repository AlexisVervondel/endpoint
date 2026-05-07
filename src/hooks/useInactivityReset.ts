import { useEffect, useCallback } from 'react';

export function useInactivityReset(timeoutMs: number, onReset: () => void): void {
  const stableReset = useCallback(onReset, [onReset]);

  useEffect(() => {
    let timer = setTimeout(stableReset, timeoutMs);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(stableReset, timeoutMs);
    };

    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [timeoutMs, stableReset]);
}
