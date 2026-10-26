import { EF_VERSION } from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

export function AppHero({ compact }: { compact?: boolean }) {
  return (
    <LinearGradient
      colors={[palette.heroStart, palette.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        paddingVertical: compact ? 14 : 20,
        paddingHorizontal: 18,
        marginBottom: compact ? 12 : 16,
      }}
    >
      <Text variant={compact ? 'titleMedium' : 'headlineSmall'} style={{ color: palette.heroOn }}>
        {S.appNameZh}
      </Text>
      <Text
        style={{
          marginTop: 8,
          color: palette.heroOnMuted,
          fontSize: compact ? 13 : 14,
          lineHeight: compact ? 18 : 22,
          opacity: 0.95,
        }}
      >
        {S.tagline}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Chip
          compact
          icon="leaf-circle-outline"
          textStyle={{ fontSize: 11 }}
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
        >
          {EF_VERSION}
        </Chip>
      </View>
    </LinearGradient>
  );
}
