import { palette } from '@/constants/colors';
import { PUBLIC_OFFLINE_DEMO } from '@/lib/publicDemo';
import { ScreenBody } from '@/components/ScreenBody';
import { AI_KEY_STORAGE, ChatMessage, askAI } from '@/features/ai/service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text, Portal, Modal, Button } from 'react-native-paper';

const QUICK_PROMPTS = [
  '每天骑自行车上班能减少多少碳排放？',
  '家里有哪些节电小技巧？',
  '什么是碳中和？',
  '减少食物浪费对环境有什么影响？',
];

export default function AIScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (PUBLIC_OFFLINE_DEMO) return;
    // 优先从本地存储加载，如果没有则使用 .env 中的默认值
    AsyncStorage.getItem(AI_KEY_STORAGE).then((k) => {
      if (k) {
        setApiKey(k);
      } else if (process.env.EXPO_PUBLIC_AI_API_KEY) {
        setApiKey(process.env.EXPO_PUBLIC_AI_API_KEY);
      }
    });
  }, []);

  async function saveKey() {
    await AsyncStorage.setItem(AI_KEY_STORAGE, keyInput.trim());
    setApiKey(keyInput.trim());
    setShowKeyModal(false);
  }

  async function handleSend(text?: string) {
    const msg = (text ?? inputText).trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }

    const newUserMsg: ChatMessage = { role: 'user', content: msg };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    setInputText('');
    setLoading(true);

    try {
      const response = await askAI(updated, apiKey);
      setMessages([...updated, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages([...updated, {
        role: 'assistant',
        content: `❗ ${error.message ?? '网络异常，请稍后重试'}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={18} color={palette.heroOnMuted} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <MaterialCommunityIcons name="account" size={18} color={palette.heroOnMuted} />
          </View>
        )}
      </View>
    );
  };

  if (PUBLIC_OFFLINE_DEMO) return <ScreenBody scroll>
    <Text variant="titleLarge">远程 AI 未接入</Text>
    <Text style={{ marginTop: 12, lineHeight: 24 }}>公开版提供本地碳估算和科普文章，不生成模型回答，也不收集 API Key。请勿在公开体验中输入真实密钥或私人资料。</Text>
    <Button onPress={() => router.replace('/articles')}>浏览本地科普</Button>
  </ScreenBody>;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>碳派 AI 助手</Text>
          <Text style={styles.headerSub}>由智谱 GLM-4 驱动 · 专注绿色低碳</Text>
        </View>
        <Pressable style={styles.keyBtn} onPress={() => { setKeyInput(apiKey); setShowKeyModal(true); }}>
          <MaterialCommunityIcons
            name={apiKey ? 'key' : 'key-outline'}
            size={20}
            color={apiKey ? palette.primary : palette.outline}
          />
        </Pressable>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.botAvatarLarge}>
            <MaterialCommunityIcons name="robot" size={40} color={palette.heroOnMuted} />
          </View>
          <Text style={styles.emptyTitle}>你好！我是碳派助手 🌿</Text>
          <Text style={styles.emptySub}>
            {apiKey
              ? '有任何关于低碳生活的问题，都可以问我！'
              : '请先点击右上角 🔑 配置智谱 API Key 后开始对话'}
          </Text>
          {/* 快速问题 */}
          {apiKey && (
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((q) => (
                <Pressable
                  key={q}
                  style={styles.quickPromptBtn}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.quickPromptText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!apiKey && (
            <Pressable
              style={styles.setKeyBtn}
              onPress={() => { setKeyInput(''); setShowKeyModal(true); }}
            >
              <MaterialCommunityIcons name="key-plus" size={18} color="#FFF" />
              <Text style={styles.setKeyBtnText}>配置 API Key</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={18} color={palette.heroOnMuted} />
          </View>
          <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
            <ActivityIndicator size="small" color={palette.outline} />
            <Text style={{ color: palette.outline, fontSize: 13, marginLeft: 8 }}>正在思考...</Text>
          </View>
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={apiKey ? '问我关于低碳生活的问题...' : '请先配置 API Key →'}
            placeholderTextColor={palette.outline}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!!apiKey}
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            <MaterialCommunityIcons name="send" size={20} color={inputText.trim() && !loading ? '#FFF' : palette.outline} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* API Key Modal */}
      <Portal>
        <Modal
          visible={showKeyModal}
          onDismiss={() => setShowKeyModal(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <MaterialCommunityIcons name="key" size={22} color={palette.primary} />
            <Text style={styles.modalTitle}>配置智谱 API Key</Text>
          </View>
          <Text style={styles.modalDesc}>
            请前往 https://bigmodel.cn/apikey 获取您的 API Key，并粘贴到下方。
            {'\n\n'}Key 保存在本地设备，不会上传到任何服务器。
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="请粘贴智谱 API Key..."
            placeholderTextColor={palette.outline}
            value={keyInput}
            onChangeText={setKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowKeyModal(false)}
            >
              <Text style={{ color: palette.outline, fontWeight: '500' }}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.modalSaveBtn, !keyInput.trim() && { opacity: 0.5 }]}
              onPress={saveKey}
              disabled={!keyInput.trim()}
            >
              <Text style={{ color: '#FFF', fontWeight: '700' }}>保存</Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.surfaceVariant,
    backgroundColor: palette.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.mintLight,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: palette.onSurface },
  headerSub: { fontSize: 11, color: palette.outline, marginTop: 1 },
  keyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.surfaceContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: palette.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: palette.secondary,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleBot: {
    backgroundColor: palette.surfaceContainerLowest,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  bubbleUser: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: palette.onSurface, lineHeight: 22 },
  bubbleTextUser: { color: '#FFF' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: palette.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: palette.outline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  quickPrompts: { gap: 10, width: '100%' },
  quickPromptBtn: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.surfaceVariant,
  },
  quickPromptText: { fontSize: 14, color: palette.primary, fontWeight: '500' },
  setKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  setKeyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: palette.surface,
    borderTopWidth: 0.5,
    borderTopColor: palette.surfaceVariant,
  },
  input: {
    flex: 1,
    backgroundColor: palette.surfaceContainer,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.onSurface,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: palette.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: palette.surfaceContainer },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    margin: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: palette.onSurface },
  modalDesc: { fontSize: 13, color: palette.outline, lineHeight: 20, marginBottom: 16 },
  modalInput: {
    backgroundColor: palette.surfaceContainer,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: palette.onSurface,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.surfaceContainer,
  },
  modalSaveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
});
