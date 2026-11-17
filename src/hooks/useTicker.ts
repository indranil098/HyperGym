import { useEffect, useState } from 'react';

/**
 * Re-renders on a fixed interval while `active` is true. Used by the rest ring
 * and the stopwatch, which both read wall-clock time rather than accumulating
 * their own counter, so they stay correct across restarts and backgrounding.
 */
export function useTicker(active: boolean, intervalMs = 200): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      setTick(Date.now());
      return;
    }
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return tick;
}
