import { GameMode, GameType, PlayedCard, SanitizedPlayerSeat, Trick } from '@spielfranzen/shared';
import { Eye, Flame, History, Shield, Target, Users } from 'lucide-react';
import React, { useState } from 'react';
import { CardView } from '../cards/CardView.js';

interface TrickAreaProps {
  currentTrick: PlayedCard[];
  lastTrick: Trick | null;
  players: SanitizedPlayerSeat[];
  declarerCardPoints: number;
  defenderCardPoints: number;
  trickNumber: number;
  gameMode?: GameMode | null;
  declarerSeat?: number | null;
  mySeatIndex?: number | null;
  currentTurnSeat?: number | null;
  gameType?: GameType;
  maxPlayers?: number;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  currentTrick,
  lastTrick,
  players,
  declarerCardPoints,
  defenderCardPoints,
  trickNumber,
  gameMode,
  declarerSeat,
  mySeatIndex,
  currentTurnSeat,
  gameType = 'franzen',
  maxPlayers,
}) => {
  const [showLastTrick, setShowLastTrick] = useState<boolean>(false);

  const numPlayers = maxPlayers || players.length || 3;
  const isWatten = gameType.startsWith('watten');
  const isSchnapsen = gameType.startsWith('schnapsen');

  // Reliable numerical parse for mode (Franzen)
  const modeNum = gameMode !== null && gameMode !== undefined ? Number(gameMode) : null;
  const isBettl = !isWatten && !isSchnapsen && (modeNum === 9 || modeNum === 11);
  const isMord = !isWatten && !isSchnapsen && (modeNum === 10 || modeNum === 12);
  const isBettlOrMord = isBettl || isMord;

  const declarerPlayer =
    (declarerSeat !== null && declarerSeat !== undefined ? players[declarerSeat] : null) ||
    players.find((p) => p.role === 'DECLARER');

  // Relative seat mapping:
  const mySeat = mySeatIndex ?? 0;
  const opponentSeat2P = (mySeat + 1) % 2;
  const opponentLeftSeat3P = (mySeat + 1) % 3;
  const opponentRightSeat3P = (mySeat + 2) % 3;
  const opponentLeftSeat4P = (mySeat + 1) % 4;
  const partnerSeat4P = (mySeat + 2) % 4;
  const opponentRightSeat4P = (mySeat + 3) % 4;

  // Active trick to render (either last completed trick if reviewing, or current trick)
  const isViewingLastTrick = showLastTrick && !!lastTrick;
  const activeCards = isViewingLastTrick ? lastTrick.cards : currentTrick;

  // Trick is complete when all players have played their card
  const isTrickCompleted = !isViewingLastTrick && currentTrick.length === numPlayers;
  const winnerSeat = isViewingLastTrick
    ? lastTrick.winnerSeat
    : isTrickCompleted
    ? lastTrick?.winnerSeat
    : null;
  const winnerName =
    winnerSeat !== null && winnerSeat !== undefined ? players[winnerSeat]?.username : null;
  const trickPoints = isViewingLastTrick
    ? lastTrick.points
    : isTrickCompleted
    ? lastTrick?.points || 0
    : currentTrick.reduce((acc, p) => acc + p.card.points, 0);

  // Helper to render each player's trick card or their waiting placeholder
  const renderTrickCardSlot = (
    seatIndex: number,
    position: 'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-center',
    labelOverride?: string,
  ) => {
    const play = activeCards.find((p) => p.seatIndex === seatIndex);
    const player = players[seatIndex];
    const isWinner = winnerSeat === seatIndex;
    const isTurn = !isViewingLastTrick && !isTrickCompleted && currentTurnSeat === seatIndex;
    const isMe = seatIndex === mySeat;
    const isPartner = numPlayers === 4 && seatIndex === partnerSeat4P;

    const tiltClass =
      position === 'top-left' || position === 'left'
        ? '-rotate-2 sm:-rotate-3'
        : position === 'top-right' || position === 'right'
        ? 'rotate-2 sm:rotate-3'
        : 'rotate-0';

    if (play) {
      return (
        <div
          className={`relative flex flex-col items-center transition-all duration-300 ${
            isWinner
              ? 'scale-105 z-20'
              : isTrickCompleted || isViewingLastTrick
              ? 'opacity-90 scale-95'
              : 'animate-in fade-in zoom-in-95'
          }`}
        >
          {/* Winner Crown Badge */}
          {isWinner && (
            <div className="absolute -top-5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-lg flex items-center gap-1 animate-bounce z-30">
              <span>
                👑 Gewinner
                {!isBettlOrMord && !isWatten && ` (+${trickPoints})`}
              </span>
            </div>
          )}

          <div
            className={`rounded-lg transition-all ${
              isWinner
                ? 'ring-3 sm:ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.85)]'
                : ''
            } ${tiltClass}`}
          >
            <CardView
              card={play.card}
              size="sm"
              className="sm:w-13"
              isLegal={true}
              showPoints={!isBettlOrMord && !isWatten}
            />
          </div>

          <span
            title={player?.username}
            className={`text-[9px] sm:text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded-full border shadow transition-all truncate max-w-[125px] sm:max-w-[160px] ${
              isWinner
                ? 'text-amber-300 bg-slate-900 border-amber-400/80 font-bold'
                : isPartner
                ? 'text-teal-300 bg-teal-950/80 border-teal-500/40'
                : 'text-amber-200/90 bg-slate-900/80 border-amber-500/20'
            }`}
          >
            {isMe
              ? `${player?.username || 'Du'} (Du)`
              : isPartner
              ? `${player?.username || 'Partner'} (Partner)`
              : player?.username || 'Spieler'}
          </span>
        </div>
      );
    }

    // Card hasn't been played yet: show elegant felt placeholder
    return (
      <div className="flex flex-col items-center">
        <div
          className={`w-[44px] sm:w-[50px] aspect-[256/480] max-h-[94px] flex-shrink-0 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center p-1 ${
            isTurn
              ? 'border-amber-400/90 bg-amber-950/30 shadow-[0_0_14px_rgba(251,191,36,0.4)] animate-pulse'
              : 'border-emerald-700/35 bg-emerald-950/20'
          }`}
        >
          {isTurn ? (
            <span className="text-[9px] text-amber-300 font-bold text-center leading-tight">
              {isMe ? 'Du bist am Zug' : 'Am Zug...'}
            </span>
          ) : (
            <span className="text-[9px] text-emerald-500/40 font-semibold uppercase text-center leading-tight">
              {labelOverride || (isMe ? 'Du' : isPartner ? 'Partner' : 'Gegner')}
            </span>
          )}
        </div>

        <span
          title={player?.username}
          className="text-[9px] sm:text-[10px] text-emerald-400/60 font-medium mt-1 truncate max-w-[125px] sm:max-w-[160px]"
        >
          {isMe
            ? `${player?.username || 'Du'} (Du)`
            : isPartner
            ? `${player?.username || 'Partner'} (Partner)`
            : player?.username || 'Spieler'}
        </span>
      </div>
    );
  };

  // Center objective indicator based on game type
  const renderObjectiveHeader = () => {
    if (isWatten) {
      return (
        <div className="flex items-center gap-1.5 mb-1 text-[9px] sm:text-[11px] font-semibold">
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-950/90 border border-amber-500/50 rounded-full text-amber-200 shadow-sm">
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            <span>Watten (Ziel: 3 Stiche)</span>
          </div>
        </div>
      );
    }

    if (isSchnapsen) {
      return (
        <div className="flex items-center gap-1.5 mb-1 text-[9px] sm:text-[11px] font-semibold">
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-950/90 border border-amber-500/50 rounded-full text-amber-300 shadow-sm">
            <Eye className="w-2.5 h-2.5 text-amber-400" />
            <span>Ziel: 66 Augen</span>
          </div>
        </div>
      );
    }

    if (isBettl) {
      return (
        <div className="flex items-center gap-1.5 mb-1 text-[9px] sm:text-[11px] font-semibold">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-950/90 border border-purple-500/50 rounded-full text-purple-200 shadow-sm">
            <Target className="w-2.5 h-2.5 text-purple-400" />
            <span>{modeNum === 11 ? 'Doppelbettl' : 'Bettl'} (0 Stiche)</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 border border-slate-700 rounded-full text-slate-300">
            <span>
              Stiche:{' '}
              <strong
                className={
                  (declarerPlayer?.tricksWon || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }
              >
                {declarerPlayer?.tricksWon || 0}
              </strong>
            </span>
          </div>
        </div>
      );
    }

    if (isMord) {
      return (
        <div className="flex items-center gap-1.5 mb-1 text-[9px] sm:text-[11px] font-semibold">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/90 border border-rose-500/50 rounded-full text-rose-200 shadow-sm">
            <Target className="w-2.5 h-2.5 text-rose-400" />
            <span>{modeNum === 12 ? 'Doppelmord' : 'Mord'} (10 Stiche)</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 border border-slate-700 rounded-full text-slate-300">
            <span>
              Stiche: <strong className="text-amber-400">{declarerPlayer?.tricksWon || 0} / 10</strong>
            </span>
          </div>
        </div>
      );
    }

    // Default Franzen Color Game
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[9px] sm:text-[11px] font-semibold">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/80 border border-amber-500/50 rounded-full text-amber-300 shadow-sm">
          <Eye className="w-2.5 h-2.5 text-amber-400" />
          <span>Alleinspieler: {declarerCardPoints} / 66</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 border border-slate-700 rounded-full text-slate-300 shadow-sm">
          <Eye className="w-2.5 h-2.5 text-slate-400" />
          <span>Gegner: {defenderCardPoints} / 66</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-xl mx-auto py-0.5">
      {/* Felt Table Playing Surface */}
      <div className="relative w-full min-h-[185px] sm:min-h-[215px] px-2 py-2 sm:px-4 sm:py-2.5 rounded-2xl sm:rounded-3xl bg-emerald-950/40 border border-emerald-800/40 shadow-inner flex flex-col justify-between">
        {/* 2-Player Layout: Opponent directly Top-Center */}
        {numPlayers === 2 && (
          <div className="w-full flex items-start justify-between px-2 sm:px-6 z-10">
            <div className="w-12 sm:w-16" />
            <div className="flex flex-col items-center">
              {renderTrickCardSlot(opponentSeat2P, 'top-center', 'Gegner')}
              {renderObjectiveHeader()}
            </div>
            <div className="w-12 sm:w-16" />
          </div>
        )}

        {/* 3-Player Layout: Opponent Left - Header - Opponent Right */}
        {numPlayers === 3 && (
          <div className="w-full flex items-start justify-between px-1 sm:px-4 z-10">
            {renderTrickCardSlot(opponentLeftSeat3P, 'top-left', 'Gegner 1')}
            <div className="flex flex-col items-center pt-0.5 z-10 px-1">
              {renderObjectiveHeader()}
              {/* Trick Title / Banner */}
              {isViewingLastTrick ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-[10px] text-amber-300 font-bold">
                  <History className="w-3 h-3 text-amber-400" />
                  <span>Letzter Stich (#{lastTrick?.trickNumber}) - Gewonnen von {winnerName}</span>
                </div>
              ) : isTrickCompleted && winnerName ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 my-0.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/95 border-2 border-amber-400 rounded-full shadow-xl backdrop-blur-md">
                    <span className="text-amber-200 font-black text-xs sm:text-sm whitespace-nowrap">
                      👑 Stich an <strong className="text-amber-300">{winnerName}</strong>
                      {!isBettlOrMord && !isWatten && ` (+${trickPoints} Augen)`}
                    </span>
                  </div>
                  <div className="w-24 sm:w-32 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden border border-slate-700/80 shadow-inner">
                    <div className="h-full bg-amber-400 animate-[trickProgress_1s_linear]" />
                  </div>
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs font-bold text-amber-300/80 tracking-widest uppercase mt-0.5">
                  {trickNumber > 10 ? 'Letzter Stich (#10)' : `Stich #${trickNumber || 1}`}
                </span>
              )}
            </div>
            {renderTrickCardSlot(opponentRightSeat3P, 'top-right', 'Gegner 2')}
          </div>
        )}

        {/* 4-Player Layout (watten_4): Partner Top-Center, Opponent Left, Opponent Right */}
        {numPlayers === 4 && (
          <div className="w-full flex items-start justify-between px-1 sm:px-4 z-10">
            {renderTrickCardSlot(opponentLeftSeat4P, 'left', 'Gegner links')}
            <div className="flex flex-col items-center pt-0.5 z-10 px-1">
              {renderTrickCardSlot(partnerSeat4P, 'top-center', 'Partner')}
              {renderObjectiveHeader()}
            </div>
            {renderTrickCardSlot(opponentRightSeat4P, 'right', 'Gegner rechts')}
          </div>
        )}

        {/* 2-Player & 4-Player Middle Banner */}
        {numPlayers !== 3 && (
          <div className="flex flex-col items-center justify-center my-0.5 z-10">
            {isViewingLastTrick ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-[10px] text-amber-300 font-bold">
                <History className="w-3 h-3 text-amber-400" />
                <span>Letzter Stich (#{lastTrick?.trickNumber}) - Gewonnen von {winnerName}</span>
              </div>
            ) : isTrickCompleted && winnerName ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 my-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/95 border-2 border-amber-400 rounded-full shadow-xl backdrop-blur-md">
                  <span className="text-amber-200 font-black text-xs sm:text-sm whitespace-nowrap">
                    👑 Stich an <strong className="text-amber-300">{winnerName}</strong>
                    {!isBettlOrMord && !isWatten && ` (+${trickPoints} Augen)`}
                  </span>
                </div>
                <div className="w-24 sm:w-32 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden border border-slate-700/80 shadow-inner">
                  <div className="h-full bg-amber-400 animate-[trickProgress_1s_linear]" />
                </div>
              </div>
            ) : (
              <span className="text-[10px] sm:text-xs font-bold text-amber-300/80 tracking-widest uppercase">
                Stich #{trickNumber || 1}
              </span>
            )}
          </div>
        )}

        {/* Bottom Row: You (unten in der Mitte) */}
        <div className="w-full flex justify-center pb-0.5 z-10">
          {renderTrickCardSlot(mySeat, 'bottom-center', 'Du')}
        </div>
      </div>

      {/* Button to toggle / close last trick preview */}
      {lastTrick && !isTrickCompleted && (
        <div className="mt-1 flex items-center justify-center">
          {isViewingLastTrick ? (
            <button
              onClick={() => setShowLastTrick(false)}
              className="text-[10px] text-amber-300 hover:text-amber-200 bg-slate-900/90 hover:bg-slate-800 px-3 py-1 rounded-full border border-amber-500/50 shadow transition-all cursor-pointer font-bold"
            >
              ← Zurück zum aktuellen Stich
            </button>
          ) : (
            <button
              onClick={() => setShowLastTrick(true)}
              className="flex items-center gap-1 text-[10px] text-amber-400/80 hover:text-amber-300 bg-slate-900/60 hover:bg-slate-900 px-2.5 py-0.5 rounded-full border border-amber-500/20 transition-all cursor-pointer shadow-sm"
            >
              <History className="w-3 h-3" /> Letzten Stich ansehen
            </button>
          )}
        </div>
      )}
    </div>
  );
};
