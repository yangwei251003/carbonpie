import { palette } from '@/constants/colors';
import {
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 24,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    primaryContainer: palette.primaryContainer,
    secondary: palette.secondary,
    background: palette.surface,
    surface: '#FFFFFF',
    surfaceVariant: palette.surfaceVariant,
    outline: palette.outline,
    error: palette.error,
    onPrimary: '#FFFFFF',
    onSurface: '#1B1C1A',
    elevation: MD3LightTheme.colors.elevation,
  },
};
