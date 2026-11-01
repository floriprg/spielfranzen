import { Card } from '@spielfranzen/shared';
import React from 'react';
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
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs',
    md: 'w-24 h-36 text-sm',
    lg: 'w-28 h-44 text-base',
  }[size];

  const suitTextColor: Record<string, string> = {
    EICHEL: 'text-amber-800',
    LAUB: 'text-emerald-700',
    SCHELL: 'text-amber-600',
    HERZ: 'text-rose-600',
  };

  const isWeli = card.id === 'SCHELL_WELI' || card.rank === 1;

  // Render rank label (Ass -> A, König -> K, Ober -> O, Unter -> U, 10 -> 10, etc.)
  const rankLabel = isWeli ? 'W' : card.shortName;

  return (
    <div
      onClick={isLegal ? onClick : undefined}
      className={`
        relative rounded-lg bg-gradient-to-b from-stone-50 to-stone-100 
        border-2 select-none transition-all duration-200 cursor-pointer flex flex-col justify-between p-1.5
        ${sizeClasses}
        ${
          isSelected
            ? '-translate-y-4 shadow-card-hover ring-4 ring-amber-400 border-amber-500 z-20'
            : isLegal
            ? 'shadow-card hover:-translate-y-2 hover:shadow-card-hover border-stone-300 hover:border-amber-400'
            : 'opacity-40 grayscale cursor-not-allowed border-stone-400/50'
        }
        ${className}
      `}
      title={`${card.name} (${card.points} Augen)${!isLegal ? ' - Nicht regelkonform' : ''}`}
    >
      {/* Top Left Index */}
      <div className="flex flex-col items-center leading-none">
        <span
          className={`font-black font-serif-vintage ${
            isWeli ? 'text-amber-600' : suitTextColor[card.suit]
          }`}
        >
          {rankLabel}
        </span>
        <SuitIcon suit={card.suit} size={size === 'sm' ? 12 : 16} />
      </div>

      {/* Center Motif Artwork */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {isWeli ? (
          <div className="text-center">
            <span className="text-xl font-black text-amber-600 tracking-wider font-serif-vintage block">
              WELI
            </span>
            <div className="flex justify-center gap-0.5 mt-0.5">
              <span className="text-amber-500 text-xs">⭐</span>
              <SuitIcon suit="SCHELL" size={16} />
              <span className="text-amber-500 text-xs">⭐</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <SuitIcon suit={card.suit} size={size === 'sm' ? 22 : size === 'md' ? 32 : 40} />
            {card.rank >= 5 && card.rank <= 7 && (
              <span className="text-[10px] font-bold text-stone-600 font-serif-vintage uppercase tracking-tight mt-0.5">
                {card.rank === 7 ? '👑 König' : card.rank === 6 ? '🗡️ Ober' : '🛡️ Unter'}
              </span>
            )}
          </div>
        )}

        {/* Eyes / Points badge */}
        {showPoints && card.points > 0 && size !== 'sm' && (
          <span className="absolute bottom-0 text-[10px] font-semibold px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded shadow-xs">
            {card.points} Augen
          </span>
        )}
      </div>

      {/* Bottom Right Inverted Index */}
      <div className="flex flex-col items-center leading-none rotate-180">
        <span
          className={`font-black font-serif-vintage ${
            isWeli ? 'text-amber-600' : suitTextColor[card.suit]
          }`}
        >
          {rankLabel}
        </span>
        <SuitIcon suit={card.suit} size={size === 'sm' ? 12 : 16} />
      </div>
    </div>
  );
};
