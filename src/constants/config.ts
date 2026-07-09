const PROD_API = 'https://churchportalbackend-production.up.railway.app/v1';

export const API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL ?? PROD_API)
  : PROD_API;
