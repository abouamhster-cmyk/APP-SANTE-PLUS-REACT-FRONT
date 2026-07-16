// 📁 src/lib/branding.ts

export type BrandTheme = 'senior' | 'maman' | 'aidant' | 'coordinator' | 'admin' | 'general';

export interface BrandColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  textLight: string;
  border: string;
  accent: string;
  gold: string;
  shadow: string;
  shadowHover: string;
  gradient: string;
  logo: string;
  logoText: string;
  logoWhiteBg: string;
  banner: string;
  visitImage: string;
}

export interface BrandConfig {
  theme: BrandTheme;
  colors: BrandColors;
  logo: {
    icon: string;
    text: string;
    whiteBg: string;
  };
  favicon: string;
  metaThemeColor: string;
  cssVariables: Record<string, string>;
}

// ============================================================
// LOGOS PAR THEME
// ============================================================

const LOGOS = {
  general: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  senior: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  maman: {
    icon: '/assets/images/logos/logo-maman-icon.png',
    text: '/assets/images/logos/logo-maman-text.png',
    whiteBg: '/assets/images/logos/logo-maman-white-bg.jpeg',
  },
  aidant: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  coordinator: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  admin: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
};

// ============================================================
// COULEURS PAR THEME
// ============================================================

const COLORS: Record<BrandTheme, BrandColors> = {
  senior: {
    primary: '#1a4a3a',
    primaryDark: '#0d2a22',
    primaryLight: '#2a6a4a',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    background: '#f5f0e8',
    surface: '#ffffff',
    surfaceSoft: '#faf7f1',
    text: '#2d2d2d',
    textLight: '#6b7280',
    border: '#e5e0d8',
    accent: '#c9a84c',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
    shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
    logo: LOGOS.senior.icon,
    logoText: LOGOS.senior.text,
    logoWhiteBg: LOGOS.senior.whiteBg,
    banner: '/assets/images/banners/senior-banner.png',
    visitImage: '/assets/images/banners/senior-visit.png',
  },
  maman: {
    primary: '#e8b4b8',
    primaryDark: '#d4878a',
    primaryLight: '#f0cccf',
    secondary: '#fce4ec',
    secondaryLight: '#fdf0f3',
    background: '#f8e8e0',
    surface: '#ffffff',
    surfaceSoft: '#fdf5f2',
    text: '#4a2c2c',
    textLight: '#8a6c6c',
    border: '#f0dcdc',
    accent: '#d4878a',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(232, 180, 184, 0.2)',
    shadowHover: '0 8px 32px rgba(232, 180, 184, 0.3)',
    gradient: 'linear-gradient(135deg, #e8b4b8 0%, #d4878a 100%)',
    logo: LOGOS.maman.icon,
    logoText: LOGOS.maman.text,
    logoWhiteBg: LOGOS.maman.whiteBg,
    banner: '/assets/images/banners/maman-banner.png',
    visitImage: '/assets/images/banners/maman-visit.png',
  },
  aidant: {
    primary: '#2c6e5c',
    primaryDark: '#1a4a3a',
    primaryLight: '#3a8a72',
    secondary: '#e8f0ed',
    secondaryLight: '#f0f5f2',
    background: '#f5faf8',
    surface: '#ffffff',
    surfaceSoft: '#f0f7f4',
    text: '#1a3a2e',
    textLight: '#5f766d',
    border: '#dce8e4',
    accent: '#3a8a72',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(44, 110, 92, 0.08)',
    shadowHover: '0 8px 32px rgba(44, 110, 92, 0.12)',
    gradient: 'linear-gradient(135deg, #2c6e5c 0%, #1a4a3a 100%)',
    logo: LOGOS.aidant.icon,
    logoText: LOGOS.aidant.text,
    logoWhiteBg: LOGOS.aidant.whiteBg,
    banner: '/assets/images/banners/aidant-banner.png',
    visitImage: '/assets/images/banners/aidant-visit.png',
  },
  coordinator: {
    primary: '#1a4a3a',
    primaryDark: '#0d2a22',
    primaryLight: '#2a6a4a',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    background: '#f0f4f8',
    surface: '#ffffff',
    surfaceSoft: '#f5f8fb',
    text: '#1a2a3a',
    textLight: '#5f6f80',
    border: '#dce4ec',
    accent: '#c9a84c',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
    shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
    logo: LOGOS.coordinator.icon,
    logoText: LOGOS.coordinator.text,
    logoWhiteBg: LOGOS.coordinator.whiteBg,
    banner: '/assets/images/banners/coord-banner.png',
    visitImage: '/assets/images/banners/coord-visit.png',
  },
  admin: {
    primary: '#1a4a3a',
    primaryDark: '#0d2a22',
    primaryLight: '#2a6a4a',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    background: '#f0f4f8',
    surface: '#ffffff',
    surfaceSoft: '#f5f8fb',
    text: '#1a2a3a',
    textLight: '#5f6f80',
    border: '#dce4ec',
    accent: '#c9a84c',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
    shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
    logo: LOGOS.admin.icon,
    logoText: LOGOS.admin.text,
    logoWhiteBg: LOGOS.admin.whiteBg,
    banner: '/assets/images/banners/coord-banner.png',
    visitImage: '/assets/images/banners/coord-visit.png',
  },
  general: {
    primary: '#1a4a3a',
    primaryDark: '#0d2a22',
    primaryLight: '#2a6a4a',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    background: '#f5f0e8',
    surface: '#ffffff',
    surfaceSoft: '#faf7f1',
    text: '#2d2d2d',
    textLight: '#6b7280',
    border: '#e5e0d8',
    accent: '#c9a84c',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
    shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
    logo: LOGOS.general.icon,
    logoText: LOGOS.general.text,
    logoWhiteBg: LOGOS.general.whiteBg,
    banner: '/assets/images/banners/senior-banner.png',
    visitImage: '/assets/images/banners/senior-visit.png',
  },
};

