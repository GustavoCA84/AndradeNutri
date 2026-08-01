import React from 'react';

export default function Logo() {
  return (
    <svg 
      className="brand-logo-svg" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Premium Sprout / Leaf & Shield Shape */}
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59l-3.29-3.29 1.41-1.41L11 14.77l5.88-5.88 1.41 1.41L11 17.59z" fill="none" />
      <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 7.83l7.03 9.78C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9zm0 14.5l-4.5-6.25h9L12 17.5z" />
    </svg>
  );
}
