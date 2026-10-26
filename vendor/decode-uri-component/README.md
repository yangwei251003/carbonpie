# 上游解码器 CommonJS 兼容包装

保留 Sam Verschueren 的 decode-uri-component 0.5.1 完整上游算法及 MIT 许可。只将默认导出改为 CommonJS 函数导出，以适配 Expo SDK52 中历史 query-string 的同步 require 调用。没有自行改写解码算法。

upstream-index.mjs 是原包字节；index.cjs 只做 PROVENANCE.json 所列的一处导出替换，双哈希可核对。未来迁移 SDK 后应移除该兼容包装，直接使用维护中的上游包。
