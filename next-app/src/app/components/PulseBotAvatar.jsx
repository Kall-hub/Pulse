"use client";

// Simple SVG bot avatar that can be used across components
const PulseBotAvatar = ({ size = 48, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Head */}
      <rect x="8" y="8" width="32" height="28" rx="6" fill="#1E40AF" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Eyes */}
      <circle cx="16" cy="18" r="3" fill="#BFDBFE" />
      <circle cx="32" cy="18" r="3" fill="#BFDBFE" />
      
      {/* Mouth (happy) */}
      <path d="M 16 26 Q 24 30 32 26" stroke="#BFDBFE" strokeWidth="2" strokeLinecap="round" fill="none" />
      
      {/* Antenna */}
      <line x1="24" y1="8" x2="24" y2="2" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="1" r="2" fill="#3B82F6" />
      
      {/* Body */}
      <rect x="10" y="36" width="28" height="8" rx="4" fill="#1E40AF" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Pulsing indicator */}
      <circle cx="24" cy="40" r="2" fill="#60A5FA" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
    </svg>
  );
};

export default PulseBotAvatar;
