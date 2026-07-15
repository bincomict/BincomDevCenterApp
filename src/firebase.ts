import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Explicit static references so Vite's static define/replacement works perfectly
const viteApiKey = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_API_KEY : undefined;
const viteAuthDomain = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined;
const viteProjectId = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined;
const viteStorageBucket = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
const viteMessagingSenderId = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
const viteAppId = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_APP_ID : undefined;
const viteMeasurementId = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined;
const viteDatabaseId = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_DATABASE_ID : undefined;

// Node environment fallback
const nodeApiKey = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_API_KEY : undefined;
const nodeAuthDomain = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_AUTH_DOMAIN : undefined;
const nodeProjectId = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_PROJECT_ID : undefined;
const nodeStorageBucket = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
const nodeMessagingSenderId = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
const nodeAppId = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_APP_ID : undefined;
const nodeMeasurementId = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_MEASUREMENT_ID : undefined;
const nodeDatabaseId = typeof process !== "undefined" && process.env ? process.env.VITE_FIREBASE_DATABASE_ID : undefined;

const firebaseConfig = {
  apiKey: viteApiKey || nodeApiKey || firebaseAppletConfig.apiKey,
  authDomain: viteAuthDomain || nodeAuthDomain || firebaseAppletConfig.authDomain,
  projectId: viteProjectId || nodeProjectId || firebaseAppletConfig.projectId,
  storageBucket: viteStorageBucket || nodeStorageBucket || firebaseAppletConfig.storageBucket,
  messagingSenderId: viteMessagingSenderId || nodeMessagingSenderId || firebaseAppletConfig.messagingSenderId,
  appId: viteAppId || nodeAppId || firebaseAppletConfig.appId,
  measurementId: viteMeasurementId || nodeMeasurementId || firebaseAppletConfig.measurementId,
};

// We directly target the default database "(default)" as requested, with no need for environment variable fallback
const dbId = viteDatabaseId || nodeDatabaseId || firebaseAppletConfig.firestoreDatabaseId || "(default)";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);

console.log("🔥 Firebase initialized successfully!");
console.log("📍 Project ID in use:", firebaseConfig.projectId);
console.log("🌐 Auth Domain in use:", firebaseConfig.authDomain);
console.log("📦 App ID:", firebaseConfig.appId);
console.log("🗄️ Database ID in use:", dbId);


