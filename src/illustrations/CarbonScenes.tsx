import { palette } from '@/constants/colors';
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

function Frame({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width: '100%',
          height: 160,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function IlloDashboard({ style }: { style?: ViewStyle }) {
  return (
    <Frame style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 360 160">
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.primaryContainer} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.surfaceVariant} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="160" fill="url(#g)" />
        <Circle cx="290" cy="34" r="22" fill="#FFFFFF" opacity="0.55" />
        <Circle cx="320" cy="52" r="10" fill="#FFFFFF" opacity="0.45" />
        <G opacity="0.92">
          <Rect x="22" y="40" width="40" height="92" rx="10" fill="#FFFFFF" opacity="0.65" />
          <Rect x="72" y="58" width="40" height="74" rx="10" fill="#FFFFFF" opacity="0.55" />
          <Rect x="122" y="30" width="40" height="102" rx="10" fill="#FFFFFF" opacity="0.70" />
          <Rect x="172" y="70" width="40" height="62" rx="10" fill="#FFFFFF" opacity="0.50" />
        </G>
        <Path
          d="M246 124c18-2 30-14 36-30 3-8 11-13 20-12 16 2 28 16 27 33-1 19-16 33-34 33H246z"
          fill="#FFFFFF"
          opacity="0.55"
        />
        <Path
          d="M262 120c12-2 20-10 24-21 2-6 7-9 13-8 10 1 18 10 17 22-1 13-10 22-23 22h-31z"
          fill={palette.primary}
          opacity="0.18"
        />
      </Svg>
    </Frame>
  );
}

export function IlloHomestead({ style }: { style?: ViewStyle }) {
  return (
    <Frame style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 360 160">
        <Defs>
          <LinearGradient id="h" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.heroStart} stopOpacity="0.20" />
            <Stop offset="1" stopColor={palette.heroEnd} stopOpacity="0.18" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="160" fill={palette.gardenWarm} />
        <Rect x="0" y="0" width="360" height="160" fill="url(#h)" />
        <Path d="M0 120c54-26 104-28 150-8 46 20 98 20 210-12v60H0v-40z" fill={palette.primaryContainer} opacity="0.8" />
        <G opacity="0.95">
          <Rect x="64" y="96" width="68" height="38" rx="12" fill="#FFFFFF" opacity="0.70" />
          <Rect x="148" y="88" width="68" height="46" rx="12" fill="#FFFFFF" opacity="0.72" />
          <Rect x="232" y="98" width="68" height="36" rx="12" fill="#FFFFFF" opacity="0.68" />
        </G>
        <Path d="M110 94c0-14 12-26 26-26s26 12 26 26c0 0-12-6-26-6s-26 6-26 6z" fill={palette.primary} opacity="0.18" />
        <Path d="M198 84c0-16 13-29 29-29s29 13 29 29c0 0-13-7-29-7s-29 7-29 7z" fill={palette.primary} opacity="0.18" />
        <Path d="M270 98c0-12 10-22 22-22s22 10 22 22c0 0-10-5-22-5s-22 5-22 5z" fill={palette.primary} opacity="0.18" />
      </Svg>
    </Frame>
  );
}

export function IlloSocial({ style }: { style?: ViewStyle }) {
  return (
    <Frame style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 360 160">
        <Defs>
          <LinearGradient id="s" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.primaryContainer} stopOpacity="0.95" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="160" fill="url(#s)" />
        <Circle cx="90" cy="80" r="26" fill="#FFFFFF" opacity="0.75" />
        <Circle cx="186" cy="60" r="18" fill="#FFFFFF" opacity="0.70" />
        <Circle cx="246" cy="92" r="22" fill="#FFFFFF" opacity="0.72" />
        <Path
          d="M120 84c18 10 36 10 54 0"
          stroke={palette.primary}
          strokeWidth="4"
          opacity="0.25"
          strokeLinecap="round"
        />
        <Path
          d="M204 74c14 10 28 10 42 0"
          stroke={palette.secondary}
          strokeWidth="4"
          opacity="0.22"
          strokeLinecap="round"
        />
        <Path
          d="M276 100c16 10 32 10 48 0"
          stroke={palette.primary}
          strokeWidth="4"
          opacity="0.20"
          strokeLinecap="round"
        />
        <Path
          d="M302 54c0 10-8 18-18 18s-18-8-18-18 8-18 18-18 18 8 18 18z"
          fill={palette.primary}
          opacity="0.16"
        />
      </Svg>
    </Frame>
  );
}

