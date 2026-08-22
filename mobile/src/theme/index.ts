export const theme = {
  colors: {
    primary: '#9333ea', // Purple
    primaryLight: '#a855f7',
    primaryDark: '#7e22ce',
    accent: '#ec4899', // Pink
    background: '#0f0f12', // Dark Mode background
    cardBackground: '#17171c',
    surface: '#202026',
    border: '#272730',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 24, fontWeight: '700' as const, color: '#ffffff' },
    h2: { fontSize: 20, fontWeight: '700' as const, color: '#ffffff' },
    h3: { fontSize: 16, fontWeight: '600' as const, color: '#ffffff' },
    body: { fontSize: 14, color: '#ffffff' },
    bodySecondary: { fontSize: 13, color: '#9ca3af' },
    caption: { fontSize: 11, color: '#6b7280' },
  },
};
