import { palette } from '@/constants/colors';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from 'react-native';

export function ScreenBody({
  children,
  scroll,
  scrollProps,
  lead,
}: PropsWithChildren<{
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  lead?: ReactNode;
}>) {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(1120, Math.max(360, width));

  const inner = (
    <View style={{ flex: 1, width: '100%', maxWidth, alignSelf: 'center' }}>
      {lead}
      {children}
    </View>
  );

  if (scroll) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: palette.surface,
        }}
        {...scrollProps}
      >
        {inner}
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: palette.surface,
        alignItems: 'center',
      }}
    >
      {inner}
    </View>
  );
}
