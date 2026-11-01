import { GAME_MODE_INFO, GameMode } from '@spielfranzen/shared';
import { Bot, Check, Copy, Crown, Play, Shield, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardView } from '../components/cards/CardView.js';
import { SuitIcon } from '../components/cards/SuitIcon.js';
import { BiddingControls } from '../components/table/BiddingControls.js';
import { MatchCompletedModal } from '../components/table/MatchCompletedModal.js';
import { PlayerSeatView } from '../components/table/PlayerSeatView.js';
import { RoundSummaryModal } from '../components/table/RoundSummaryModal.js';
import { TalonModal } from '../components/table/TalonModal.js';
import { TrickArea } from '../components/table/TrickArea.js';
import { useAuthStore } from '../store/authStore.js';
import { useGameStore } from '../store/gameStore.js';

export const GamePage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    connectSocket,
    disconnectSocket,
    gameState,
    sendBid,
    sendTalonAction,
    playCard,
    nextRound,
    addBot,
    removeBot,
    error,
    clearError,
  } = useGameStore();

  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (matchId) {
      connectSocket(matchId);
    }
    return () => {
      disconnectSocket();
    };
  }, [matchId]);

  if (error && !gameState) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center flex-col gap-4 bg-slate-950 text-slate-200 p-4">
        <div className="bg-slate-900 border border-rose-500/50 p-6 rounded-2xl text-center max-w-md shadow-2xl">
          <p className="text-base font-bold text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-sm shadow transition-all"
          >
            Zurück zur Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center flex-col gap-4 bg-slate-950 text-slate-200">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-amber-300">
          Verbinde mit Spieltisch...
        </p>
      </div>
    );
  }

  const {
    code,
    status,
    totalRounds,
    currentRound,
    phase,
    dealerSeat,
    currentTurnSeat,
    declarerSeat,
    gameMode,
    minMode,
    mySeatIndex,
    players,
    myHand,
    talonCards,
    currentTrick,
    lastTrick,
    declarerCardPoints,
    defenderCardPoints,
    biddingState,
    lastRoundResult,
    matchResult,
    legalCardIdsToPlay,
  } = gameState;

  const isMyTurn = mySeatIndex !== null && currentTurnSeat === mySeatIndex;
  const isDeclarer = mySeatIndex !== null && declarerSeat === mySeatIndex;
  const modeNum = gameMode !== null && gameMode !== undefined ? Number(gameMode) : null;
  const isBettlOrMord =
    modeNum === 9 || modeNum === 10 || modeNum === 11 || modeNum === 12;

  // Determine seating layout relative to current user:
  // Me is at bottom. Opponent 1 is left (me + 1) % 3, Opponent 2 is right (me + 2) % 3.
  const mySeat = mySeatIndex !== null ? mySeatIndex : 0;
  const opponentLeftSeat = (mySeat + 1) % 3;
  const opponentRightSeat = (mySeat + 2) % 3;

  const opponentLeft = players[opponentLeftSeat];
  const opponentRight = players[opponentRightSeat];
  const myPlayer = players[mySeat];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const modeInfo = gameMode ? GAME_MODE_INFO[gameMode] : null;

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top Match Status & Score Bar */}
      <div className="bg-slate-900/95 border-b border-amber-600/30 px-3 py-1 flex items-center justify-between gap-2 shadow-sm flex-shrink-0 text-xs">
        {/* Left: Round & Code */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-mono text-[11px] font-bold transition-colors cursor-pointer"
            title="Code kopieren"
          >
            <span>#{code}</span>
            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <span className="text-[11px] font-bold text-slate-300">
            Runde <strong className="text-amber-400">{currentRound}</strong>/{totalRounds}
          </span>
        </div>

        {/* Center: Mode Indicator */}
        <div className="flex items-center gap-1.5">
          {modeInfo ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-sm text-amber-300 text-[11px] font-bold">
              {modeInfo.trumpSuit && <SuitIcon suit={modeInfo.trumpSuit} size={14} />}
              <span>{modeInfo.name}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium border border-slate-700">
              {phase === 'BIDDING' ? 'Biet-Phase' : 'Austeilen...'}
            </div>
          )}
        </div>

        {/* Right: Live Scoreboard (Zero-Sum) - Visible on sm and larger screens */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
          {players.map((p) => (
            <div
              key={p.seatIndex}
              className={`flex items-center gap-1 px-2 py-0.2 rounded border ${
                p.seatIndex === mySeatIndex
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <span className="font-semibold text-slate-300 truncate max-w-[80px]" title={p.username}>
                {p.username}:
              </span>
              <span
                className={`font-mono font-bold ${
                  p.score > 0
                    ? 'text-emerald-400'
                    : p.score < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {p.score > 0 ? `+${p.score}` : p.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-900/90 text-rose-200 px-3 py-1 text-xs font-semibold text-center flex items-center justify-center gap-2 flex-shrink-0">
          <span>{error}</span>
          <button onClick={clearError} className="underline hover:text-white cursor-pointer">
            OK
          </button>
        </div>
      )}

      {/* Main Card Game Table - Zero Scroll Fit */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between p-1.5 sm:p-2.5 bg-radial from-emerald-900 via-emerald-950 to-slate-950 shadow-felt border-2 sm:border-4 border-amber-950/70 overflow-hidden">
        {/* Waiting Room Overlay if 3 players not yet ready */}
        {status === 'WAITING' && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl">
              <Users className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold font-serif-vintage text-amber-300 mb-1">
                Warte auf Mitspieler
              </h2>
              <p className="text-xs text-slate-300 mb-3">
                Teile den Raum-Code <strong className="text-amber-400 font-mono">#{code}</strong>{' '}
                oder füge Bots hinzu.
              </p>

              <div className="space-y-2 mb-4">
                {[0, 1, 2].map((sIndex) => {
                  const p = players[sIndex];
                  const isTaken = p && p.userId && p.userId !== '';
                  return (
                    <div
                      key={sIndex}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center">
                          {sIndex + 1}
                        </div>
                        <span className="font-semibold text-slate-200">
                          {isTaken ? (
                            <>
                              {p.username} {p.isBot && '(Bot)'}
                            </>
                          ) : (
                            <span className="text-slate-500 italic">Freier Platz</span>
                          )}
                        </span>
                      </div>

                      {!isTaken ? (
                        <button
                          onClick={() => addBot(sIndex)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Bot hinzufügen</span>
                        </button>
                      ) : (
                        p.isBot && (
                          <button
                            onClick={() => removeBot(sIndex)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            Entfernen
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCopyCode}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{copiedCode ? 'Code kopiert!' : 'Raum-Code kopieren'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Top: Opponent Seats */}
        <div className="flex justify-between items-start max-w-4xl mx-auto w-full px-2 pt-0.5 flex-shrink-0 gap-2">
          {opponentLeft && (
            <PlayerSeatView
              player={opponentLeft}
              isCurrentTurn={currentTurnSeat === opponentLeft.seatIndex}
              isDealer={dealerSeat === opponentLeft.seatIndex}
              isMe={false}
              className="flex-1 max-w-[165px] sm:max-w-[210px]"
            />
          )}

          {opponentRight && (
            <PlayerSeatView
              player={opponentRight}
              isCurrentTurn={currentTurnSeat === opponentRight.seatIndex}
              isDealer={dealerSeat === opponentRight.seatIndex}
              isMe={false}
              className="flex-1 max-w-[165px] sm:max-w-[210px]"
            />
          )}
        </div>

        {/* Center: Trick Play or Bidding Controls (strictly contained) */}
        <div className="flex-1 min-h-0 flex items-center justify-center my-auto py-0.5 relative">
          {phase === 'BIDDING' ? (
            <BiddingControls
              biddingState={biddingState}
              mySeatIndex={mySeat}
              isMyTurn={isMyTurn}
              onBid={sendBid}
            />
          ) : (
            <TrickArea
              currentTrick={currentTrick}
              lastTrick={lastTrick}
              players={players}
              declarerCardPoints={declarerCardPoints}
              defenderCardPoints={defenderCardPoints}
              trickNumber={gameState.lastTrick ? gameState.lastTrick.trickNumber + 1 : 1}
              gameMode={gameMode}
              declarerSeat={declarerSeat}
            />
          )}
        </div>

        {/* Bottom: Player's Own Hand & Status */}
        <div className="flex flex-col items-center max-w-4xl mx-auto w-full pb-2 pt-0 flex-shrink-0">
          {/* Turn Alert */}
          {isMyTurn && phase === 'TRICK_PLAY' && (
            <div className="mb-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[11px] shadow animate-bounce border border-yellow-300">
              Du bist am Zug! Wähle eine Karte:
            </div>
          )}

          {/* Mobile Hand (Two staggered rows when > 5 cards, single row when <= 5 cards) */}
          <div className="flex sm:hidden flex-col items-center w-full px-1 pt-1 pb-0.5">
            {myHand.length > 5 ? (
              <>
                {/* Back Row */}
                <div className="flex justify-center items-end -space-x-1.5">
                  {myHand.slice(0, Math.ceil(myHand.length / 2)).map((card) => {
                    const isLegal =
                      phase !== 'TRICK_PLAY'
                        ? true
                        : !isMyTurn
                        ? true
                        : legalCardIdsToPlay.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        className="relative transition-all duration-200 hover:-translate-y-3 hover:z-30 active:scale-95"
                      >
                        <CardView
                          card={card}
                          isLegal={isLegal}
                          onClick={() => {
                            if (isMyTurn && phase === 'TRICK_PLAY') {
                              playCard(card.id);
                            }
                          }}
                          size="sm"
                          showPoints={!isBettlOrMord}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* Front Row (slightly overlapping top row vertically) */}
                <div className="flex justify-center items-end -space-x-1.5 -mt-9 z-10">
                  {myHand.slice(Math.ceil(myHand.length / 2)).map((card) => {
                    const isLegal =
                      phase !== 'TRICK_PLAY'
                        ? true
                        : !isMyTurn
                        ? true
                        : legalCardIdsToPlay.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        className="relative transition-all duration-200 hover:-translate-y-3 hover:z-30 active:scale-95"
                      >
                        <CardView
                          card={card}
                          isLegal={isLegal}
                          onClick={() => {
                            if (isMyTurn && phase === 'TRICK_PLAY') {
                              playCard(card.id);
                            }
                          }}
                          size="sm"
                          showPoints={!isBettlOrMord}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Single row on mobile when 5 or fewer cards */
              <div className="flex justify-center items-end gap-1">
                {myHand.map((card) => {
                  const isLegal =
                    phase !== 'TRICK_PLAY'
                      ? true
                      : !isMyTurn
                      ? true
                      : legalCardIdsToPlay.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      className="relative transition-all duration-200 hover:-translate-y-3 hover:z-30 active:scale-95"
                    >
                      <CardView
                        card={card}
                        isLegal={isLegal}
                        onClick={() => {
                          if (isMyTurn && phase === 'TRICK_PLAY') {
                            playCard(card.id);
                          }
                        }}
                        size="md"
                        showPoints={!isBettlOrMord}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Hand (Single row with fan overlap) */}
          <div className="hidden sm:flex justify-center items-end px-2 pt-2 pb-1 max-w-full">
            {myHand.map((card, index) => {
              const isLegal =
                phase !== 'TRICK_PLAY'
                  ? true
                  : !isMyTurn
                  ? true
                  : legalCardIdsToPlay.includes(card.id);

              const overlapClass =
                index === 0
                  ? ''
                  : myHand.length > 7
                  ? '-ml-4 sm:-ml-5 md:-ml-6'
                  : myHand.length > 4
                  ? '-ml-3 sm:-ml-4'
                  : 'ml-1';

              return (
                <div
                  key={card.id}
                  className={`relative transition-all duration-200 hover:-translate-y-4 hover:z-30 cursor-pointer ${overlapClass}`}
                >
                  <CardView
                    card={card}
                    isLegal={isLegal}
                    onClick={() => {
                      if (isMyTurn && phase === 'TRICK_PLAY') {
                        playCard(card.id);
                      }
                    }}
                    size="md"
                    showPoints={!isBettlOrMord}
                  />
                </div>
              );
            })}
          </div>

          {/* Player Seat Summary at bottom */}
          {myPlayer && (
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-300 font-semibold bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700/80 shadow mt-1">
              <span className="text-amber-400 font-bold">{myPlayer.username} (Du)</span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                Rolle:{' '}
                {myPlayer.role === 'DECLARER' ? (
                  <span className="text-amber-300 font-bold flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-amber-400" /> Alleinspieler
                  </span>
                ) : myPlayer.role === 'DEFENDER' ? (
                  <span className="text-slate-300 font-semibold flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-slate-400" /> Gegner
                  </span>
                ) : (
                  'Ausstehend'
                )}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Stiche: <strong className="text-slate-100">{myPlayer.tricksWon}</strong>
              </span>
              {!isBettlOrMord && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>
                    Augen: <strong className="text-amber-300">{myPlayer.cardPointsWon}</strong>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Talon & Declaration Modal for Declarer */}
      {phase === 'TALON_AND_DECLARATION' && isDeclarer && (
        <TalonModal
          myHand={myHand}
          talonCards={talonCards}
          minMode={(minMode || 5) as GameMode}
          onTalonAction={sendTalonAction}
        />
      )}

      {/* Waiting for Declarer Modal for Defenders */}
      {phase === 'TALON_AND_DECLARATION' && !isDeclarer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
            <h3 className="text-lg font-bold text-amber-300 font-serif-vintage mb-1">
              Talon & Ansage
            </h3>
            <p className="text-xs text-slate-300">
              Der Alleinspieler ({players[declarerSeat!]?.username}) inspiziert den Talon und wählt
              den Spielmodus...
            </p>
          </div>
        </div>
      )}

      {/* Round Summary Modal: only opens after trick review (3 cards) completes */}
      {phase === 'ROUND_SUMMARY' && lastRoundResult && currentTrick.length < 3 && (
        <RoundSummaryModal
          roundResult={lastRoundResult}
          players={players}
          onNextRound={nextRound}
          isHost={players[0]?.userId === user?.id}
        />
      )}

      {/* Match Completed Modal: only opens after trick review (3 cards) completes */}
      {(phase === 'MATCH_COMPLETED' || status === 'COMPLETED') && matchResult && currentTrick.length < 3 && (
        <MatchCompletedModal matchResult={matchResult} />
      )}
    </div>
  );
};
