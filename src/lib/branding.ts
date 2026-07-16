// 📁 src/lib/branding.ts
// ✅ CONFIGURATION BRANDING : COULEURS MATES ET SOULAGEANTES POUR ÉVITER LA FATIGUE VISUELLE

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
// COULEURS PAR THEME (Ajustées pour le contraste et le soulagement oculaire)
// ============================================================

const COLORS: Record<BrandTheme, BrandColors> = {
  senior: {
    primary: '#1a4a3a',
    primaryDark: '#0d2a22',
    primaryLight: '#2a6a4a',
    secondary: '#c9a84c',
    secondaryLight: '#dcc07a',
    background: '#e8decb', // 🟢 Plus foncé/chaleureux : Beige chaud naturel pour faire flotter les cartes blanches
    surface: '#ffffff',
    surfaceSoft: '#f3eade',
    text: '#2d2d2d',
    textLight: '#5f6661',
    border: '#d9cfbe',
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
    primary: '#db4a6d',
    primaryDark: '#c62850',
    primaryLight: '#f06292',
    secondary: '#fce4ec',
    secondaryLight: '#fdf0f3',
    background: '#ebd2cb', // 🟢 Plus foncé/chaleureux : Rose-argile apaisant et très doux pour la vue
    surface: '#ffffff',
    surfaceSoft: '#f7e6e0',
    text: '#4a2c2c',
    textLight: '#8a6c6c',
    border: '#e4c4bf',
    accent: '#db4a6d',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(219, 74, 109, 0.2)',
    shadowHover: '0 8px 32px rgba(219, 74, 109, 0.3)',
    gradient: 'linear-gradient(135deg, #db4a6d 0%, #c62850 100%)',
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
    background: '#dbede4', // 🟢 Plus foncé/saturé : Sauge douce relaxante pour les intervenants
    surface: '#ffffff',
    surfaceSoft: '#eaf4f0',
    text: '#1a3a2e',
    textLight: '#5f766d',
    border: '#c2dbd4',
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
    background: '#d4e2eb', // 🟢 Plus foncé/saturé : Bleu-ardoise doux
    surface: '#ffffff',
    surfaceSoft: '#e5eef4',
    text: '#1a2a3a',
    textLight: '#5f6f80',
    border: '#b8ced8',
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
    background: '#d4e2eb', // 🟢 Plus foncé/saturé : Bleu-ardoise doux
    surface: '#ffffff',
    surfaceSoft: '#e5eef4',
    text: '#1a2a3a',
    textLight: '#5f6f80',
    border: '#b8ced8',
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
    background: '#e8decb', // 🟢 Plus foncé/saturé : Beige chaud naturel
    surface: '#ffffff',
    surfaceSoft: '#f3eade',
    text: '#2d2d2d',
    textLight: '#6b7280',
    border: '#d9cfbe',
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

export const getBrandConfigByRole = (
  role: string | null,
  patientCategory?: string | null
): BrandConfig => {
  const theme = getBrandTheme(role, patientCategory);
  return getBrandConfig(theme);
};

export const applyBrandTheme = (config: BrandConfig): void => {
  const root = document.documentElement;
  
  Object.entries(config.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', config.colors.primary);
  }
  
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    favicon.setAttribute('href', config.favicon);
  }
  
  root.className = `theme-${config.theme}`;
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
