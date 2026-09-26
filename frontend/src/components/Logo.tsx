import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32, showText = false }) => {
  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Precision Geometric IR Prism Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="prism-facet-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="prism-facet-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="prism-facet-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Outer Hexagonal Shield / Index Vault */}
        <polygon
          points="20,2 36,11 36,29 20,38 4,29 4,11"
          fill="#090d16"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Top Facet: Query Constraint Plane */}
        <polygon
          points="20,5 33,12.5 20,20 7,12.5"
          fill="url(#prism-facet-top)"
          stroke="#3b82f6"
          strokeWidth="1"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Left Facet: Inverted Index Postings List */}
        <polygon
          points="7,12.5 20,20 20,35 7,27.5"
          fill="url(#prism-facet-b)"
          stroke="#334155"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Right Facet: Ranking & Scorer Vectors */}
        <polygon
          points="20,20 33,12.5 33,27.5 20,35"
          fill="url(#prism-facet-a)"
          stroke="#3b82f6"
          strokeWidth="1"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {/* Central Search Focus Core / Aperture */}
        <circle cx="20" cy="20" r="3" fill="#ffffff" />
        <circle cx="20" cy="20" r="4.5" stroke="#60a5fa" strokeWidth="1" opacity="0.8" />

        {/* Index Postings Grid Line Ticks */}
        <line x1="10" y1="20" x2="17" y2="24" stroke="#475569" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <line x1="10" y1="24" x2="17" y2="28" stroke="#475569" strokeWidth="1" strokeDasharray="1.5 1.5" />

        {/* Ranking Gradient Vectors */}
        <line x1="23" y1="24" x2="30" y2="20" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
        <line x1="23" y1="28" x2="30" y2="24" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className="font-display font-bold text-base tracking-tight text-white">
              SearchForge
            </span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-surface-elevated text-primary-light border border-primary/30">
              IR
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mt-0.5">
            Information Retrieval Engine
          </span>
        </div>
      )}
    </div>
  );
};
