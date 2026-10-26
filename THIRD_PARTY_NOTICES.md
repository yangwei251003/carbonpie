# 第三方与素材声明

自有代码/文档按根 MIT；不将依赖、图标字体及第三方素材重新授权。

- assets/fonts/MaterialCommunityIcons.ttf 来自 @expo/vector-icons 所携 Material Design Icons，SHA256 9e94d4dbe2e87ea495f0d42d879146bc74c4c4e910776a49154a15eefa37ef59，与本轮安装包字节一致。[Pictogrammers 官方许可](https://pictogrammers.com/docs/general/license/)：字体/图标Apache2，包装代码MIT。原声明、Apache2全文和包装许可位于 third-party/licenses。
- src/illustrations/CarbonScenes.tsx 是项目 SVG 绘制代码。public-icon.png 与微信Tab图为本轮新增几何图形，不来自素材站。
- 未确认出处的旧应用图和Tab位图不分发。Pixabay、Unsplash 远程图片不随默认公开体验请求或打包；Pixabay适配器默认关闭，个人启用需另行遵守服务/图片条款。素材站列表不是授权证据，原错误的通用MIT描述已移除。
- 随包文章是原型科普/AI样稿，不保证实时更新、政策权威或数字逐项核验。保留来源提示，不冒称官方发布。
- 依赖许可索引与实际文本另存 third-party；只分发必要字体/自有资源，不附带 node_modules、SDK、APK、数据库或私人配置。

Supabase publishable/anon 是客户端公钥，与 service_role/secret 高权钥不同。[官方说明](https://supabase.com/docs/guides/getting-started/api-keys)。本轮均改为使用者自行配置，没有因其曾在本地历史出现便断言高权泄漏。未发现高权限凭据字面量；原Git没有远端，不能证明曾公开发布。

## URI 解码上游兼容包装

vendor/decode-uri-component 保留 Sam Verschueren 的 0.5.1 完整修补算法与 MIT 许可，只将一个 ESM 默认导出声明改为 CommonJS 函数导出。未自行改写解码逻辑；原文、转换结果、精确版本、双 SHA256 和来源均在该目录。该包装修复旧SDK中 query-string 的实际同步调用兼容问题，未来升级SDK后应移除包装直接跟随上游。
