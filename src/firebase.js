import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// The file with the Firebase keys (src/firebaseConfig.js) is kept out of version
// control, so on a fresh copy of the project it does not exist yet.
// import.meta.glob looks for it and gives back an empty list if it is missing,
// where a normal import would stop the whole app with an error.
const found = import.meta.glob('./firebaseConfig.js', { eager: true });
const keysFile = found['./firebaseConfig.js'];
const firebaseConfig = keysFile ? keysFile.firebaseConfig : null;

// Until real values are pasted into firebaseConfig.js the app still runs,
// but logging in and saving are switched off.
export const isFirebaseReady = Boolean(firebaseConfig) && firebaseConfig.apiKey !== 'PASTE_HERE';

const app = isFirebaseReady ? initializeApp(firebaseConfig) : null;

// References to the two Firebase services this app uses.
export const auth = isFirebaseReady ? getAuth(app) : null;
export const db = isFirebaseReady ? getFirestore(app) : null;

// For testing on this computer only. A build made with VITE_EMULATOR=1 talks to the
// stand-in Firebase that `firebase emulators:start` runs on this machine, so accounts
// and saving can be tried without touching the real project.
if (isFirebaseReady && import.meta.env.VITE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
