import { Stack } from 'expo-router';
import React from 'react';

export default function LogStackLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: '记录' }} />
      <Stack.Screen name="[type]" options={{ title: '填写记录' }} />
    </Stack>
  );
}
