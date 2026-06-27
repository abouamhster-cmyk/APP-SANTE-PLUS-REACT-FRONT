// 📁 src/components/layout/AuthLayout.tsx

import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-[var(--color-background)]">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
