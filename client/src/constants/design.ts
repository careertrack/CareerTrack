import { Platform } from 'react-native';

export const COLORS = {
  primary: '#2E5BFF',
  primaryLight: '#EEF2FF',
  primaryDark: '#1A3FCC',
  white: '#FFFFFF',
  background: '#F8F9FF',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderSelected: '#2E5BFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradeBad: '#EF4444',
  gradeOk: '#F59E0B',
  gradeGood: '#10B981',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = envApiBaseUrl || (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');
