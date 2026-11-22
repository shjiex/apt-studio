// Saves and loads one person's moodboard in Cloud Firestore.
// Each person has one document: users/<their user id>.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

// Returns the saved moodboard, or null if this person has not saved one.
export async function loadMoodboard(userId) {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) return null;
  return snapshot.data().moodboard || null;
}

// merge: true keeps any other fields already in the document.
export async function saveMoodboard(userId, moodboard) {
  await setDoc(doc(db, 'users', userId), { moodboard }, { merge: true });
}
