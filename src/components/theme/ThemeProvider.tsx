// 📁 src/components/theme/ThemeProvider.tsx

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { getLogoByRole } from '@/lib/constants';

interface ThemeProviderProps {
  children: ReactNode;
}

// ✅ Clé pour stocker le thème dans localStorage
const THEME_STORAGE_KEY = 'sante_plus_theme';

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { role, profile, isAuthenticated } = useAuthStore();
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Déterminer le thème
    let themeName: string;
    
    if (isAuthenticated && role) {
      // ✅ Si connecté, utiliser le rôle et la catégorie
      themeName = getThemeByRole(role, profile?.patient_category as any);
    } else {
      // ✅ Si non connecté, essayer de restaurer depuis localStorage
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        themeName = savedTheme;
      } else {
        themeName = 'senior';
      }
    }

    // ✅ Sauvegarder le thème actuel
    if (themeName !== currentTheme) {
      setCurrentTheme(themeName);
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    }

    // ✅ Récupérer les couleurs du thème
    const colors = getThemeColors(themeName as any);
    
    // ✅ Récupérer le bon logo selon le rôle
    const logoConfig = getLogoByRole(role, profile?.patient_category);

    // ✅ Appliquer les couleurs CSS
    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-primary-dark', colors.primaryDark);
    document.documentElement.style.setProperty('--color-primary-light', colors.primaryLight || colors.primary);
    document.documentElement.style.setProperty('--color-secondary', colors.secondary);
    document.documentElement.style.setProperty('--color-secondary-light', colors.secondaryLight || colors.secondary);
    document.documentElement.style.setProperty('--color-background', colors.background);
    document.documentElement.style.setProperty('--color-surface', colors.surface);
    document.documentElement.style.setProperty('--color-surface-soft', colors.surfaceSoft || colors.surface);
    document.documentElement.style.setProperty('--color-text', colors.text);
    document.documentElement.style.setProperty('--color-text-light', colors.textLight);
    document.documentElement.style.setProperty('--color-accent', colors.accent);
    document.documentElement.style.setProperty('--color-border', colors.border);
    document.documentElement.style.setProperty('--color-gold', colors.gold);

    // ✅ Changer le favicon selon le rôle
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('href', logoConfig.icon);
    }

    // ✅ Changer la couleur de la barre de navigation mobile
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', colors.primary);
    }

    // ✅ Ajouter la classe de thème
    document.documentElement.className = `theme-${themeName}`;

    // ✅ Ajouter une classe pour le logo
    document.documentElement.classList.add(`theme-${themeName}`);

  }, [role, profile, isAuthenticated, currentTheme]);

  return <>{children}</>;
};

export default ThemeProvider;