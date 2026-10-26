import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import React from 'react';
import { Text } from 'react-native-paper';

export default function TermsScreen() {
  return (
    <ScreenBody scroll>
      <Text variant="titleLarge">{S.terms}</Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        请在使用「碳果派」前阅读本协议（模板）。若你继续使用本应用，即表示你同意下列条款的教育演示版本；正式发布前应替换为经审核的版本。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        1. 服务性质：本应用用于低碳行为记录的估算与教育科普，不构成碳交易、审计或认证结论。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        2. 用户内容：你对填写内容的真实性负责；请勿提交违法或侵害他人权益的信息。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        3. 数据与安全：请妥善保管账号密码；团队建议启用 HTTPS、关闭不必要的数据暴露面（例如不要将 Service Role Key 写入客户端）。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        4. 免责声明：由于电网结构与个体场景差异，估算结果可能与实际情况存在偏差。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        5. 协议变更：赛事演示阶段可能更新文案；你可以在「关于」页查看最新因子版本说明。
      </Text>
    </ScreenBody>
  );
}
