import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabsLayout() {
  const compact = useWindowDimensions().width < 600;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        // 与宽屏一致：图标与中文标题同一行，避免窄屏下图标在上、文字在下时被固定 tabBar 高度裁切（Web 上常见「只有图标」）
        tabBarLabelPosition: compact ? 'below-icon' : 'beside-icon',
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.outline,
        tabBarStyle: {
          backgroundColor: palette.surfaceContainerLowest,
          borderTopColor: palette.surfaceVariant,
          borderTopWidth: 0.5,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          minHeight: Platform.OS === 'ios' ? 80 : compact ? 70 : 56,
          height: Platform.OS === 'ios' ? 80 : compact ? 76 : 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: compact ? 11 : 12,
          lineHeight: compact ? 15 : 18,
          fontWeight: '500',
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: compact ? 4 : 6,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarAccessibilityLabel: '首页',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home-variant' : 'home-variant-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '记录',
          tabBarAccessibilityLabel: '记录低碳行为',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'plus-circle' : 'plus-circle-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="articles"
        options={{
          title: '发现',
          tabBarAccessibilityLabel: '发现科普与社区',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'compass' : 'compass-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="grow"
        options={{
          title: '家园',
          tabBarAccessibilityLabel: '我的家园',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'sprout' : 'sprout-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarAccessibilityLabel: '我的主页',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-circle' : 'account-circle-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* AI tab - hidden from main nav, accessible from profile or FAB */}
      <Tabs.Screen
        name="ai"
        options={{
          href: null, // hidden from tab bar
        }}
      />
    </Tabs>
  );
}
