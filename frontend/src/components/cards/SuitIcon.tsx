import { Suit } from '@spielfranzen/shared';
import React from 'react';

interface SuitIconProps {
  suit: Suit;
  className?: string;
  size?: number;
}

export const SuitIcon: React.FC<SuitIconProps> = ({ suit, className = '', size = 20 }) => {
  switch (suit) {
    case 'EICHEL':
      // Acorn
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`inline-block ${className}`}
        >
          {/* Acorn cap */}
          <path
            d="M7 9C7 6 9.5 4 12 4C14.5 4 17 6 17 9C17 9.5 16.5 10 16 10H8C7.5 10 7 9.5 7 9Z"
            fill="#78350f"
            stroke="#451a03"
            strokeWidth="1.2"
          />
          {/* Stem */}
          <path d="M12 4V1.5C12 1.5 13 1 14 1.5" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
          {/* Nut body */}
          <path
            d="M8 10C8 10 7.5 16 12 21.5C16.5 16 16 10 16 10H8Z"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="1.2"
          />
        </svg>
      );

    case 'LAUB':
      // Green Leaf
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`inline-block ${className}`}
        >
          {/* Leaf outline */}
          <path
            d="M12 2C6 7 4 13 6 18C7.5 21.5 11 22 12 22C13 22 16.5 21.5 18 18C20 13 18 7 12 2Z"
            fill="#15803d"
            stroke="#14532d"
            strokeWidth="1.2"
          />
          {/* Vein */}
          <path d="M12 5V21" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12 10L15 8" stroke="#86efac" strokeWidth="1" strokeLinecap="round" />
          <path d="M12 14L9 12" stroke="#86efac" strokeWidth="1" strokeLinecap="round" />
          <path d="M12 17L15 15" stroke="#86efac" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );

    case 'SCHELL':
      // Bell
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`inline-block ${className}`}
        >
          {/* Bell sphere */}
          <circle cx="12" cy="13" r="8" fill="#eab308" stroke="#a16207" strokeWidth="1.2" />
          {/* Suspension eyelet */}
          <circle cx="12" cy="3.5" r="2" fill="none" stroke="#a16207" strokeWidth="1.5" />
          {/* Cross slit at bottom */}
          <path d="M6 13H18" stroke="#713f12" strokeWidth="1.2" />
          <circle cx="12" cy="16" r="1.5" fill="#713f12" />
        </svg>
      );

    case 'HERZ':
      // Red Heart
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`inline-block ${className}`}
        >
          <path
            d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1.2"
          />
        </svg>
      );
  }
};
