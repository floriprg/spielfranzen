import { GameTimerState } from '@spielfranzen/shared';
import { useEffect, useState } from 'react';

export function formatSecondsMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export interface UseTurnTimerResult {
  enabled: boolean;
  turnSecondsRemaining: number;
  bankSecondsRemaining: number;
  turnDuration: number;
  progressPercent: number;
  isUrgent: boolean; // under 10 seconds
}

export function useTurnTimer(
  timer: GameTimerState | undefined,
  seatIndex: number,
  isCurrentTurn: boolean,
): UseTurnTimerResult {
  const calculate = (): UseTurnTimerResult => {
    if (!timer || !timer.config || !timer.config.enabled) {
      return {
        enabled: false,
        turnSecondsRemaining: 0,
        bankSecondsRemaining: 0,
        turnDuration: 60,
        progressPercent: 0,
        isUrgent: false,
      };
    }

    const currentBank = timer.playerBanks?.[seatIndex] ?? timer.config.totalTimeBank;

    if (!isCurrentTurn || timer.turnStartedAt === null) {
      return {
        enabled: true,
        turnSecondsRemaining: 0,
        bankSecondsRemaining: currentBank,
        turnDuration: timer.turnDuration || timer.config.turnTimeLimit,
        progressPercent: 0,
        isUrgent: false,
      };
    }

    const elapsed = Math.max(0, Math.floor((Date.now() - timer.turnStartedAt) / 1000));
    const turnRemaining = Math.max(0, (timer.turnDuration || timer.config.turnTimeLimit) - elapsed);
    const bankRemaining = Math.max(0, currentBank - elapsed);
    const turnDuration = Math.max(1, timer.turnDuration || timer.config.turnTimeLimit);
    const progressPercent = Math.min(100, Math.max(0, (turnRemaining / turnDuration) * 100));
    const isUrgent = turnRemaining <= 10;

    return {
      enabled: true,
      turnSecondsRemaining: turnRemaining,
      bankSecondsRemaining: bankRemaining,
      turnDuration,
      progressPercent,
      isUrgent,
    };
  };

  const [state, setState] = useState<UseTurnTimerResult>(calculate);

  useEffect(() => {
    setState(calculate());

    if (!timer?.config?.enabled || !isCurrentTurn || timer.turnStartedAt === null) {
      return;
    }

    const interval = setInterval(() => {
      setState(calculate());
    }, 500);

    return () => clearInterval(interval);
  }, [
    timer?.config?.enabled,
    timer?.turnStartedAt,
    timer?.turnDuration,
    timer?.playerBanks?.[seatIndex],
    isCurrentTurn,
    seatIndex,
  ]);

  return state;
}
