import React from 'react';

type DescriptionProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Description({ children, className }: DescriptionProps) {
  return (
    <p className={['text-body-sm text-tertiary', className].filter(Boolean).join(' ')}>
      {children}
    </p>
  );
}
