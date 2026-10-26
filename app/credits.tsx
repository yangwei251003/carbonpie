import { ScreenBody } from '@/components/ScreenBody';
import React from 'react';
import { Linking } from 'react-native';
import { Button, Text } from 'react-native-paper';
export default function CreditsScreen() {
  return <ScreenBody scroll>
    <Text variant="titleLarge">素材与许可</Text>
    <Text style={{ marginTop: 12, lineHeight: 24 }}>界面场景由项目中的 SVG 代码绘制；公开图标为本次新增的几何示意图。Material Design Icons 字体与图标保留 Pictogrammers 的 Apache 2.0 许可。</Text>
    <Text style={{ marginTop: 12, lineHeight: 24 }}>公开演示不请求外部图片。Pixabay 只是默认关闭的可选图片适配器，启用时需自行配置并遵守其服务与图片使用条款。没有把素材站清单误当成已获授权的素材。</Text>
    <Button onPress={() => void Linking.openURL('https://pictogrammers.com/docs/general/license/')}>查看图标上游许可</Button>
  </ScreenBody>;
}
