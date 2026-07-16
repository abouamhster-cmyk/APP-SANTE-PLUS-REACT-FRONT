// 📁 src/components/ui/Illustration.tsx

import { ReactNode } from 'react';
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

interface IllustrationProps {
  type: 'empty' | 'success' | 'error' | 'warning' | 'info' | 'calendar' | 'users' | 'search' | 'visit' | 'order' | 'message' | 'payment' | 'patient' | 'doctor' | 'home';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

// ✅ TAILLES
const SIZE_MAP = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24',
};

// ✅ COULEURS PAR DÉFAUT
const DEFAULT_COLORS = {
  empty: '#D1D5DB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  calendar: '#6B7280',
  users: '#6B7280',
  search: '#6B7280',
  visit: '#6B7280',
  order: '#6B7280',
  message: '#6B7280',
  payment: '#6B7280',
  patient: '#6B7280',
  doctor: '#6B7280',
  home: '#6B7280',
};

// ✅ ILLUSTRATIONS
const ILLUSTRATIONS: Record<string, (color: string) => ReactNode> = {
  empty: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="32" stroke={color} strokeWidth="1.5" opacity="0.3"/>
      <path d="M28 28L52 52M52 28L28 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <circle cx="40" cy="40" r="8" stroke={color} strokeWidth="1.5" opacity="0.3"/>
    </svg>
  ),
  success: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="32" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="2"/>
      <path d="M28 40L36 48L52 32" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="32" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="2"/>
      <path d="M32 32L48 48M48 32L32 48" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  warning: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="32" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="2"/>
      <path d="M40 28V44M40 52V54" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  info: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="32" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="2"/>
      <path d="M40 36V52M40 28V30" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  calendar: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="24" width="48" height="40" rx="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M16 32H64" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M28 16V24M52 16V24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <rect x="32" y="38" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
      <rect x="38" y="38" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
      <rect x="44" y="38" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
      <rect x="32" y="44" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
      <rect x="38" y="44" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
      <rect x="44" y="44" width="4" height="4" rx="1" fill={color} opacity="0.2"/>
    </svg>
  ),
  users: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="28" r="8" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M16 52C16 44 20 38 32 38C44 38 48 44 48 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="52" cy="32" r="6" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M46 52C46 46 48 42 52 42C56 42 58 46 58 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  search: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="34" cy="34" r="16" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M46 46L60 60" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  visit: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="24" width="48" height="40" rx="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <circle cx="40" cy="40" r="6" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M16 34H64" stroke={color} strokeWidth="1.5" opacity="0.4"/>
    </svg>
  ),
  order: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="16" width="40" height="48" rx="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M28 28H52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M28 38H44" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M28 48H36" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  message: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="24" width="56" height="32" rx="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M28 56L20 64" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="32" cy="40" r="3" fill={color} opacity="0.2"/>
      <circle cx="40" cy="40" r="3" fill={color} opacity="0.2"/>
      <circle cx="48" cy="40" r="3" fill={color} opacity="0.2"/>
    </svg>
  ),
  payment: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="28" width="56" height="32" rx="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <circle cx="56" cy="44" r="4" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M12 36H68" stroke={color} strokeWidth="1.5" opacity="0.4"/>
    </svg>
  ),
  patient: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="28" r="8" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M24 52C24 44 28 38 40 38C52 38 56 44 56 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="40" cy="46" r="12" stroke={color} strokeWidth="1.5" opacity="0.15"/>
      <path d="M40 42V50M36 46H44" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
    </svg>
  ),
  doctor: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="28" r="8" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M24 52C24 44 28 38 40 38C52 38 56 44 56 52" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <rect x="34" y="42" width="12" height="12" rx="2" stroke={color} strokeWidth="1.5" opacity="0.15"/>
      <path d="M40 44V52M36 48H44" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
    </svg>
  ),
  home: (color) => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 40L40 20L64 40" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      <rect x="28" y="32" width="24" height="28" rx="2" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <rect x="36" y="44" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" opacity="0.4"/>
    </svg>
  ),
};

export const Illustration = ({ 
  type, 
  size = 'md', 
  className,
  color 
}: IllustrationProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  
  const finalColor = color || DEFAULT_COLORS[type] || colors.primary;
  const IllustrationComponent = ILLUSTRATIONS[type];
  
  if (!IllustrationComponent) {
    return null;
  }

  return (
    <div className={cn(SIZE_MAP[size], 'flex items-center justify-center', className)}>
      {IllustrationComponent(finalColor)}
    </div>
  );
};

export default Illustration;
