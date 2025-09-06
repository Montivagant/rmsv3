import React from 'react';

interface NavIconProps {
  path: string;
  className?: string;
}

export const NavIcon: React.FC<NavIconProps> = ({ path, className = "w-5 h-5" }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={path}
      />
    </svg>
  );
};

export default NavIcon;
