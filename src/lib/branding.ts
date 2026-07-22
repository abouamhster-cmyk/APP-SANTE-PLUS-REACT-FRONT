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

const COLORS: Record<BrandTheme, BrandColors> = {
  senior: {
    primary: '#2c6e5c',
    primaryDark: '#1a4a3a',
    primaryLight: '#3a8a72',
    secondary: '#e8f0ed',
    secondaryLight: '#f0f5f2',
    background: '#dbede4',  
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
    background: '#ebd2cb', 
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
  aidant: {
    primary: '#1f485c',
    primaryDark: '#112b3a',
    primaryLight: '#346a85',
    secondary: '#eef5f9',
    secondaryLight: '#f3f7fa',
    background: '#d9e6f0', 
    surface: '#ffffff',
    surfaceSoft: '#ebf2f7',
    text: '#102230',
    textLight: '#576d7c',
    border: '#c4d6e4',
    accent: '#346a85',
    gold: '#c9a84c',
    shadow: '0 4px 16px rgba(31, 72, 92, 0.08)',
    shadowHover: '0 8px 32px rgba(31, 72, 92, 0.12)',
    gradient: 'linear-gradient(135deg, #1f485c 0%, #112b3a 100%)',
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
    background: '#e8decb', 
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
    background: '#e8decb', 
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
    logo: LOGOS.admin.icon,
    logoText: LOGOS.admin.text,
    logoWhiteBg: LOGOS.admin.whiteBg,
    banner: '/assets/images/banners/coord-banner.png',
    visitImage: '/assets/images/banners/coord-visit.png',
  },
};

export const isDarkModeActive = (): boolean => {
  try {
    const darkSetting = localStorage.getItem('sante_plus_dark_mode');
    if (darkSetting !== null) return darkSetting === 'true';
    const prefs = localStorage.getItem('sante_plus_preferences');
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (typeof parsed.darkMode === 'boolean') return parsed.darkMode;
    }
    return document.documentElement.classList.contains('dark');
  } catch {
    return false;
  }
};

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
  const isDark = isDarkModeActive();
  const baseColors = COLORS[theme] || COLORS.general;
  const logo = LOGOS[theme] || LOGOS.general;

  // ✅ ADAPTATION DES COULEURS EN MODE SOMBRE (TEXTES BLANCS/BEIGES, MENTHE ÉCLATANTE, JAUNE OR & VIOLET)
  const colors: BrandColors = isDark
    ? {
        ...baseColors,
        primary: '#34d399',        // Vert Menthe ultra lumineux (ultra lisible sur fond sombre)
        primaryDark: '#059669',
        primaryLight: '#6ee7b7',
        secondary: '#fbbf24',      // Jaune Or lumineux
        secondaryLight: '#fde047',
        background: '#0a120e',     // Fond sombre profond
        surface: '#14221b',        // Surface des cartes sombre
        surfaceSoft: '#1e2e26',    // Surface secondaire
        text: '#ffffff',           // BLANC PUR pour tous les titres et textes
        textLight: '#e5e7eb',      // BEIGE/GRIS CLAIR LISIBLE pour sous-titres
        border: '#283c32',         // Bordure sombre lisible
        accent: '#a78bfa',         // Violet lumineux pour les accents
        gold: '#fbbf24',           // Jaune Or
        shadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        shadowHover: '0 8px 32px rgba(0, 0, 0, 0.6)',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      }
    : baseColors;

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
  const isDark = isDarkModeActive();

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  Object.entries(config.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', config.colors.primary);
  }

  localStorage.setItem('sante_plus_theme', config.theme);
  localStorage.setItem('sante_plus_dark_mode', String(isDark));
};

export default {
  getBrandTheme,
  getBrandConfig,
  getBrandConfigByRole,
  applyBrandTheme,
  isDarkModeActive,
  COLORS,
  LOGOS,
};