// ============================================================
// FONCTIONS PRINCIPALES
// ============================================================

/**
 * Détermine le thème à utiliser en fonction du rôle et de la catégorie du patient
 */
export const getBrandTheme = (
  role: string | null,
  patientCategory?: string | null
): BrandTheme => {
  if (role === 'admin') return 'admin';
  if (role === 'coordinator') return 'coordinator';
  if (role === 'aidant') return 'aidant';
  
  if (role === 'family') {
    if (patientCategory === 'maman_bebe') return 'maman';
    return 'senior';
  }
  
  return 'general';
};

/**
 * Récupère la configuration complète du branding pour un thème donné
 */
export const getBrandConfig = (theme: BrandTheme): BrandConfig => {
  const colors = COLORS[theme] || COLORS.general;
  const logo = LOGOS[theme] || LOGOS.general;
  
  return {
    theme,
    colors,
    logo,
    favicon: logo.icon,
    metaThemeColor: colors.primary,
    cssVariables: {
      '--color-primary': colors.primary,
      '--color-primary-dark': colors.primaryDark,
      '--color-primary-light': colors.primaryLight,
      '--color-secondary': colors.secondary,
      '--color-secondary-light': colors.secondaryLight,
      '--color-background': colors.background,
      '--color-surface': colors.surface,
      '--color-surface-soft': colors.surfaceSoft,
      '--color-text': colors.text,
      '--color-text-light': colors.textLight,
      '--color-border': colors.border,
      '--color-accent': colors.accent,
      '--color-gold': colors.gold,
    },
  };
};

/**
 * Récupère la configuration en fonction du rôle et de la catégorie
 */
export const getBrandConfigByRole = (
  role: string | null,
  patientCategory?: string | null
): BrandConfig => {
  const theme = getBrandTheme(role, patientCategory);
  return getBrandConfig(theme);
};

/**
 * Applique le thème au DOM
 */
export const applyBrandTheme = (config: BrandConfig): void => {
  const root = document.documentElement;
  
  // Appliquer les variables CSS
  Object.entries(config.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Appliquer la couleur de la barre de navigation
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', config.colors.primary);
  }
  
  // Appliquer le favicon
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    favicon.setAttribute('href', config.favicon);
  }
  
  // Ajouter la classe de thème
  root.className = `theme-${config.theme}`;
  
  // Sauvegarder le thème actuel
  localStorage.setItem('sante_plus_theme', config.theme);
};

export default {
  getBrandTheme,
  getBrandConfig,
  getBrandConfigByRole,
  applyBrandTheme,
  COLORS,
  LOGOS,
};
