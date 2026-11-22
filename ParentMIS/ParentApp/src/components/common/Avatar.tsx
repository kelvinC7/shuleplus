import React from 'react';
import { Child } from '../../types';

interface AvatarProps {
  child: Child;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ child, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-[13px]',
    lg: 'w-14 h-14 text-[16px]',
    xl: 'w-20 h-20 text-[22px]',
  };

  const getTheme = (id: string) => {
    switch (id) {
      case 'keza':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          initials: 'KI',
        };
      case 'diane':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          initials: 'DU',
        };
      case 'teta':
        return {
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          initials: 'TI',
        };
      default:
        return {
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          initials: child.first.slice(0, 2).toUpperCase(),
        };
    }
  };

  const theme = getTheme(child.id);

  return (
    <div
      className={`rounded-2xl flex items-center justify-center font-extrabold border shadow-sm select-none flex-shrink-0 ${theme.bg} ${sizeClasses[size]} ${className}`}
    >
      {theme.initials}
    </div>
  );
};
