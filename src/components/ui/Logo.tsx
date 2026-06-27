// 📁 src/components/ui/Logo.tsx
 
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/stores/authStore';
import { getLogoByRole } from '@/lib/constants';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  role?: 'senior' | 'maman' | 'aidant' | 'coordinator' | 'general';
  whiteBg?: boolean;
  forceRole?: 'family' | 'aidant' | 'coordinator' | 'admin' | null;
  forceCategory?: 'senior' | 'maman_bebe' | null;
}

export const Logo = ({ 
  variant = 'dark', 
  size = 'md', 
  className,
  showText = true,
  role = 'general',
  whiteBg = false,
  forceRole,
  forceCategory,
}: LogoProps) => {
  const { role: userRole, profile } = useAuthStore();
  
  const activeRole = forceRole || userRole;
  const activeCategory = forceCategory || profile?.patient_category;

  let logoConfig;
  
  if (activeRole === 'family' && activeCategory === 'maman_bebe') {
    logoConfig = getLogoByRole('family', 'maman_bebe');
  } else if (activeRole === 'aidant') {
    logoConfig = getLogoByRole('aidant', null);
  } else if (activeRole === 'coordinator' || activeRole === 'admin') {
    logoConfig = getLogoByRole('coordinator', null);
  } else {
    logoConfig = getLogoByRole(null, null);
  }

  if (role === 'maman') {
    logoConfig = getLogoByRole('family', 'maman_bebe');
  } else if (role === 'aidant') {
    logoConfig = getLogoByRole('aidant', null);
  } else if (role === 'coordinator') {
    logoConfig = getLogoByRole('coordinator', null);
  }

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-10',
  };

  const logoSrc = whiteBg ? logoConfig.whiteBg : logoConfig.icon;
  const textSrc = logoConfig.text;

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <img 
        src={logoSrc} 
        alt="Santé Plus" 
        className={cn('object-contain', sizes[size])}
      />
      {showText && (
        <img 
          src={textSrc} 
          alt="Santé Plus Services" 
          className={cn('object-contain', textSizes[size])}
          style={{ 
            filter: variant === 'light' && !whiteBg ? 'brightness(0) invert(1)' : 'none'
          }}
        />
      )}
    </div>
  );
};

// ✅ Export default pour compatibilité avec l'import dans index.ts
export default Logo;
