// 📁 src/components/theme/ThemeProvider.tsx

import { ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getBrandConfigByRole, applyBrandTheme } from '@/lib/branding';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { role, profile, isAuthenticated } = useAuthStore();
  const previousTheme = useRef<string | null>(null);

  useEffect(() => {
    let config;
    
    if (isAuthenticated && role) {
      // Récupérer le thème en fonction du rôle et de la catégorie
      config = getBrandConfigByRole(role, profile?.patient_category);
    } else {
      // Si non connecté, essayer de restaurer depuis localStorage
      const savedTheme = localStorage.getItem('sante_plus_theme');
      if (savedTheme && savedTheme !== previousTheme.current) {
        // Appliquer le thème sauvegardé
        const themeRole = savedTheme === 'maman' ? 'family' : 'admin';
        const themeCategory = savedTheme === 'maman' ? 'maman_bebe' : null;
        config = getBrandConfigByRole(themeRole, themeCategory);
      } else {
        config = getBrandConfigByRole(null, null);
      }
    }
    
    // Appliquer le thème
    applyBrandTheme(config);
    previousTheme.current = config.theme;
    
    console.log(`🎨 Thème appliqué: ${config.theme} (Rôle: ${role || 'none'}, Catégorie: ${profile?.patient_category || 'none'})`);
  }, [role, profile, isAuthenticated]);

  return <>{children}</>;
};

export default ThemeProvider;
