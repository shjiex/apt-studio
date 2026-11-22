import { useEffect, useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import MoodboardPanel from '../components/MoodboardPanel.jsx';
import PinterestImport from '../components/PinterestImport.jsx';
import PreviewPanel from '../components/PreviewPanel.jsx';
import RoomSetup from '../components/RoomSetup.jsx';
import TabBar from '../components/TabBar.jsx';
import UndoToast from '../components/UndoToast.jsx';
import ViewSwitch from '../components/ViewSwitch.jsx';
import { getItem, setPinItems } from '../data/catalog.js';
import { clampToRoom, findOpenSpot, formatRoom, snapToRoom } from '../lib/room.js';

const MIN_MOODBOARD_WIDTH = 280;
const MAX_MOODBOARD_WIDTH = 760;

// The main screen: the room preview and the moodboard.
// The data itself (room, pieces, moodboard) lives in App so it survives a trip
// to the login page. This component keeps only what is about the screen.
function Workspace({
  user,
  room,
  setRoom,
  pieces,
  setPieces,
  moodboard,
  pickedIds,
  onImportBoard,
  onTogglePick,
  onLogOut,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [pinModels, setPinModels] = useState([]); // furniture made from moodboard images
  const [view, setView] = useState('2d');
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tab, setTab] = useState('preview'); // which panel a phone shows
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1); // 1 fits the room; bigger is closer
  const [moodboardWidth, setMoodboardWidth] = useState(400); // pixels, set by the divider
  // History for undo and redo: earlier lists of pieces, and ones that were undone.
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  // The message in the toast at the bottom: { key, text } or null.
  const [toast, setToast] = useState(null);
  // The <canvas> element of the 3D scene, kept so we can save it as an image.
  const canvasRef = useRef(null);

  // Remember the current pieces so the next change can be undone.
  // When the app opens, read the list of 3D models that were made from
  // moodboard images. The list is written by pipeline/object2glb.py.
  useEffect(() => {
    fetch('/models/pins/manifest.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((manifest) => setPinModels(setPinItems(manifest)))
      .catch(() => setPinModels([]));
  }, []);

  function rememberPieces() {
    setPast([...past, pieces]);
    setFuture([]);
  }

  // Change the list of pieces in one undoable step, and say what happened.
  function changePieces(nextPieces, text) {
    rememberPieces();
    setPieces(nextPieces);
    setToast({ key: Date.now(), text });
  }

  function handleUndo() {
    if (past.length === 0) return;
    setFuture([pieces, ...future]);
    setPieces(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setSelectedId(null);
    setToast(null);
  }

  function handleRedo() {
    if (future.length === 0) return;
    setPast([...past, pieces]);
    setPieces(future[0]);
    setFuture(future.slice(1));
    setSelectedId(null);
  }

  // Pressing a tile adds one more of that piece in the first open spot.
  function handleAddItem(type) {
    const item = getItem(type);
    const spot = findOpenSpot(type, pieces, room);
    const newPiece = { id: `${type}-${Date.now()}`, type, x: spot.x, z: spot.z, rotation: 0, existing: false };
    changePieces([...pieces, newPiece], `${item.name} added`);
    setSelectedId(newPiece.id);
  }

  // Called many times a second while a piece is dragged. The history entry
  // for the drag is made once, in handleDragStart.
  function handleMove(id, x, z) {
    setPieces((current) =>
      current.map((piece) => (piece.id === id ? snapToRoom({ ...piece, x, z }, room) : piece))
    );
  }

  function handleRotate(id) {
    const piece = pieces.find((candidate) => candidate.id === id);
    const nextPieces = pieces.map((candidate) =>
      candidate.id === id ? clampToRoom({ ...candidate, rotation: (candidate.rotation + 90) % 360 }, room) : candidate
    );
    changePieces(nextPieces, `${getItem(piece.type).name} rotated`);
  }

  function handleDuplicate(id) {
    const piece = pieces.find((candidate) => candidate.id === id);
    const copy = clampToRoom(
      { ...piece, id: `${piece.type}-${Date.now()}`, x: piece.x + 0.3, z: piece.z + 0.3, existing: false },
      room
    );
    changePieces([...pieces, copy], `${getItem(piece.type).name} duplicated`);
    setSelectedId(copy.id);
  }

  function handleRemove(id) {
    const piece = pieces.find((candidate) => candidate.id === id);
    changePieces(pieces.filter((candidate) => candidate.id !== id), `${getItem(piece.type).name} removed`);
    setSelectedId(null);
  }

  // Move the selected piece a small step (5 cm) with the arrow keys.
  function handleNudge(dx, dz) {
    rememberPieces();
    setPieces(
      pieces.map((piece) =>
        piece.id === selectedId ? clampToRoom({ ...piece, x: piece.x + dx, z: piece.z + dz }, room) : piece
      )
    );
  }

  function handleZoom(nextZoom) {
    setZoom(Math.min(Math.max(nextZoom, 0.5), 3));
  }

  // Keyboard shortcuts. The effect runs again whenever something it reads changes,
  // so the handler always sees the current pieces and selection.
  useEffect(() => {
    function handleKeyDown(event) {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
      if (isTyping || isEditingRoom || isConnecting) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (!selectedId) return;
      const step = 0.05;
      if (event.key === 'ArrowLeft') handleNudge(-step, 0);
      else if (event.key === 'ArrowRight') handleNudge(step, 0);
      else if (event.key === 'ArrowUp') handleNudge(0, -step);
      else if (event.key === 'ArrowDown') handleNudge(0, step);
      else if (event.key.toLowerCase() === 'r') handleRotate(selectedId);
      else if (event.key.toLowerCase() === 'd') handleDuplicate(selectedId);
      else if (event.key === 'Delete' || event.key === 'Backspace') handleRemove(selectedId);
      else if (event.key === 'Escape') setSelectedId(null);
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleSaveRoom(nextRoom) {
    setRoom(nextRoom);
    // A smaller room may leave pieces outside the walls, so pull them back in.
    setPieces(pieces.map((piece) => clampToRoom(piece, nextRoom)));
    setIsEditingRoom(false);
  }

  // Save what the 3D canvas shows right now as a PNG file.
  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'apt-studio-room.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  // Dragging the divider: follow the pointer until it is released.
  function handleDividerDown(event) {
    event.preventDefault();
    function handleMove(moveEvent) {
      const fromRight = window.innerWidth - moveEvent.clientX - 24;
      setMoodboardWidth(Math.min(Math.max(fromRight, MIN_MOODBOARD_WIDTH), MAX_MOODBOARD_WIDTH));
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  // The divider also works from the keyboard with the arrow keys.
  function handleDividerKey(event) {
    if (event.key === 'ArrowLeft') setMoodboardWidth(Math.min(moodboardWidth + 24, MAX_MOODBOARD_WIDTH));
    if (event.key === 'ArrowRight') setMoodboardWidth(Math.max(moodboardWidth - 24, MIN_MOODBOARD_WIDTH));
  }

  function handleImport(board) {
    onImportBoard(board);
    setIsConnecting(false);
  }

  // Save what the 3D canvas shows right now as a PNG file.
  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'apt-studio-room.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <div className={`app app--${tab}`}>
      <header className="top-bar">
        <div className="top-bar__left">
          <span className="wordmark">Apt Studio</span>
          <button type="button" className="room-chip" title="Change the room size" onClick={() => setIsEditingRoom(true)}>
            <Icon name="ruler" size={16} />
            <span className="room-chip__name">Bedroom ·</span>
            {formatRoom(room)}
          </button>
        </div>
        <ViewSwitch view={view} onChange={setView} />
        <div className="top-bar__right">
          <Button
            variant={showGrid ? 'primary' : 'secondary'}
            icon="measure"
            aria-label="Measurement grid"
            aria-pressed={showGrid}
            title="Measurement grid"
            onClick={() => setShowGrid(!showGrid)}
          />
          <Button variant="secondary" icon="download" aria-label="Download room image" title="Download room image" onClick={handleDownload} />
        </div>
      </header>

      <main className="workspace" style={{ '--moodboard-width': `${moodboardWidth}px` }}>
        <PreviewPanel
          pinModels={pinModels}
          room={room}
          pieces={pieces}
          selectedId={selectedId}
          view={view}
          showGrid={showGrid}
          zoom={zoom}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onSelect={setSelectedId}
          onMove={handleMove}
          onDragStart={rememberPieces}
          onRotate={handleRotate}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
          onAddItem={handleAddItem}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoom={handleZoom}
          onCanvasReady={(canvas) => {
            canvasRef.current = canvas;
          }}
        />
        <div
          className="divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the moodboard"
          tabIndex={0}
          onPointerDown={handleDividerDown}
          onKeyDown={handleDividerKey}
        />
        <MoodboardPanel
          moodboard={moodboard}
          pickedIds={pickedIds}
          user={user}
          pinModels={pinModels}
          onAddItem={handleAddItem}
          onTogglePick={onTogglePick}
          onConnect={() => setIsConnecting(true)}
          onLogOut={onLogOut}
        />
      </main>

      <TabBar tab={tab} onChange={setTab} />

      {isEditingRoom && (
        <RoomSetup room={room} onSave={handleSaveRoom} onCancel={() => setIsEditingRoom(false)} />
      )}

      {isConnecting && <PinterestImport onImport={handleImport} onCancel={() => setIsConnecting(false)} />}

      {toast && (
        <UndoToast key={toast.key} message={toast.text} onUndo={handleUndo} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

export default Workspace;
