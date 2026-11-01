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
    <div className="min-h-[calc(100vh-65px)] flex flex-col bg-slate-950 select-none">
      {/* Top Match Status & Score Bar */}
      <div className="bg-slate-900/90 border-b border-amber-600/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Round & Code */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-mono text-xs font-bold transition-colors"
            title="Code kopieren"
          >
            <span>#{code}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <span className="text-xs font-bold text-slate-300">
            Runde <strong className="text-amber-400">{currentRound}</strong> / {totalRounds}
          </span>
        </div>

        {/* Center: Mode Indicator */}
        <div className="flex items-center gap-2">
          {modeInfo ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-sm text-amber-300 text-xs font-bold">
              {modeInfo.trumpSuit && <SuitIcon suit={modeInfo.trumpSuit} size={16} />}
              <span>{modeInfo.name}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
              {phase === 'BIDDING' ? 'Biet-Phase aktiv' : 'Austeilen...'}
            </div>
          )}
        </div>

        {/* Right: Live Scoreboard (Zero-Sum) */}
        <div className="flex items-center gap-3 text-xs">
          {players.map((p) => (
            <div
              key={p.seatIndex}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border ${
                p.seatIndex === mySeatIndex
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <span className="font-semibold text-slate-300">{p.username}:</span>
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
        <div className="bg-rose-900/90 text-rose-200 px-4 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-2">
          <span>{error}</span>
          <button onClick={clearError} className="underline hover:text-white">
            OK
          </button>
        </div>
      )}

      {/* Main Card Game Table */}
      <div className="flex-1 relative flex flex-col justify-between p-4 bg-radial from-emerald-900 via-emerald-950 to-slate-950 shadow-felt border-4 border-amber-950/70 overflow-hidden">
        {/* Waiting Room Overlay if 3 players not yet ready */}
        {status === 'WAITING' && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
              <Users className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold font-serif-vintage text-amber-300 mb-1">
                Warte auf Mitspieler
              </h2>
              <p className="text-xs text-slate-300 mb-4">
                Teile den Raum-Code <strong className="text-amber-400 font-mono">#{code}</strong>{' '}
                mit deinen Freunden oder fülle leere Plätze mit Bots auf.
              </p>

              <div className="space-y-3 mb-6">
                {[0, 1, 2].map((sIndex) => {
                  const p = players[sIndex];
                  const isTaken = p && p.userId && p.userId !== '';
                  return (
                    <div
                      key={sIndex}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center">
                          {sIndex + 1}
                        </div>
                        <span className="font-semibold text-sm text-slate-200">
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
                          className="px-3 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Bot hinzufügen</span>
                        </button>
                      ) : (
                        p.isBot && (
                          <button
                            onClick={() => removeBot(sIndex)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
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
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>{copiedCode ? 'Code kopiert!' : 'Raum-Code in Zwischenablage kopieren'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Top: Opponent Seats */}
        <div className="flex justify-between items-start max-w-5xl mx-auto w-full px-4">
          {opponentLeft && (
            <PlayerSeatView
              player={opponentLeft}
              isCurrentTurn={currentTurnSeat === opponentLeft.seatIndex}
              isDealer={dealerSeat === opponentLeft.seatIndex}
              isMe={false}
              className="w-48"
            />
          )}

          {opponentRight && (
            <PlayerSeatView
              player={opponentRight}
              isCurrentTurn={currentTurnSeat === opponentRight.seatIndex}
              isDealer={dealerSeat === opponentRight.seatIndex}
              isMe={false}
              className="w-48"
            />
          )}
        </div>

        {/* Center: Trick Play or Bidding Controls */}
        <div className="my-auto py-4">
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
            />
          )}
        </div>

        {/* Bottom: Player's Own Hand & Status */}
        <div className="flex flex-col items-center max-w-5xl mx-auto w-full">
          {/* Turn Alert */}
          {isMyTurn && phase === 'TRICK_PLAY' && (
            <div className="mb-2 px-4 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-lg animate-bounce">
              Du bist am Zug! Wähle eine gültige Karte zum Ausspielen:
            </div>
          )}

          {/* Cards Fan */}
          <div className="relative flex flex-wrap justify-center items-end gap-1.5 sm:gap-2 px-2 pb-2">
            {myHand.map((card) => {
              const isLegal =
                phase !== 'TRICK_PLAY'
                  ? true
                  : !isMyTurn
                  ? true
                  : legalCardIdsToPlay.includes(card.id);

              return (
                <CardView
                  key={card.id}
                  card={card}
                  isLegal={isLegal}
                  onClick={() => {
                    if (isMyTurn && phase === 'TRICK_PLAY') {
                      playCard(card.id);
                    }
                  }}
                  size="md"
                />
              );
            })}
          </div>

          {/* Player Seat Summary at bottom */}
          {myPlayer && (
            <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700/80 shadow mt-1">
              <span className="text-amber-400 font-bold">{myPlayer.username} (Du)</span>
              <span>•</span>
              <span>
                Rolle:{' '}
                {myPlayer.role === 'DECLARER'
                  ? '👑 Alleinspieler'
                  : myPlayer.role === 'DEFENDER'
                  ? '🛡️ Gegner'
                  : 'Ausstehend'}
              </span>
              <span>•</span>
              <span>Stiche: {myPlayer.tricksWon}</span>
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
