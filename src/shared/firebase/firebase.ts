import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseAppletConfig.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseAppletConfig.projectId || env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseAppletConfig.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseAppletConfig.appId || env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase App centrally
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
const customDatabaseId = (firebaseAppletConfig as any).firestoreDatabaseId;
export const db = (customDatabaseId && customDatabaseId !== '(default)') 
  ? getFirestore(app, customDatabaseId) 
  : getFirestore(app);
export const storage = getStorage(app);

// Check if Firebase is using real credentials
export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('DummyKey')
);

