import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getDoc, doc, getFirestore } from "firebase/firestore";
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

// Resolve the database ID.
// If there is an explicit named database in firebase-applet-config.json or the environment, we use it.
// We must NEVER pass the string "default" (without parentheses) to initializeFirestore, as this will fail.
// We sanitize any variation of "default" or "(default)" to undefined (which triggers default DB).
function sanitizeDatabaseId(id: any): string | undefined {
  if (!id) return undefined;
  const trimmed = String(id).trim().toLowerCase();
  if (trimmed === "default" || trimmed === "(default)" || trimmed === "") {
    return undefined;
  }
  return String(id).trim();
}

const rawDbId = firebaseAppletConfig.firestoreDatabaseId || viteDatabaseId || nodeDatabaseId;
const dbId = sanitizeDatabaseId(rawDbId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Safe Initialization to avoid HMR multiple-initialization crashes.
function getSafeFirestoreInstance(databaseId: string | undefined) {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, databaseId);
  } catch (e: any) {
    // If already initialized, fetch the existing Firestore instance.
    return getFirestore(app, databaseId);
  }
}

// Keep a reference to the active Firestore instance
let activeDb = getSafeFirestoreInstance(dbId);

// Export db as a Proxy that delegates all property/method access to activeDb.
// This allows us to transparently switch the underlying Firestore instance
// if connectivity verification fails, without breaking existing references.
export const db = new Proxy(activeDb, {
  get(target, prop) {
    const val = (activeDb as any)[prop];
    if (typeof val === "function") {
      return val.bind(activeDb);
    }
    return val;
  },
  set(target, prop, value) {
    (activeDb as any)[prop] = value;
    return true;
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(activeDb);
  },
  has(target, prop) {
    return prop in activeDb;
  }
});

async function verifyConnectivity() {
  try {
    // Try to get a non-existent document to test connectivity
    await getDoc(doc(activeDb, "metadata", "connectivity_test"));
    console.log("✅ Firestore connected successfully to database ID:", dbId || "(default)");
  } catch (err: any) {
    const errMsg = String(err.message || err).toLowerCase();
    console.warn("⚠️ Firestore connectivity failed with:", errMsg);
    
    // Check if the error indicates database not found or does not exist
    if (
      errMsg.includes("not found") || 
      errMsg.includes("database") || 
      errMsg.includes("invalid") || 
      errMsg.includes("failed") ||
      errMsg.includes("does not exist")
    ) {
      // Determine alternative database ID
      // If we tried a named database, fallback to default (undefined).
      // If we tried default (undefined), fallback to the named database.
      const fallbackId = dbId ? undefined : "ai-studio-bincomdevcenterp-bdcf743b-8150-4a11-9909-0482ce129ca9";
      console.log(`🔄 Attempting fallback to database ID: ${fallbackId || "(default)"}...`);
      
      try {
        const fallbackDb = getSafeFirestoreInstance(fallbackId);
        await getDoc(doc(fallbackDb, "metadata", "connectivity_test"));
        activeDb = fallbackDb;
        console.log(`✅ Firestore fallback connected successfully to database ID: ${fallbackId || "(default)"}!`);
      } catch (fallbackErr: any) {
        console.error("❌ Firestore fallback database also failed:", fallbackErr);
      }
    }
  }
}

// Run connectivity check asynchronously on module load
verifyConnectivity();

console.log("🔥 Firebase initialized successfully!");
console.log("📍 Project ID in use:", firebaseConfig.projectId);
console.log("🌐 Auth Domain in use:", firebaseConfig.authDomain);
console.log("📦 App ID:", firebaseConfig.appId);
console.log("🗄️ Database ID in use:", dbId || "(default)");


