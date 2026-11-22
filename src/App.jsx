import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './pages/AuthPage.jsx';
import Workspace from './pages/Workspace.jsx';
import { SAMPLE_MOODBOARD } from './data/moodboard.js';
import { auth, isFirebaseReady } from './firebase.js';
import { DEFAULT_ROOM } from './lib/room.js';
import { loadMoodboard, saveMoodboard } from './lib/storage.js';

// The bed is here from the start, marked as already being in the room.
const STARTER_PIECES = [{ id: 'bed-1', type: 'bed', x: -1.0, z: -0.45, rotation: 0, existing: true }];

function App() {
  // The app's data lives here, above the pages, and is handed down as props.
  const [user, setUser] = useState(null); // the signed-in person, or null
  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [pieces, setPieces] = useState(STARTER_PIECES);
  const [moodboard, setMoodboard] = useState(SAMPLE_MOODBOARD);
  const [pickedIds, setPickedIds] = useState([]);

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
          }
        }
      } catch (error) {
        console.error('Could not sync the moodboard: ', error);
      }
    }
    syncMoodboard();
  }, [user]);

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
    saveIfSignedIn(board, []);
  }

  function handleTogglePick(id) {
    const nextPicks = pickedIds.includes(id)
      ? pickedIds.filter((pickedId) => pickedId !== id)
      : [...pickedIds, id];
    setPickedIds(nextPicks);
    saveIfSignedIn(moodboard, nextPicks);
  }

  async function handleLogOut() {
    await signOut(auth);
    // Do not leave one person's board on screen for the next person.
    setMoodboard(SAMPLE_MOODBOARD);
    setPickedIds([]);
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Workspace
              user={user}
              room={room}
              setRoom={setRoom}
              pieces={pieces}
              setPieces={setPieces}
              moodboard={moodboard}
              pickedIds={pickedIds}
              onImportBoard={handleImportBoard}
              onTogglePick={handleTogglePick}
              onLogOut={handleLogOut}
            />
          }
        />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
      </Routes>
    </Router>
  );
}

export default App;
