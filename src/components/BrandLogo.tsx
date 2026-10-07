import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'sm',
  onClick
}) => {
  const sizeClasses = {
    xs: 'text-sm sm:text-base tracking-[0.18em] font-black',
    sm: 'text-base sm:text-lg tracking-[0.2em] font-black',
    md: 'text-lg sm:text-xl tracking-[0.22em] font-black',
    lg: 'text-xl sm:text-2xl tracking-[0.22em] font-black'
  }[size];

  return (
    <div 
      className={`select-none flex items-center flex-shrink-0 cursor-pointer hover:opacity-80 transition ${className}`}
      title="SHIVAM Enterprise Wholesale - Click to go to Home"
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          window.dispatchEvent(new CustomEvent('shivam-go-home'));
        }
      }}
    >
      <span 
        className={`font-aboreto shimmer-silver-text ${sizeClasses}`}
        style={{ fontFamily: "'Aboreto', serif" }}
      >
        S H I V A M
      </span>
    </div>
  );
};
