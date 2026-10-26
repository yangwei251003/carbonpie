import 'react-native-gesture-handler';

import { AuthProvider } from '@/lib/auth';
import { useFonts } from 'expo-font';
import { paperTheme } from '@/theme/paperTheme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** Web export places vector-icon fonts under `assets/node_modules/...`; Vercel omits that path, so icons 404. Load the same TTF from app assets so Metro emits a stable `/assets/...` URL. */
const MATERIAL_COMMUNITY_ICONS = {
  'material-community': require('../assets/fonts/MaterialCommunityIcons.ttf'),
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts(MATERIAL_COMMUNITY_ICONS);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F2' }}>
        <ActivityIndicator size="large" color="#134234" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <AuthProvider>
            <StatusBar style="dark" />
            {PUBLIC_OFFLINE_DEMO && <Text style={{ padding: 10, backgroundColor: '#e8efdc', color: '#134234', textAlign: 'center', fontSize: 12 }}>公开离线演示 · 数据仅存本机 · 不接入真实账号、定位或 AI · 碳币为虚拟玩法</Text>}
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="article/[slug]" options={{ title: '科普' }} />
              <Stack.Screen name="circle-feed" options={{ title: '小队动态' }} />
              <Stack.Screen name="friends" options={{ title: '好友' }} />
              <Stack.Screen name="profile-edit" options={{ title: '编辑资料' }} />
              <Stack.Screen name="share-week" options={{ title: '周报海报' }} />
              <Stack.Screen name="photo-checkin" options={{ title: '拍照打卡', headerShown: false }} />
              <Stack.Screen name="photo-album" options={{ title: '打卡影像册', headerShown: false }} />
              <Stack.Screen name="photo-review/[id]" options={{ title: 'AI 识图复看', headerShown: false }} />
              <Stack.Screen name="login" options={{ title: '登录' }} />
              <Stack.Screen name="privacy" options={{ title: '隐私政策' }} />
              <Stack.Screen name="terms" options={{ title: '用户协议' }} />
              <Stack.Screen name="about" options={{ title: '关于与方法学' }} />
              <Stack.Screen name="credits" options={{ title: '素材致谢' }} />
            </Stack>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
