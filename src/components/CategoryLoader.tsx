export default function CategoryLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <style>{`
        @keyframes categoryLoaderWave {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.93);
            border-color: rgba(212, 163, 89, 0.2);
            background-color: rgba(212, 163, 89, 0.02);
          }
          50% {
            opacity: 1;
            transform: scale(1.07);
            border-color: rgba(212, 163, 89, 0.8);
            background-color: rgba(212, 163, 89, 0.15);
          }
        }
        .cat-loader-wave-1 { animation: categoryLoaderWave 1.8s infinite ease-in-out; }
        .cat-loader-wave-2 { animation: categoryLoaderWave 1.8s infinite ease-in-out; animation-delay: 0.3s; }
        .cat-loader-wave-3 { animation: categoryLoaderWave 1.8s infinite ease-in-out; animation-delay: 0.6s; }
      `}</style>

      {/* Sequential Wave Category Badges (~40px each, gap-4) */}
      <div className="flex items-center justify-center gap-4">
        {/* 1. Cosmetics (Lipstick) */}
        <div className="cat-loader-wave-1 w-10 h-10 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300 shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="12" width="8" height="10" rx="1.5" />
            <path d="M10 12V6.5l4-2.5v8" fill="currentColor" fillOpacity="0.15" />
            <line x1="8" y1="16" x2="16" y2="16" />
          </svg>
        </div>

        {/* 2. Imitations (Ring) */}
        <div className="cat-loader-wave-2 w-10 h-10 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300 shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 3h-6z" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="13" r="6" />
            <path d="M9 5c0 0 3 2 3 2s3-2 3-2" />
          </svg>
        </div>

        {/* 3. Hair Accessories (Bow) */}
        <div className="cat-loader-wave-3 w-10 h-10 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 12L5.5 8.8C4.4 8.2 3.5 8.9 3.5 10.1v3.8c0 1.2.9 1.9 2 1.3L11 12z" />
            <path d="M13 12l5.5-3.2c1.1-.6 2 .1 2 1.3v3.8c0 1.2-.9 1.9-2 1.3L13 12z" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </div>

      {label && (
        <p className="text-xs font-bold text-slate-400 select-none text-center">{label}</p>
      )}
    </div>
  );
}
