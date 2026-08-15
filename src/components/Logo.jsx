import React from 'react';

export default function Logo({ className = "brand-logo-svg" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
            stroke="var(--primary)" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none" 
      />
    </svg>
  );
}
