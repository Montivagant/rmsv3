import React from 'react';

type HelpLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
};

export default function HelpLink({ href, children, className, ...rest }: HelpLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={['inline-flex items-center gap-1 text-body-sm text-secondary hover:text-primary focus-ring', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
      <svg
        className="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12.293 2.293a1 1 0 011.414 0l4 4a.997.997 0 01.083 1.32l-.083.094-8 8a1 1 0 01-1.32.083l-.094-.083-4-4a1 1 0 011.32-1.497l.094.083L8.586 13 15 6.586V7a1 1 0 01-1.993.117L13 7V4a1 1 0 01.883-.993L14 3h3a1 1 0 010 2h-1.586L9 10.414 5.293 6.707a1 1 0 00-1.32-.083l-.094.083a1 1 0 000 1.414l4 4a3 3 0 004.243 0l8-8a3 3 0 000-4.243l-4-4a1 1 0 00-1.414 1.414l4 4z" />
      </svg>
    </a>
  );
}
