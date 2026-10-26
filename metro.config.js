// @ts-check
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web 生产包压缩后可能把 expo-modules 的 NativeModule 子类变成匿名类，
// registerWebModule 依赖 constructor.name，会抛 “Module implementation must be a class”（见 expo/expo#33628）。
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_classnames: true,
  keep_fnames: true,
};

module.exports = config;
