import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, HelperText, Snackbar, Text, TextInput } from 'react-native-paper';

export default function LoginScreen() {
  const { signInEmailPassword, signUpEmailPassword, sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [snack, setSnack] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  async function submit() {
    setLoading(true);
    setError(undefined);
    if (mode === 'reset') {
      const res = await sendPasswordResetEmail(email);
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSnack('已发送重置邮件（请检查收件箱/垃圾箱）。');
      setMode('login');
      return;
    }

    const res =
      mode === 'signup'
        ? await signUpEmailPassword(email, password)
        : await signInEmailPassword(email, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (mode === 'signup' && (res as { needsEmailConfirm?: boolean }).needsEmailConfirm) {
      setSnack('注册成功，请先到邮箱完成验证后再登录。');
      setMode('login');
      return;
    }
    router.back();
  }

  if (PUBLIC_OFFLINE_DEMO) return <ScreenBody scroll>
    <Text variant="titleLarge">当前公开版仅提供游客体验</Text>
    <Text style={{ marginTop: 12, lineHeight: 24 }}>登录、注册和云端同步未接入。记录保存在当前浏览器，请勿填写真实账号或密码。</Text>
    <Button onPress={() => router.replace('/')}>继续游客体验</Button>
  </ScreenBody>;
  return (
    <ScreenBody scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Text variant="titleLarge" style={{ marginBottom: 10 }}>
          {mode === 'signup' ? '注册' : mode === 'reset' ? '找回密码' : '登录'}
        </Text>
        {!supabaseConfigured ? (
          <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: '#FFF4E5' }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                线上无法登录/注册：未检测到 Supabase 环境变量
              </Text>
              <Text variant="bodySmall" style={{ lineHeight: 20 }}>
                数据库与邮箱认证都在 Supabase 云端，不会随本网站「部署」到 Vercel；前端只需在构建时带上密钥。
                {'\n\n'}
                1. 打开 Vercel → 本项目 → Settings → Environment Variables，添加{' '}
                <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                  EXPO_PUBLIC_SUPABASE_URL
                </Text>{' '}
                与{' '}
                <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                  EXPO_PUBLIC_SUPABASE_ANON_KEY
                </Text>
                （值来自 Supabase 控制台 → Project Settings → API）。
                {'\n'}
                2. 保存后执行一次 Redeploy / 重新部署，再打开本站。
              </Text>
            </Card.Content>
          </Card>
        ) : null}
        <TextInput
          mode="outlined"
          label={S.emailPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel={S.emailPlaceholder}
          style={{ marginBottom: 12 }}
        />
        {mode !== 'reset' ? (
          <TextInput
            mode="outlined"
            label={S.passwordPlaceholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessibilityLabel={S.passwordPlaceholder}
            style={{ marginBottom: 12 }}
          />
        ) : null}
        {supabaseConfigured ? (
          <View>
            <HelperText type="info" padding="none">
              演示账号（需在 Supabase 创建用户并启用邮箱密码登录）：demo@tanapp.com
            </HelperText>
            <HelperText type="info" padding="none" style={{ marginTop: 6 }}>
              验证/重置邮件由 Supabase 发送。若 QQ 邮箱等长期收不到：在 Supabase → Authentication → Providers
              确认已开启 Email；在 SMTP Settings 配置发信服务；在 URL Configuration 将本站在线地址加入 Site URL 与
              Redirect URLs（含 /login）。
            </HelperText>
          </View>
        ) : null}

        <Button
          mode="contained"
          style={{ marginTop: 16 }}
          loading={loading}
          disabled={
            !supabaseConfigured ||
            loading ||
            email.trim().length < 3 ||
            (mode !== 'reset' && password.length < 6)
          }
          onPress={() => void submit()}
          accessibilityLabel="提交登录"
        >
          {mode === 'signup' ? '注册' : mode === 'reset' ? '发送重置邮件' : '登录'}
        </Button>

        <Button
          mode="text"
          onPress={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
          disabled={mode === 'reset'}
        >
          {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
        </Button>

        <Button mode="text" onPress={() => setMode('reset')} disabled={mode === 'reset'}>
          忘记密码
        </Button>

        <Button mode="text" onPress={() => router.back()} accessibilityLabel={S.continueGuest}>
          {S.continueGuest}
        </Button>
      </KeyboardAvoidingView>

      <Snackbar visible={Boolean(error)} onDismiss={() => setError(undefined)} duration={3500}>
        {error ?? ''}
      </Snackbar>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={3500}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}
