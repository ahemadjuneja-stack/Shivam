import React from 'react';

interface HomeVideoSliderProps {
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const HomeVideoSlider: React.FC<HomeVideoSliderProps> = ({
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
  className = '',
  style = {}
}) => {
  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`touch-pan-y ${className}`}
      style={{ ...style, touchAction: 'pan-y' }}
    >
      <div className="video-slider-track" style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div className="video-slider-slide" style={{ flex: '0 0 100%', width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default HomeVideoSlider;
