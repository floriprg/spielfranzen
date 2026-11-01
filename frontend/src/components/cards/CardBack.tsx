import React from 'react';

interface CardBackProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardBack: React.FC<CardBackProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-24',
    md: 'w-24 h-36',
    lg: 'w-28 h-44',
  }[size];

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 border-amber-300 shadow-card bg-slate-900 select-none ${sizeClasses} ${className}`}
    >
      {/* Bavarian blue-and-white rhomboid / diamond pattern */}
      <svg className="w-full h-full opacity-80" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bavarian-rhombus" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="20" fill="#0284c7" />
            <rect x="10" width="10" height="20" fill="#f8fafc" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bavarian-rhombus)" />
        {/* Inner gold frame */}
        <rect x="4" y="4" width="92" height="142" rx="4" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.9" />
        <circle cx="50" cy="75" r="16" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
        <text x="50" y="80" textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="bold">
          F
        </text>
      </svg>
    </div>
  );
};
