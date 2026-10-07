import React from 'react';
import { Loader2 } from 'lucide-react';

interface CommonLoaderProps {
  message?: string;
  className?: string;
  size?: number;
}

export const CommonLoader: React.FC<CommonLoaderProps> = ({
  message = 'Loading...',
  className = 'py-12',
  size = 20
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 select-none ${className}`}>
      <Loader2 size={size} className="animate-spin text-amber-400" />
      {message && (
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
          {message}
        </span>
      )}
    </div>
  );
};
