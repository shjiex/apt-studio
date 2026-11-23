import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';

// The normal site uses the address bar for its pages (BrowserRouter). The demo
// build runs inside a frame that cannot change the address, so it keeps the
// current page in memory instead (MemoryRouter). `VITE_DEMO=1 npx vite build --base=./`
const Router = import.meta.env.VITE_DEMO ? MemoryRouter : BrowserRouter;
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './pages/AuthPage.jsx';
import Workspace from './pages/Workspace.jsx';
import { exampleRoom } from './data/exampleRoom.js';
import { SAMPLE_MOODBOARD } from './data/moodboard.js';
import { auth, isFirebaseReady } from './firebase.js';
import { DEFAULT_LIGHTING } from './lib/light.js';
import { DEFAULT_ROOM } from './lib/room.js';
import { newRoom } from './lib/rooms.js';
import { DEFAULT_SURFACES } from './lib/surface.js';
import { loadBoardFromBrowser, loadHome, loadHomeFromBrowser, loadMoodboard, saveBoardToBrowser, saveHome, saveHomeToBrowser, saveMoodboard } from './lib/storage.js';

// The bed is here from the start, marked as already being in the room.
const STARTER_PIECES = [{ id: 'bed-1', type: 'bed', x: -1.0, z: -0.45, rotation: 0, existing: true }];

// The home starts with one room. Every room keeps its own size, pieces, lighting, floor and walls.
const STARTER_HOME = {
  name: 'My home',
  activeRoomId: 'room-1',
  rooms: [
    { id: 'room-1', name: 'Bedroom', kind: 'bedroom', size: DEFAULT_ROOM, pieces: STARTER_PIECES, lighting: DEFAULT_LIGHTING, surfaces: DEFAULT_SURFACES },
  ],
};

