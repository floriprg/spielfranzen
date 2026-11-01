import React, { useState } from 'react';

interface CardBackProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardBack: React.FC<CardBackProps> = ({ className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-14 aspect-[256/480]',
    md: 'w-20 sm:w-22 aspect-[256/480]',
    lg: 'w-26 sm:w-28 aspect-[256/480]',
  }[size];

  return (
    <div
      className={`relative rounded-md overflow-hidden border border-amber-900/50 shadow-md select-none bg-stone-900 flex items-center justify-center ${sizeClasses} ${className}`}
    >
      {!imgError ? (
        <img
          src="/cards/CARD_BACK.webp"
          alt="Card Back"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover pointer-events-none rounded-md"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-red-900 to-amber-950 flex items-center justify-center border border-amber-600/50">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-sm">
            F
          </div>
        </div>
      )}
    </div>
  );
};
