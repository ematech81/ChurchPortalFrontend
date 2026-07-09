// ─── Change this IP whenever your machine's network address changes ───────────
const DEV_IP = '10.143.112.155';

export const API_BASE_URL = __DEV__
  ? `http://${DEV_IP}:3000/v1`
  : (process.env.EXPO_PUBLIC_API_URL ?? 'https://your-production-api.com/v1');
