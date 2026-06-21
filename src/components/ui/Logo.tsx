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
  
  // ✅ Déterminer le rôle pour le logo
  const activeRole = forceRole || userRole;
  const activeCategory = forceCategory || profile?.patient_category;

  // ✅ Sélectionner le bon logo selon le rôle
  let logoConfig;
  
  // Si c'est Maman (famille + catégorie maman_bebe)
  if (activeRole === 'family' && activeCategory === 'maman_bebe') {
    logoConfig = getLogoByRole('family', 'maman_bebe');
  } 
  // Si c'est un aidant
  else if (activeRole === 'aidant') {
    logoConfig = getLogoByRole('aidant', null);
  }
  // Si c'est un coordinateur ou admin
  else if (activeRole === 'coordinator' || activeRole === 'admin') {
    logoConfig = getLogoByRole('coordinator', null);
  }
  // Par défaut (senior ou général)
  else {
    logoConfig = getLogoByRole(null, null);
  }

  // Surcharge manuelle si spécifié
  if (role === 'maman') {
    logoConfig = getLogoByRole('family', 'maman_bebe');
  } else if (role === 'aidant') {
    logoConfig = getLogoByRole('aidant', null);
  } else if (role === 'coordinator') {
    logoConfig = getLogoByRole('coordinator', null);
  }

  // =============================================
  // TAILLES
  // =============================================
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

  // =============================================
  // SÉLECTIONNER L'IMAGE
  // =============================================
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