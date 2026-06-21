// 📁 src/components/layout/AuthLayout.tsx

import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-6 md:py-10">
        {/* ✅ SUPPRIMER LE LOGO CENTRAL - il est déjà dans chaque page */}
        
        {/* Contenu avec animation d'entrée */}
        <div className="transition-all duration-500">
          <Outlet />
        </div>

        {/* Footer minimal */}
        <div className="text-center mt-8 md:mt-12">
          <p className="text-xs" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            Santé Plus Services — Un service d'accompagnement non médical
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;