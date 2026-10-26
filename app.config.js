module.exports = ({ config }) => ({
  ...config,
  web: { ...config.web, output: 'single' },
  experiments: { ...config.experiments, ...(process.env.EXPO_PUBLIC_BASE_URL ? { baseUrl: process.env.EXPO_PUBLIC_BASE_URL } : {}) },
});
