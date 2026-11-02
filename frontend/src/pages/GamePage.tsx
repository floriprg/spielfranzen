import { GAME_MODE_INFO, GameMode } from '@spielfranzen/shared';
import { Bot, Check, Clock, Copy, Crown, Play, Shield, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardView } from '../components/cards/CardView.js';
import { SuitIcon } from '../components/cards/SuitIcon.js';
import { formatSecondsMMSS, useTurnTimer } from '../components/common/useTurnTimer.js';
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
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [showMatchCompleted, setShowMatchCompleted] = useState(false);

  useEffect(() => {
    if (matchId) {
      connectSocket(matchId);
    }
    return () => {
      disconnectSocket();
    };
  }, [matchId]);

  useEffect(() => {
    if (gameState?.phase === 'ROUND_SUMMARY' && gameState.lastRoundResult) {
      if (gameState.currentTrick.length === 3) {
        const timer = setTimeout(() => {
          setShowRoundSummary(true);
        }, 3200);
        return () => clearTimeout(timer);
      } else {
        setShowRoundSummary(true);
      }
    } else {
      setShowRoundSummary(false);
    }
  }, [gameState?.phase, gameState?.lastRoundResult, gameState?.currentTrick?.length]);

  useEffect(() => {
    const isCompleted = gameState?.phase === 'MATCH_COMPLETED' || gameState?.status === 'COMPLETED';
    if (isCompleted && gameState?.matchResult) {
      if (gameState.currentTrick.length === 3) {
        const timer = setTimeout(() => {
          setShowMatchCompleted(true);
        }, 3200);
        return () => clearTimeout(timer);
      } else {
        setShowMatchCompleted(true);
      }
    } else {
      setShowMatchCompleted(false);
    }
  }, [gameState?.phase, gameState?.status, gameState?.matchResult, gameState?.currentTrick?.length]);

  // Hook rules: Always call hooks unconditionally at the top level
  const mySeat = gameState?.mySeatIndex !== null && gameState?.mySeatIndex !== undefined ? gameState.mySeatIndex : 0;
  const isMyTurn = gameState?.mySeatIndex !== null && gameState?.mySeatIndex !== undefined && gameState?.currentTurnSeat === gameState.mySeatIndex;
  const isDeclarer = gameState?.mySeatIndex !== null && gameState?.mySeatIndex !== undefined && gameState?.declarerSeat === gameState.mySeatIndex;

  const myTimer = useTurnTimer(gameState?.timer, mySeat, isMyTurn);
  const declarerTimer = useTurnTimer(
    gameState?.timer,
    gameState?.declarerSeat ?? 0,
    gameState?.phase === 'TALON_AND_DECLARATION',
  );

  const handleCopyCode = () => {
    if (gameState?.code) {
      navigator.clipboard.writeText(gameState.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

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

  // Dedicated Waiting Room view when waiting for players
  if (status === 'WAITING') {
    return (
      <div className="h-full flex-1 min-h-0 flex flex-col bg-slate-950 select-none overflow-y-auto p-4 sm:p-6 items-center justify-center">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black font-serif-vintage bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent mb-1">
            Warteraum
          </h2>
          <p className="text-xs text-slate-300 mb-6">
            Teile den Raum-Code mit deinen Freunden oder fülle leere Plätze mit KI-Bots auf.
          </p>

          {/* Room Code Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-amber-500/40 hover:border-amber-400 text-amber-400 font-mono text-base font-black transition-all flex items-center gap-2 cursor-pointer shadow-inner active:scale-95"
              title="Code kopieren"
            >
              <span>#{code}</span>
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-400 font-semibold">
              ({totalRounds} Runden)
            </span>
          </div>

          {/* 3 Seats List */}
          <div className="space-y-3 mb-6">
            {[0, 1, 2].map((sIndex) => {
              const p = players[sIndex];
              const isTaken = p && p.userId && p.userId !== '';
              const isMe = isTaken && p.seatIndex === mySeatIndex;
              return (
                <div
                  key={sIndex}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-all ${
                    isTaken
                      ? isMe
                        ? 'bg-amber-950/40 border-amber-500/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800'
                      : 'bg-slate-950/50 border-dashed border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center shadow">
                      {sIndex + 1}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5 min-w-0">
                        <span className="truncate max-w-[190px] sm:max-w-[280px]" title={p.username}>
                          {isTaken ? (
                            <>
                              {p.username} {p.isBot && '(Bot)'} {isMe && '(Du)'}
                            </>
                          ) : (
                            <span className="text-slate-500 italic font-normal">Freier Platz</span>
                          )}
                        </span>
                        {sIndex === 0 && (
                          <span title="Host">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isTaken ? (p.isBot ? 'KI-Gegner' : 'Spieler') : 'Wartet auf Beitritt...'}
                      </div>
                    </div>
                  </div>

                  {!isTaken ? (
                    <button
                      onClick={() => addBot(sIndex)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Bot hinzufügen</span>
                    </button>
                  ) : (
                    p.isBot && (
                      <button
                        onClick={() => removeBot(sIndex)}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer px-2 py-1"
                      >
                        Entfernen
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/lobby')}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Zurück zur Lobby
            </button>
            <button
              onClick={handleCopyCode}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Kopiert!' : 'Code kopieren'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modeNum = gameMode !== null && gameMode !== undefined ? Number(gameMode) : null;
  const isBettlOrMord =
    modeNum === 9 || modeNum === 10 || modeNum === 11 || modeNum === 12;

  // Determine seating layout relative to current user:
  // Me is at bottom. Opponent 1 is left (me + 1) % 3, Opponent 2 is right (me + 2) % 3.
  const opponentLeftSeat = (mySeat + 1) % 3;
  const opponentRightSeat = (mySeat + 2) % 3;

  const opponentLeft = players[opponentLeftSeat];
  const opponentRight = players[opponentRightSeat];
  const myPlayer = players[mySeat];

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
      <div className="flex-1 min-h-0 relative flex flex-col justify-between p-1.5 sm:p-2.5 bg-slate-950 shadow-felt border-2 sm:border-4 border-amber-950/70 overflow-hidden">
        {/* Top: Opponent Seats */}
        <div className="flex justify-between items-start max-w-4xl mx-auto w-full px-2 pt-0.5 flex-shrink-0 gap-2">
          {opponentLeft && (
            <PlayerSeatView
              player={opponentLeft}
              isCurrentTurn={currentTurnSeat === opponentLeft.seatIndex}
              isDealer={dealerSeat === opponentLeft.seatIndex}
              isMe={false}
              timer={gameState.timer}
              className="flex-1 max-w-[200px] sm:max-w-[250px]"
            />
          )}

          {opponentRight && (
            <PlayerSeatView
              player={opponentRight}
              isCurrentTurn={currentTurnSeat === opponentRight.seatIndex}
              isDealer={dealerSeat === opponentRight.seatIndex}
              isMe={false}
              timer={gameState.timer}
              className="flex-1 max-w-[200px] sm:max-w-[250px]"
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
              timer={gameState.timer}
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
              mySeatIndex={mySeat}
              currentTurnSeat={currentTurnSeat}
            />
          )}
        </div>

        {/* Bottom: Player's Own Hand & Status */}
        <div className="flex flex-col items-center max-w-4xl mx-auto w-full pb-2 pt-0 flex-shrink-0">
          {/* Turn Alert */}
          {isMyTurn && phase === 'TRICK_PLAY' && (
            <div
              className={`mb-1 px-3 py-0.5 rounded-full font-black text-[11px] shadow flex items-center gap-1.5 border ${
                myTimer.enabled && myTimer.isUrgent
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-300 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-yellow-300 animate-bounce'
              }`}
            >
              <span>Du bist am Zug! Wähle eine Karte:</span>
              {myTimer.enabled && (
                <>
                  <span className="font-mono bg-black/25 px-1.5 py-0.2 rounded text-[10px]">
                    ⏱️ {myTimer.turnSecondsRemaining}s
                  </span>
                  <span className="text-[10px] opacity-80 font-normal">
                    ({formatSecondsMMSS(myTimer.bankSecondsRemaining)})
                  </span>
                </>
              )}
            </div>
          )}

          {/* Player Hand Cards - ALWAYS identical fixed size, never grows or shrinks */}
          <div className="flex justify-center items-end px-2 pt-1.5 pb-1 max-w-full overflow-visible">
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
                  ? '-ml-3.5 sm:-ml-2 md:-ml-2.5'
                  : myHand.length > 4
                  ? '-ml-2 sm:-ml-0.5 md:ml-1'
                  : 'ml-1 sm:ml-2 md:ml-2.5';

              return (
                <div
                  key={card.id}
                  className={`relative transition-all duration-200 hover:-translate-y-4 hover:z-30 cursor-pointer flex-shrink-0 ${overlapClass}`}
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
              <span className="text-amber-400 font-bold truncate max-w-[200px] sm:max-w-[300px]" title={myPlayer.username}>
                {myPlayer.username} (Du)
              </span>
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
              {myTimer.enabled && (
                <>
                  <span className="text-slate-600">•</span>
                  <span
                    className={`flex items-center gap-1 font-mono text-[10px] sm:text-xs ${
                      isMyTurn
                        ? myTimer.isUrgent
                          ? 'text-rose-400 font-bold animate-pulse'
                          : 'text-amber-300 font-bold'
                        : 'text-slate-400'
                    }`}
                    title="Verbleibende Gesamtbedenkzeit"
                  >
                    <Clock className="w-3 h-3" />
                    {isMyTurn ? (
                      <span>
                        {myTimer.turnSecondsRemaining}s ({formatSecondsMMSS(myTimer.bankSecondsRemaining)})
                      </span>
                    ) : (
                      <span>{formatSecondsMMSS(myTimer.bankSecondsRemaining)}</span>
                    )}
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
          timer={gameState.timer}
          seatIndex={mySeat}
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
            {declarerTimer.enabled && (
              <div className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-amber-300 font-mono font-bold bg-slate-950/70 py-1 px-3 rounded-full border border-amber-500/40">
                <Clock className="w-3.5 h-3.5" />
                <span>Bedenkzeit: {declarerTimer.turnSecondsRemaining}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Round Summary Modal: opens after 3.2s trick review or immediately on reload */}
      {showRoundSummary && lastRoundResult && (
        <RoundSummaryModal
          roundResult={lastRoundResult}
          players={players}
          onNextRound={nextRound}
          isHost={players[0]?.userId === user?.id}
          mySeatIndex={gameState?.mySeatIndex}
        />
      )}

      {/* Match Completed Modal: opens after 3.2s trick review or immediately on reload */}
      {showMatchCompleted && matchResult && (
        <MatchCompletedModal
          matchResult={matchResult}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};
