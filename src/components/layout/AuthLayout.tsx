// 📁 src/components/layout/AuthLayout.tsx

import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* ✅ Supprimer le padding vertical excessif */}
      <div className="flex-1 container mx-auto px-4 py-4 sm:py-6">
        <Outlet />
      </div>

      {/* Footer minimal */}
      <div className="text-center pb-1">
        <p className="text-xs" style={{ color: 'var(--color-text-light, #6b7280)' }}>
          Santé Plus Services — Un service d'accompagnement non médical
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
