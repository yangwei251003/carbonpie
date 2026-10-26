# 依赖与安全状态 · 2026-10-26

当前 npm audit 为 **36 项：critical 0 / high 20 / moderate 15 / low 1**。不宣称安全扫描全清零。

原安装报告58项（2 critical）。本轮保留Expo SDK52/ReactNative0.76兼容线，更新Expo52.0.49与正常兼容依赖，分离账户相关EAS CLI；固定tar7.5.22、shell-quote1.12.0、PostCSS8.5.31、source-map-js1.2.2，修复对应已知问题。未使用会将Expo降到44或把原生SDK直接升至58的强制audit修复建议。

浏览器实际包含的旧 decode-uri-component 有[畸形编码耗时问题](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)，已采用官方0.5.1修补算法。其ESM包直接替换后在历史Node query-string调用中实测报 TypeError，因此仅生成导出格式兼容包装；见 vendor/decode-uri-component/PROVENANCE.json 与原MIT许可。实际 CommonJS Unicode 查询、45k畸形编码的独立进程限时测试，以及真实Web全部流程均通过，不是只改版本号。

剩余报告集中于旧工具链：node-forge证书/ASN.1处理、xmldom/XML解析、Babel输入编译、glob/brace-expansion、开发服务压缩/HTTP/WebSocket等，以及上层Expo/RN包继承的告警。逐条公告URL、影响范围、安装位置见 security-status.json。native预构建、证书签名和任意外来模板处理没有验收，不应把此历史SDK作为生产多用户服务直接放开。

本轮导出1581条源码映射记录，得到94个包的实际浏览器来源。将剩余的直接公告包与这些模块来源比对，没有发现直接公告包被打入此静态Web包；上层Expo等包仍有继承告警，不能据此称整个SDK无风险。映射文件已从公开成品删除，只保存包名索引作为证据。

公开Pages没有Node服务进程，默认不接账号/模型/位置，不接受远程源代码编译。README开发命令绑定localhost；未来真实移动/后端上线必须独立升级兼容、审计和验收。源码归档与可体验的离线Web是本轮范围。