function App() {
  // The app's data lives here, above the pages, and is handed down as props.
  const [user, setUser] = useState(null); // the signed-in person, or null
  // The home as this browser last saved it, or the starter home. Read once, when the app opens.
  const [start] = useState(() => loadHomeFromBrowser() || STARTER_HOME);
  const [homeName, setHomeName] = useState(start.name);
  const [rooms, setRooms] = useState(start.rooms);
  const [activeRoomId, setActiveRoomId] = useState(start.activeRoomId); // the room that is open
  // Whose saved home has been read from the account. Until it has, nothing is
  // written there, so a slow load cannot be overwritten by what is on screen.
  const [accountHomeOf, setAccountHomeOf] = useState(null);
  // Each room exactly as it was last written to the account, by id, to tell which rooms changed.
  const roomsInAccount = useRef({});
  // How saving to the account is going, for the account menu:
  // 'idle' (nobody signed in), 'loading', 'saving', 'saved' or 'failed'.
  const [accountState, setAccountState] = useState('idle');
  // Goes up by one when the person asks to try again after a failure, which runs
  // the two effects below once more.
  const [tries, setTries] = useState(0);
  // A board connected earlier in this browser comes back on a reload. The function
  // form of useState runs once, when the app starts.
  const [boardInBrowser] = useState(loadBoardFromBrowser);
  const [moodboard, setMoodboard] = useState(boardInBrowser ? boardInBrowser.moodboard : SAMPLE_MOODBOARD);
  const [pickedIds, setPickedIds] = useState(boardInBrowser ? boardInBrowser.pickedIds : []);

  // Ask Firebase to tell us whenever someone signs in or out.
  useEffect(() => {
    if (!isFirebaseReady) return;
    const stopListening = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return stopListening;
  }, []);

  // When someone signs in: if they connected a board as a visitor, save it to
  // their account. Otherwise load the board they saved last time.
  useEffect(() => {
    if (!user) return;
    async function syncMoodboard() {
      try {
        if (moodboard.source === 'pinterest') {
          await saveMoodboard(user.uid, { ...moodboard, pickedIds });
        } else {
          const saved = await loadMoodboard(user.uid);
          if (saved) {
            const { pickedIds: savedPicks, ...savedBoard } = saved;
            setMoodboard(savedBoard);
            setPickedIds(savedPicks || []);
            saveBoardToBrowser(savedBoard, savedPicks || []);
          }
        }
      } catch (error) {
        console.error('Could not sync the moodboard: ', error);
      }
    }
    syncMoodboard();
  }, [user]);

  // Show a whole home (from the account, or the starter after logging out).
  function showHome(home) {
    setHomeName(home.name);
    setRooms(home.rooms);
    setActiveRoomId(home.activeRoomId);
  }

  // When someone signs in: show the home saved in their account, if there is one.
  // If there is none, the home on screen becomes theirs (the effect below saves it).
  useEffect(() => {
    if (!user) {
      setAccountState('idle');
      return;
    }
    // Already read for this person (a second try after a failed save): nothing to load.
    if (accountHomeOf === user.uid) return;
    setAccountState('loading');
    loadHome(user.uid)
      .then((saved) => {
        if (saved) {
          showHome(saved);
          roomsInAccount.current = Object.fromEntries(saved.rooms.map((room) => [room.id, room]));
        }
        setAccountHomeOf(user.uid);
        setAccountState('saved');
      })
      .catch((error) => {
        console.error('Could not load the home: ', error);
        setAccountState('failed');
      });
  }, [user, tries]);

  // Save the home a moment after it stops changing: always in this browser, and in
  // the account when signed in. Waiting 0.8 s means dragging a piece saves once, not
  // many times a second. If something changes during the wait, the timer starts again.
  useEffect(() => {
    const timer = setTimeout(() => {
      const home = { name: homeName, activeRoomId, rooms };
      saveHomeToBrowser(home);
      if (!user || accountHomeOf !== user.uid) return;
      // An unchanged room is still the very same object, so !== finds the changed ones.
      const changed = rooms.filter((room) => roomsInAccount.current[room.id] !== room);
      const removed = Object.keys(roomsInAccount.current).filter((id) => !rooms.some((room) => room.id === id));
      setAccountState('saving');
      saveHome(user.uid, home, changed, removed)
        .then(() => {
          roomsInAccount.current = Object.fromEntries(rooms.map((room) => [room.id, room]));
          setAccountState('saved');
        })
        .catch((error) => {
          console.error('Could not save the home: ', error);
          setAccountState('failed');
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [homeName, rooms, activeRoomId, user, accountHomeOf, tries]);

  // Save to the account, but only a connected board and only when signed in.
  async function saveIfSignedIn(board, picks) {
    if (!user || board.source !== 'pinterest') return;
    try {
      await saveMoodboard(user.uid, { ...board, pickedIds: picks });
    } catch (error) {
      console.error('Could not save the moodboard: ', error);
    }
  }

  function handleImportBoard(board) {
    setMoodboard(board);
    setPickedIds([]);
    saveBoardToBrowser(board, []);
    saveIfSignedIn(board, []);
  }

  // Leave the connected board and show the sample photos again.
  async function handleUseSamples() {
    setMoodboard(SAMPLE_MOODBOARD);
    setPickedIds([]);
    saveBoardToBrowser(null);
    if (!user) return;
    try {
      await saveMoodboard(user.uid, null); // the account forgets the board too
    } catch (error) {
      console.error('Could not clear the moodboard: ', error);
    }
  }

  function handleTogglePick(id) {
    const nextPicks = pickedIds.includes(id)
      ? pickedIds.filter((pickedId) => pickedId !== id)
      : [...pickedIds, id];
    setPickedIds(nextPicks);
    if (moodboard.source === 'pinterest') saveBoardToBrowser(moodboard, nextPicks);
    saveIfSignedIn(moodboard, nextPicks);
  }

  // Change one part of the open room: 'size', 'pieces', 'lighting' or 'surfaces'.
  // `change` is the new value, or a function that gets the old value and returns the new one.
  function updateActiveRoom(part, change) {
    setRooms((current) =>
      current.map((entry) => {
        if (entry.id !== activeRoomId) return entry;
        const value = typeof change === 'function' ? change(entry[part]) : change;
        return { ...entry, [part]: value };
      })
    );
  }

  // Add a room and open it.
  function handleAddRoom(details) {
    const added = newRoom(details);
    setRooms([...rooms, added]);
    setActiveRoomId(added.id);
  }

  // The welcome questions were answered: `details` is { name, kind, size, doorWall, windowWall }.
  // The home starts again with that one room. Its door and window go to the middle of
  // the walls that were named, and a room said to have no window gets none.
  function handleFirstRoom(details) {
    const added = newRoom(details);
    added.size.doors = [{ ...added.size.doors[0], wall: details.doorWall, along: 0.5 }];
    added.size.windows = details.windowWall === 'none' ? [] : [{ ...added.size.windows[0], wall: details.windowWall, along: 0.5 }];
    // a door and a window on the same wall share it: door towards one end, window towards the other
    if (details.doorWall === details.windowWall) {
      added.size.doors[0].along = 0.2;
      added.size.windows[0].along = 0.68;
    }
    setRooms([added]);
    setActiveRoomId(added.id);
  }

  // The welcome's "Open the example room": the home starts again with just the example.
  function handleStartWithExample() {
    const added = exampleRoom();
    setRooms([added]);
    setActiveRoomId(added.id);
  }

  // "Open the example room" in the add-room dialog: add the furnished example
  // (data/exampleRoom.js) as one more room in this home and open it.
  function handleAddExampleRoom() {
    const added = exampleRoom();
    setRooms([...rooms, added]);
    setActiveRoomId(added.id);
  }

  // Rename a room or change its kind.
  function handleRenameRoom(id, name, kind) {
    setRooms(rooms.map((entry) => (entry.id === id ? { ...entry, name, kind } : entry)));
  }

  // Remove a room, then open the first one that is left. The last room cannot be removed.
  function handleRemoveRoom(id) {
    if (rooms.length === 1) return;
    const left = rooms.filter((entry) => entry.id !== id);
    setRooms(left);
    setActiveRoomId(left[0].id);
  }

  async function handleLogOut() {
    await signOut(auth);
    // Do not leave one person's board or home on screen for the next person.
    setMoodboard(SAMPLE_MOODBOARD);
    setPickedIds([]);
    saveBoardToBrowser(null);
    setAccountHomeOf(null);
    roomsInAccount.current = {};
    showHome(STARTER_HOME);
  }

  // basename is the folder the app is served from: "/" on your computer, "/apt-studio" on GitHub Pages.
  return (
    <Router {...(import.meta.env.VITE_DEMO ? {} : { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })}>
      <Routes>
        <Route
          path="/"
          element={
            <Workspace
              user={user}
              homeName={homeName}
              onRenameHome={setHomeName}
              rooms={rooms}
              activeRoomId={activeRoomId}
              onPickRoom={setActiveRoomId}
              onAddRoom={handleAddRoom}
              onAddExampleRoom={handleAddExampleRoom}
              onRenameRoom={handleRenameRoom}
              onRemoveRoom={handleRemoveRoom}
              onStartOver={() => showHome(STARTER_HOME)}
              onFirstRoom={handleFirstRoom}
              onStartWithExample={handleStartWithExample}
              setRoom={(change) => updateActiveRoom('size', change)}
              setPieces={(change) => updateActiveRoom('pieces', change)}
              setLighting={(change) => updateActiveRoom('lighting', change)}
              setSurfaces={(change) => updateActiveRoom('surfaces', change)}
              moodboard={moodboard}
              pickedIds={pickedIds}
              onImportBoard={handleImportBoard}
              onUseSamples={handleUseSamples}
              onTogglePick={handleTogglePick}
              onLogOut={handleLogOut}
              accountState={accountState}
              onTryAgain={() => setTries(tries + 1)}
            />
          }
        />
        <Route path="/login" element={<AuthPage key="login" mode="login" user={user} />} />
        <Route path="/signup" element={<AuthPage key="signup" mode="signup" user={user} />} />
      </Routes>
    </Router>
  );
}

export default App;
