import { AppHero } from '@/components/AppHero';
import { ScreenBody } from '@/components/ScreenBody';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { useAuth } from '@/lib/auth';
import { fetchMyProfile, updateMyProfileRemote } from '@/lib/socialApi';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Snackbar, Text, TextInput } from 'react-native-paper';

export default function ProfileEditScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | undefined>();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [intro, setIntro] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchMyProfile();
      setDisplayName(p?.display_name ?? '');
      setBio(p?.bio ?? '');
      setIntro(p?.intro ?? '');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function save() {
    if (!session?.user?.id) {
      setSnack('请先登录');
      return;
    }
    try {
      setSaving(true);
      await updateMyProfileRemote({
        display_name: displayName,
        bio,
        intro,
      });
      setSnack('已保存');
      router.back();
    } catch {
      setSnack('保存失败（检查网络与权限）');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenBody scroll lead={<AppHero compact />}>
      <Text variant="titleLarge" style={{ marginBottom: 8 }}>
        {S.profileEdit}
      </Text>
      <Text style={{ marginBottom: 12, color: '#6D7A74' }}>
        昵称与签名会在小队动态、好友动态等社交场景展示。
      </Text>

      <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 12 }}>
        <Card.Content style={{ gap: 12 }}>
          <TextInput
            mode="outlined"
            label={S.profileNickname}
            value={displayName}
            onChangeText={setDisplayName}
            disabled={loading || saving}
            maxLength={24}
          />
          <TextInput
            mode="outlined"
            label={S.profileBio}
            value={bio}
            onChangeText={setBio}
            disabled={loading || saving}
            maxLength={36}
          />
          <TextInput
            mode="outlined"
            label={S.profileIntro}
            value={intro}
            onChangeText={setIntro}
            disabled={loading || saving}
            multiline
            numberOfLines={4}
            maxLength={180}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              mode="outlined"
              style={{ flex: 1, borderColor: palette.surfaceVariant }}
              onPress={() => router.back()}
              disabled={saving}
            >
              取消
            </Button>
            <Button mode="contained" style={{ flex: 1 }} onPress={() => void save()} loading={saving}>
              保存
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(undefined)} duration={2600}>
        {snack ?? ''}
      </Snackbar>
    </ScreenBody>
  );
}

