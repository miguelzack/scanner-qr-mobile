export const AppColors = {
  light: {
    background: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceMuted: '#ECEEF5',
    text: '#171821',
    textMuted: '#666C7C',
    border: '#E1E4ED',
    primary: '#6D5CE7',
    primarySoft: '#E8E4FF',
    accent: '#20B997',
    accentSoft: '#DDF7F0',
    danger: '#D94C57',
    dangerSoft: '#FCE7E9',
    warning: '#A56705',
    warningSoft: '#FFF3D6',
  },
  dark: {
    background: '#0C0E13',
    surface: '#171A22',
    surfaceMuted: '#222632',
    text: '#F7F8FC',
    textMuted: '#A3A9B8',
    border: '#2B303D',
    primary: '#8E80FF',
    primarySoft: '#292447',
    accent: '#42D6B4',
    accentSoft: '#173C35',
    danger: '#FF7D86',
    dangerSoft: '#442228',
    warning: '#F3BA54',
    warningSoft: '#44351D',
  },
} as const;

export type AppTheme = keyof typeof AppColors;

export function getAppColors(theme: AppTheme) {
  return AppColors[theme];
}
