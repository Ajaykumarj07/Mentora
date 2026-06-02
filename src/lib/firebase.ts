import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import firebaseConfig from "../firebase-applet-config.json";

// Centralized Config mapping
const metaEnv = (import.meta as any).env || {};

// Check if we are running in mock/fallback due to empty keys
const defaultApiKey = firebaseConfig.apiKey || "";
const isDraftOrMock = defaultApiKey.includes("MOCK_API_KEY") || !defaultApiKey || defaultApiKey === "YOUR_NEW_API_KEY";

export const finalConfig = {
  apiKey: isDraftOrMock ? (metaEnv.VITE_FIREBASE_API_KEY || defaultApiKey) : defaultApiKey,
  authDomain: isDraftOrMock ? (metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain) : firebaseConfig.authDomain,
  projectId: isDraftOrMock ? (metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId) : firebaseConfig.projectId,
  storageBucket: isDraftOrMock ? (metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket) : firebaseConfig.storageBucket,
  messagingSenderId: isDraftOrMock ? (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId) : firebaseConfig.messagingSenderId,
  appId: isDraftOrMock ? (metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId) : firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId || "",
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || ""
};

export let isMockFirebase = finalConfig.apiKey.includes("MOCK_API_KEY") || !finalConfig.apiKey || finalConfig.apiKey === "YOUR_NEW_API_KEY";

let onMockFallbackCallback: (() => void) | null = null;

export function registerMockFallback(cb: () => void) {
  onMockFallbackCallback = cb;
  if (isMockFirebase) {
    cb();
  }
}

// Singleton Initialization Pattern
let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let analyticsInstance: Analytics | null = null;

try {
  if (getApps().length === 0) {
    appInstance = initializeApp(finalConfig);
  } else {
    appInstance = getApp();
  }
  
  if (finalConfig.firestoreDatabaseId) {
    dbInstance = getFirestore(appInstance, finalConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(appInstance);
  }
  
  authInstance = getAuth(appInstance);

  // Async enablement for Firebase Analytics
  if (!isMockFirebase) {
    isSupported().then((supported) => {
      if (supported && finalConfig.measurementId) {
        try {
          analyticsInstance = getAnalytics(appInstance);
        } catch (analyticsError) {
          console.warn("Failed to initialize Firebase Analytics safely:", analyticsError);
        }
      }
    }).catch((err) => {
      console.debug("Firebase Analytics not supported in this host environment:", err);
    });
  }
} catch (error) {
  console.warn("Firebase initialization failed. Falling back to simulated storage mode.", error);
  isMockFirebase = true;
  // Initialize with dummy values to prevent crash if things go wrong
  appInstance = {} as FirebaseApp;
  dbInstance = {} as Firestore;
  authInstance = {} as Auth;
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const analytics = analyticsInstance;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatAuthError(err: any): string {
  if (!err) return "An unexpected authentication error occurred.";
  
  const rawCode = err.code || "";
  let code = typeof rawCode === "string" ? rawCode : "";
  
  if (!code && err.message && typeof err.message === "string") {
    const match = err.message.match(/\((auth\/[^)]+)\)/);
    if (match) {
      code = match[1];
    }
  }

  switch (code) {
    case "auth/unauthorized-domain":
      return `This domain isn't authorized for Google Sign-In yet. Please add "${window.location.hostname}" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
    case "auth/popup-blocked":
      return "The Google authentication popup was blocked by your browser. Please enable popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "The Google login popup was closed before completing authentication. Please click Connect again and select your account.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled yet in your Firebase Console. Please go to Authentication -> Sign-in Method and enable Google.";
    case "auth/invalid-api-key":
      return "The Firebase API key supplied in the config is invalid. Please verify your Firebase project settings.";
    case "auth/invalid-credential":
      return "Incorrect email address or password. Please verify your credentials and try again.";
    case "auth/email-already-in-use":
      return "This email address is already registered. Please log in or use a different email.";
    case "auth/weak-password":
      return "The password is too weak. It must be at least 6 characters long.";
    case "auth/invalid-email":
      return "The email address format is invalid. Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account exists with this email address. Try joining the classroom first.";
    case "auth/wrong-password":
      return "Incorrect password. Please verify and try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily blocked. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "A network connection error was detected. Please verify your internet settings and try again.";
    case "auth/internal-error":
      return "An internal server error occurred. Please try again.";
    default:
      if (err.message && typeof err.message === "string" && err.message.startsWith("Firebase: ")) {
        return err.message.replace("Firebase: ", "").replace(/\(auth\/[^)]+\)\.?/, "").trim();
      }
      return err.message || "Authentication credentials mismatch.";
  }
}

// Connection test on start up
async function testConnection() {
  if (isMockFirebase || !db) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration. Failed to get document because the client is offline.");
    } else {
      console.log("Firebase connection verified and ready.");
    }
  }
}
testConnection();
