export const Colors = {
  // Brand colors
  green900: '#1E4010',
  green700: '#2D5C1A',
  green500: '#3A7A1A',
  lime: '#C8E632',
  offWhite: '#F8F8F5',

  // Semantic colors
  success: '#2A7038',
  danger: '#C13030',
  warning: '#B86A00',
  info: '#1A4F8A',
  kakaoYellow: '#FFEB00',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F8F8F5',
  gray100: '#E8E8E2',
  gray300: '#C0C0B8',
  gray500: '#8A8A82',
  gray700: '#4A4A44',
  gray900: '#1A1A17',

  // Badge backgrounds
  pendingBg: '#FFF0D4',
  pendingText: '#8A4800',
  paymentBg: '#FFFCE0',
  paymentText: '#7A5000',
  confirmedBg: '#DFF4EC',
  confirmedText: '#0A6647',
  waitingBg: '#EDE9FF',
  waitingText: '#3D28B0',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  tag: 4,
  button: 8,
  card: 10,
  modal: 14,
  badge: 20,
  full: 9999,
} as const;

export const FontSize = {
  display: 30,
  h1: 20,
  h2: 16,
  body1: 15,
  body2: 13,
  caption: 11,
  label: 10,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
