/**
 * Environment configuration helper
 * Determines if the app is running in development mode
 * (letto da NEXT_PUBLIC_DEV_MODE in .env.development / .env.production)
 */
export const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
