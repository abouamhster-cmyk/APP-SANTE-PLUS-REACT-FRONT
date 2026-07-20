// 📁 src/components/theme/ThemeProvider.tsx
 
import { ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getBrandConfigByRole, getBrandConfig, getBrandTheme, applyBrandTheme } from '@/lib/branding';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { role, profile, isAuthenticated } = useAuthStore();
  const previousTheme = useRef<string | null>(null);

  useEffect(() => {
    let config;
    
    // 1️⃣ CAS : UTILISATEUR CONNECTÉ [24]
    if (isAuthenticated && role) {
      const theme = getBrandTheme(role, profile?.patient_category);
      
      // ✅ SEULE la catégorie "Maman & Bébé" déclenche l'affichage en Rose [24].
      // Tous les autres rôles (Seniors, Aidants, Admins, Coordonnateurs) restent Vert forêt par défaut [23, 24].
      if (theme === 'maman') {
        config = getBrandConfig('maman');
      } else {
        config = getBrandConfig('senior'); // Vert forêt officiel de la marque [23, 24]
      }
    } 
    // 2️⃣ CAS : UTILISATEUR DÉCONNECTÉ (Connexion, Register, Réinitialisation) [24]
    else {
      // Regarder si le navigateur a gardé en mémoire le thème de la maman [24]
      const savedTheme = localStorage.getItem('sante_plus_theme');
      
      if (savedTheme === 'maman') {
        config = getBrandConfig('maman'); // Conserver le rose pour la maman connectée précédemment [24]
      } else {
        config = getBrandConfig('senior'); // ✅ PAR DÉFAUT : Vert forêt officiel pour TOUT le monde sans clignotement [23, 24]
      }
    }
    
    // Appliquer le thème en base de données
    applyBrandTheme(config);
    previousTheme.current = config.theme;
    
    console.log(`🎨 [Theme Engine] Thème appliqué: ${config.theme} (Rôle: ${role || 'none'}, Catégorie: ${profile?.patient_category || 'none'})`);
  }, [role, profile, isAuthenticated]);

  return <>{children}</>;
};

export default ThemeProvider;
