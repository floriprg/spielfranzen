import { Card } from '@spielfranzen/shared';
import React, { useState } from 'react';
import { SuitIcon } from './SuitIcon.js';

interface CardViewProps {
  card: Card;
  isLegal?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPoints?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isLegal = true,
  isSelected = false,
  onClick,
  size = 'md',
  className = '',
  showPoints = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-14 aspect-[256/480] text-xs',
    md: 'w-20 sm:w-22 aspect-[256/480] text-sm',
    lg: 'w-26 sm:w-28 aspect-[256/480] text-base',
  }[size];

  const suitTextColor: Record<string, string> = {
    EICHEL: 'text-amber-800',
    LAUB: 'text-emerald-700',
    SCHELL: 'text-amber-600',
    HERZ: 'text-rose-600',
  };

  const isWeli = card.id === 'SCHELL_WELI' || card.rank === 1;
  const rankLabel = isWeli ? 'W' : card.shortName;

  return (
    <div
      onClick={isLegal ? onClick : undefined}
      className={`
        relative rounded-md select-none transition-all duration-200 cursor-pointer overflow-hidden
        ${sizeClasses}
        ${
          isSelected
            ? '-translate-y-4 shadow-2xl ring-4 ring-amber-400 border-2 border-amber-500 z-30'
            : isLegal
            ? 'shadow-card hover:-translate-y-2 hover:shadow-card-hover border border-stone-300/80 hover:border-amber-400/90'
            : 'opacity-40 grayscale contrast-75 cursor-not-allowed border border-stone-500/40'
        }
        ${className}
      `}
      title={`${card.name} (${card.points} Augen)${!isLegal ? ' - Nicht regelkonform' : ''}`}
    >
      {/* Authentic South Tyrolean Card Image */}
      {!imgError ? (
        <div className="w-full h-full relative bg-stone-100">
          <img
            src={`/cards/${card.id}.webp`}
            alt={card.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover pointer-events-none rounded-md"
            loading="eager"
          />

          {/* Points / Augen Badge for scoring clarity */}
          {showPoints && card.points > 0 && size !== 'sm' && (
            <div className="absolute bottom-1 right-1 pointer-events-none">
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-950/85 text-amber-300 border border-amber-500/70 rounded shadow-sm backdrop-blur-[2px]">
                {card.points} {card.points === 1 ? 'Auge' : 'Augen'}
              </span>
            </div>
          )}

          {/* Weli special indicator badge */}
          {isWeli && size !== 'sm' && (
            <div className="absolute top-1 right-1 pointer-events-none">
              <span className="text-[9px] font-extrabold px-1 py-0.2 bg-amber-600/90 text-white border border-amber-300 rounded shadow-sm">
                WELI
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Fallback CSS card in case of loading error */
        <div className="w-full h-full bg-gradient-to-b from-stone-50 to-stone-100 flex flex-col justify-between p-1.5 border-2 border-stone-300">
          <div className="flex flex-col items-center leading-none">
            <span className={`font-black ${isWeli ? 'text-amber-600' : suitTextColor[card.suit]}`}>
              {rankLabel}
            </span>
            <SuitIcon suit={card.suit} size={size === 'sm' ? 12 : 16} />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
            <SuitIcon suit={card.suit} size={size === 'sm' ? 20 : 30} />
          </div>

          <div className="flex flex-col items-center leading-none rotate-180">
            <span className={`font-black ${isWeli ? 'text-amber-600' : suitTextColor[card.suit]}`}>
              {rankLabel}
            </span>
            <SuitIcon suit={card.suit} size={size === 'sm' ? 12 : 16} />
          </div>
        </div>
      )}
    </div>
  );
};
