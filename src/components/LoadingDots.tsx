import React from 'react';
import { Sparkles, Gem, Crown } from 'lucide-react';

interface LoadingDotsProps {
  label?: string;
  className?: string;
}

const CATEGORY_ITEMS = [
  {
    id: 'cosmetics',
    name: 'Cosmetics',
    icon: Sparkles,
    delay: '0ms'
  },
  {
    id: 'imitations',
    name: 'Imitations',
    icon: Gem,
    delay: '200ms'
  },
  {
    id: 'hair',
    name: 'Hair Accessories',
    icon: Crown,
    delay: '400ms'
  }
];

export const LoadingDots: React.FC<LoadingDotsProps> = ({ label, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3.5 select-none ${className}`}>
      {/* 3 Circular Icons in a Balanced Row */}
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        {CATEGORY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1.5 animate-pulse"
              style={{ animationDelay: item.delay, animationDuration: '1.6s' }}
            >
              {/* PC-appropriate ~w-10 h-10 circular container with dark navy bg & amber border */}
              <div className="w-10 h-10 rounded-full bg-slate-900/90 border border-amber-500/40 shadow-[0_0_14px_rgba(245,158,11,0.2)] flex items-center justify-center transition-transform">
                <Icon size={18} className="text-amber-400" />
              </div>
              {/* Category Label */}
              <span className="text-[10px] font-bold text-slate-300 tracking-wide text-center">
                {item.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Optional Loading Description Label */}
      {label && (
        <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
          {label}
        </p>
      )}
    </div>
  );
};
