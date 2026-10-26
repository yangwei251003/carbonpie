import {
  EF_VERSION,
  GRID_EF_KG_CO2E_PER_KWH,
  METHODOLOGY_LINK,
} from '@/constants/carbon';
import { palette } from '@/constants/colors';
import { S } from '@/constants/strings';
import { ScreenBody } from '@/components/ScreenBody';
import { Linking } from 'react-native';
import React from 'react';
import { Button, Divider, Text } from 'react-native-paper';

export default function AboutScreen() {
  return (
    <ScreenBody scroll>
      <Text variant="titleLarge">{S.about}</Text>
      <Text style={{ marginTop: 12, lineHeight: 24 }}>
        「碳果派」默认面向中国大陆场景：用电相关的折算采用全国电力平均碳足迹因子（随生态环境部公告更新）。出行对比基准为单人驾乘汽油乘用车假设。
      </Text>

      <Divider style={{ marginVertical: 18 }} />

      <Text variant="titleMedium">因子版本</Text>
      <Text style={{ marginTop: 8 }}>{EF_VERSION}</Text>
      <Text style={{ marginTop: 8 }}>
        电网足迹因子默认值：{GRID_EF_KG_CO2E_PER_KWH} kg CO₂e/kWh
      </Text>

      <Divider style={{ marginVertical: 18 }} />

      <Text variant="titleMedium">主管部门公告链接（外链）</Text>
      <Text style={{ marginTop: 10, color: palette.estimate }}>
        请在答辩材料中附上你可核验的公告 PDF / 网页存档。
      </Text>
      <Button
        mode="contained-tonal"
        style={{ marginTop: 14 }}
        onPress={() => void Linking.openURL(METHODOLOGY_LINK)}
        accessibilityLabel="打开生态环境部链接"
      >
        打开公告页面（浏览器）
      </Button>

      <Divider style={{ marginVertical: 18 }} />

      <Text variant="titleMedium">{S.tagline}</Text>
      <Text style={{ marginTop: 10, lineHeight: 24 }}>
        {S.dashboardSubtitle}
      </Text>
    </ScreenBody>
  );
}
