import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to bypass potential network/proxy issues
// Using the database ID from config to ensure it connects to the right instance
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = null;

export default app;
