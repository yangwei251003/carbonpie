import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import React from 'react';
import { Text } from 'react-native-paper';

export default function PrivacyScreen() {
  return (
    <ScreenBody scroll>
      <Text variant="titleLarge">{S.privacy}</Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        欢迎使用「碳果派」。我们非常重视你的个人信息与隐私保护。本模板文本仅供参赛作品演示与校内评审使用，正式上线前应由法务或指导教师审核修订。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        1. 我们会收集哪些信息：为实现账号登录（邮箱）、云端同步行为记录（若启用 Supabase）、以及可选的海报保存相册权限请求所需的最少信息。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        2. 本地数据：在未登录或使用游客模式时，你的记录默认保存在设备本地数据库（SQLite）；卸载应用可能导致数据丢失，请及时导出备份。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        3. 云端数据：登录后你可选择同步记录至云端数据库；你可以在「我的」中触发同步或删除云端记录（需要在控制台正确配置权限）。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        4. 权限说明：若未来版本加入日历提醒或相机扫码等功能，我们会在使用前弹出权限说明，并允许你在系统设置中关闭授权。
      </Text>
      <Text style={{ marginTop: 14, lineHeight: 24 }}>
        5. 联系我们：你可以在 README 提供的仓库信息与团队成员取得联系。
      </Text>
    </ScreenBody>
  );
}
