// 📁 src/components/layout/AuthLayout.tsx

import { Outlet } from 'react-router-dom';
import { useBranding } from '@/hooks/useBranding';

export const AuthLayout = () => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
