// Saves and loads one person's moodboard and home.
// In Cloud Firestore each person has one document, users/<their user id>, and
// one more document per room under it: users/<their user id>/rooms/<room id>.
// A room is its own document because a document may hold at most 1 MB and a
// room can carry floor and wall photos.
// The home is also kept in this browser, so a reload keeps it without an account.

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { DEFAULT_LIGHTING } from './light.js';
import { defaultDoors, defaultWindows } from './room.js';
import { DEFAULT_SURFACES } from './surface.js';

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

// ---------- the home: its name, its rooms, and which room is open ----------

const BROWSER_KEY = 'apt-studio-home';

// A saved home may come from an older version of the app, or be damaged.
// Returns it with anything missing filled in, or null if it cannot be used.
export function completeHome(home) {
  if (!home || !Array.isArray(home.rooms) || home.rooms.length === 0) return null;
  const rooms = home.rooms.map((room) => {
    const surfaces = room.surfaces || {};
    return {
      ...room,
      // a room saved before windows and doors could be placed gets the ones it used to have
      size: {
        ...room.size,
        windows: room.size.windows || defaultWindows(room.size),
        doors: room.size.doors || defaultDoors(room.size),
      },
      pieces: room.pieces || [],
      lighting: { ...DEFAULT_LIGHTING, ...room.lighting },
      surfaces: {
        floor: { ...DEFAULT_SURFACES.floor, ...surfaces.floor },
        wall: { ...DEFAULT_SURFACES.wall, ...surfaces.wall },
      },
    };
  });
  const isOpenRoomThere = rooms.some((room) => room.id === home.activeRoomId);
  return { name: home.name || 'My home', activeRoomId: isOpenRoomThere ? home.activeRoomId : rooms[0].id, rooms };
}

// localStorage keeps text for this site in this browser. It can be switched off
// or full, and then it throws, so both functions catch that and carry on.
export function loadHomeFromBrowser() {
  try {
    return completeHome(JSON.parse(localStorage.getItem(BROWSER_KEY)));
  } catch {
    return null;
  }
}

export function saveHomeToBrowser(home) {
  try {
    localStorage.setItem(BROWSER_KEY, JSON.stringify(home));
  } catch {
    // Not saved this time (storage off or full). The app keeps working.
  }
}

// Returns the home saved in this person's account, or null if there is none.
export async function loadHome(userId) {
  const snapshot = await getDoc(doc(db, 'users', userId));
  const about = snapshot.exists() ? snapshot.data().home : null;
  if (!about) return null;
  const found = await getDocs(collection(db, 'users', userId, 'rooms'));
  const roomsById = {};
  found.forEach((roomDoc) => {
    roomsById[roomDoc.id] = roomDoc.data();
  });
  // roomIds keeps the order of the tabs.
  const rooms = about.roomIds.map((id) => roomsById[id]).filter(Boolean);
  return completeHome({ name: about.name, activeRoomId: about.activeRoomId, rooms });
}

// Save the home to the account. Only the rooms that changed are written again,
// and rooms that were removed are deleted.
export async function saveHome(userId, home, changedRooms, removedIds) {
  const about = { name: home.name, activeRoomId: home.activeRoomId, roomIds: home.rooms.map((room) => room.id) };
  await setDoc(doc(db, 'users', userId), { home: about }, { merge: true });
  await Promise.all([
    // JSON there and back drops any "undefined" values, which Firestore refuses.
    ...changedRooms.map((room) => setDoc(doc(db, 'users', userId, 'rooms', room.id), JSON.parse(JSON.stringify(room)))),
    ...removedIds.map((id) => deleteDoc(doc(db, 'users', userId, 'rooms', id))),
  ]);
}
