// 📁 src/components/ui/Logo.tsx
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  showIcon?: boolean;  
  whiteBg?: boolean;
}

export const Logo = ({
  variant = 'dark',
  size = 'md',
  className,
  showText = true,
  showIcon = true,  
  whiteBg = false,
}: LogoProps) => {
  const brand = useBranding();

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

  const logoSrc = whiteBg ? brand.logo.whiteBg : brand.logo.icon;
  const textSrc = brand.logo.text;

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {showIcon && (
        <img
          src={logoSrc}
          alt="Santé Plus"
          className={cn('object-contain', sizes[size])}
        />
      )}
      {showText && (
        <img
          src={textSrc}
          alt="Santé Plus Services"
          className={cn('object-contain', textSizes[size])}
          style={{
            filter: variant === 'light' && !whiteBg ? 'brightness(0) invert(1)' : 'none',
          }}
        />
      )}
    </div>
  );
};

export default Logo;
