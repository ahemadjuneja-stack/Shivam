import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  className = '',
  label = 'Back'
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700 text-slate-100 text-sm font-bold transition active:scale-95 shadow-md ${className}`}
    >
      <ArrowLeft size={18} />
      <span>{label}</span>
    </button>
  );
};
