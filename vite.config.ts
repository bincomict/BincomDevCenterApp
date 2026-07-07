import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Load official firebase applet config as fallback
  let firebaseConfigFallback = {} as any;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfigFallback = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load firebase-applet-config.json in vite.config.ts:', err);
  }

  const getFirebaseVar = (key: string, envName: string) => {
    return firebaseConfigFallback[key] || process.env[envName] || env[envName] || "";
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    define: {
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(getFirebaseVar('apiKey', 'VITE_FIREBASE_API_KEY')),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(getFirebaseVar('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN')),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(getFirebaseVar('projectId', 'VITE_FIREBASE_PROJECT_ID')),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(getFirebaseVar('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET')),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(getFirebaseVar('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID')),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(getFirebaseVar('appId', 'VITE_FIREBASE_APP_ID')),
      'process.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(getFirebaseVar('measurementId', 'VITE_FIREBASE_MEASUREMENT_ID')),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(getFirebaseVar('apiKey', 'VITE_FIREBASE_API_KEY')),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(getFirebaseVar('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN')),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(getFirebaseVar('projectId', 'VITE_FIREBASE_PROJECT_ID')),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(getFirebaseVar('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET')),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(getFirebaseVar('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID')),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(getFirebaseVar('appId', 'VITE_FIREBASE_APP_ID')),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(getFirebaseVar('measurementId', 'VITE_FIREBASE_MEASUREMENT_ID')),
    },
  };
});
