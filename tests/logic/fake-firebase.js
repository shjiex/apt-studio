// A stand-in for src/firebase.js, for check-account.mjs: Firebase counts as switched on,
// and `db` is an empty object because the fake Firestore next to this file ignores it.
export const isFirebaseReady = true;
export const auth = {};
export const db = {};
