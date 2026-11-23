import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Button from '../components/Button.jsx';
import DownloadMenu from '../components/DownloadMenu.jsx';
import FoundFurniture from '../components/FoundFurniture.jsx';
import LightingMenu from '../components/LightingMenu.jsx';
import MoodboardPanel from '../components/MoodboardPanel.jsx';
import PiecePanel from '../components/PiecePanel.jsx';
import PinterestImport from '../components/PinterestImport.jsx';
import PlanRooms from '../components/PlanRooms.jsx';
import PreviewPanel from '../components/PreviewPanel.jsx';
import RoomSetup from '../components/RoomSetup.jsx';
import RoomTabs from '../components/RoomTabs.jsx';
import ShopList from '../components/ShopList.jsx';
import SurfacesMenu from '../components/SurfacesMenu.jsx';
import TabBar from '../components/TabBar.jsx';
import UndoToast from '../components/UndoToast.jsx';
import ViewSwitch from '../components/ViewSwitch.jsx';
import { getItem, setPinItems } from '../data/catalog.js';
import { clampToRoom, findOpenSpot, getFit, snapToRoom } from '../lib/room.js';
import { asset } from '../lib/paths.js';
import { bulbOf, fixedLightPoints, getSun, lightOutput } from '../lib/light.js';

const MIN_MOODBOARD_WIDTH = 280;
const MAX_MOODBOARD_WIDTH = 760;

// The main screen: the room preview and the moodboard.
// The data itself (the rooms, the moodboard) lives in App so it survives a trip
// to the login page. This component keeps only what is about the screen.
function Workspace({
  user,
  homeName,
  onRenameHome,
  rooms,
  activeRoomId,
  onPickRoom,
  onAddRoom,
  onAddExampleRoom,
  onRenameRoom,
  onRemoveRoom,
  onStartOver,
  setRoom,
  setPieces,
  setLighting,
  setSurfaces,
  moodboard,
  pickedIds,
  onImportBoard,
  onTogglePick,
  onLogOut,
}) {
  // The room that is open. Everything below works on its size, pieces and lighting.
  const activeRoom = rooms.find((entry) => entry.id === activeRoomId);
  const room = activeRoom.size;
  // Leave out any saved piece whose furniture no longer exists (a moodboard model that was removed).
  // (When nothing is missing, keep the very same list, so nothing downstream sees a "change".)
  const hasUnknownPiece = activeRoom.pieces.some((piece) => !getItem(piece.type));
  const pieces = hasUnknownPiece ? activeRoom.pieces.filter((piece) => getItem(piece.type)) : activeRoom.pieces;
  const lighting = activeRoom.lighting; // daylight, fixed lights and lamp bulbs
  const surfaces = activeRoom.surfaces; // what the floor and walls are made of

  const [selectedId, setSelectedId] = useState(null);
  const [pinModels, setPinModels] = useState([]); // furniture made from moodboard images
  const [isReady, setIsReady] = useState(false); // has the list of those models been read?
  const [view, setView] = useState('2d');
  const [realistic, setRealistic] = useState(false); // is the realistic picture on (inside view)?
  const [passes, setPasses] = useState(0); // how many passes the realistic picture has averaged
  const [brightness, setBrightness] = useState(1); // the person's lighter / darker setting for the realistic picture
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isShopping, setIsShopping] = useState(false); // is the shop list open?
  const [isFinding, setIsFinding] = useState(false); // is the "already in your room" dialog open?
  const [isPickingPlan, setIsPickingPlan] = useState(false); // is the floor plan picker open?
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
  const cameraRef = useRef(null); // the 3D camera, so a photo render can use the same view

  // Remember the current pieces so the next change can be undone.
  // When the app opens, read the list of 3D models that were made from
  // moodboard images. The list is written by pipeline/object2glb.py.
  useEffect(() => {
    fetch(asset('/models/pins/manifest.json'))
      .then((response) => (response.ok ? response.json() : []))
      .then((manifest) => setPinModels(setPinItems(manifest)))
      .catch(() => setPinModels([]))
      .finally(() => setIsReady(true));
  }, []);

  // Remember the room as it is now (its pieces, and its size, windows and doors)
  // so the next change can be undone.
  function rememberPieces() {
    setPast([...past, { pieces, room }]);
    setFuture([]);
  }

  // A change to the room itself: a window or door added, removed, moved or resized.
  // A slider or a drag sends many changes a second; they count as one undo step as
  // long as they come less than 0.8 seconds apart. `text` is shown in the toast.
  const lastRoomChange = useRef(0);
  function changeRoom(nextRoom, text) {
    const now = Date.now();
    if (now - lastRoomChange.current > 800) rememberPieces();
    lastRoomChange.current = now;
    setRoom(nextRoom);
    if (text) setToast({ key: now, text });
  }

  // Change the list of pieces in one undoable step, and say what happened.
  function changePieces(nextPieces, text) {
    rememberPieces();
    setPieces(nextPieces);
    setToast({ key: Date.now(), text });
  }

  function handleUndo() {
    if (past.length === 0) return;
    const last = past[past.length - 1];
    setFuture([{ pieces, room }, ...future]);
    setPieces(last.pieces);
    setRoom(last.room);
    setPast(past.slice(0, -1));
    lastRoomChange.current = 0; // the next room change is a new step
    setSelectedId(null);
    setToast(null);
  }

  function handleRedo() {
    if (future.length === 0) return;
    setPast([...past, { pieces, room }]);
    setPieces(future[0].pieces);
    setRoom(future[0].room);
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

  // Put furniture you already own into the plan, in grey. Each piece takes the
  // first open spot; the photo cannot tell where it really stands.
  function handleAddExisting(types) {
    let nextPieces = pieces;
    types.forEach((type, index) => {
      const spot = findOpenSpot(type, nextPieces, room);
      nextPieces = [
        ...nextPieces,
        { id: `${type}-own-${Date.now()}-${index}`, type, x: spot.x, z: spot.z, rotation: 0, existing: true },
      ];
    });
    changePieces(nextPieces, `${types.length} of your pieces added`);
  }

  // Save the product page link for one piece. An empty link removes it.
  // `price` is optional: the phone bar only knows the link, so there the price stays as it was.
  function handleSetLink(id, link, price) {
    const nextPieces = pieces.map((piece) =>
      piece.id === id ? { ...piece, link, price: price === undefined ? piece.price : price } : piece
    );
    changePieces(nextPieces, link || price ? 'Shop details saved' : 'Shop details removed');
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
      if (isTyping || isEditingRoom || isAddingRoom || isPickingPlan || isConnecting) return;
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

  // Open another room. Undo history belongs to one room, so it starts fresh.
  function handlePickRoom(id) {
    if (id === activeRoomId) return;
    onPickRoom(id);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    setToast(null);
  }

  // A new size for the open room, from the room dialog or the floor plan picker.
  function handleSaveSize(nextSize) {
    rememberPieces(); // a new size can be undone like any other change
    // the dialog only knows width, length and height; the windows and doors stay as they are
    setRoom({ ...room, ...nextSize });
    // A smaller room may leave pieces outside the walls, so pull them back in.
    setPieces(pieces.map((piece) => clampToRoom(piece, nextSize)));
    setIsEditingRoom(false);
    setIsPickingPlan(false);
  }

  // The room dialog was saved: `details` is { name, kind, size }.
  function handleSaveRoom(details) {
    onRenameRoom(activeRoomId, details.name, details.kind);
    handleSaveSize(details.size);
  }

  // The same dialog, opened by the + tab: make a room and open it.
  function handleCreateRoom(details) {
    onAddRoom(details);
    setIsAddingRoom(false);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    setToast({ key: Date.now(), text: `${details.name} added` });
  }

  // "Open the example room" in that dialog: add the furnished example and open it.
  // Like a new room, it starts with nothing selected and nothing to undo.
  function handleUseExample() {
    onAddExampleRoom();
    setIsAddingRoom(false);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    setToast({ key: Date.now(), text: 'The example room is open. You can change anything you like.' });
  }

  function handleDeleteRoom() {
    onRemoveRoom(activeRoomId);
    setIsEditingRoom(false);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    setToast(null);
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
    // named after the room: "Living room" becomes apt-studio-living-room.png
    link.download = `apt-studio-${activeRoom.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'room'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  // Save the room as a file: its size, and for every piece what it is, where it
  // stands, which way it faces, how big it is and which 3D model it uses.
  // pipeline/render_room.py reads this file to make a photo render.
  function handleDownloadRoom() {
    // Where the camera is, which way it looks and how wide it sees, so the
    // photo render can be taken from the view on screen (--view app).
    const camera = cameraRef.current;
    const look = camera.getWorldDirection(new THREE.Vector3());
    const roomFile = {
      name: activeRoom.name,
      kind: activeRoom.kind,
      room,
      // the floor and walls: a photo travels inside the file as a data URL
      surfaces,
      camera: {
        position: camera.position.toArray(),
        direction: look.toArray(),
        fov: camera.fov,
        aspect: camera.aspect,
      },
      // The lights as described, turned into plain positions and numbers for the photo render.
      lighting: {
        daylight: lighting.daylight,
        sun: getSun(lighting),
        fixed: lighting.fixed
          .filter((light) => light.on)
          .map((light) => ({ kind: light.kind, kelvin: light.kelvin, lumens: lightOutput(light), points: fixedLightPoints(light, room) })),
        lamps: Object.fromEntries(
          pieces.filter((piece) => (getItem(piece.type).baseType || piece.type) === 'lamp').map((piece) => {
            const bulb = bulbOf(piece, lighting);
            return [piece.id, { ...bulb, lumens: lightOutput(bulb) }]; // lumens after the dimmer
          })
        ),
      },
      pieces: pieces.map((piece) => {
        const item = getItem(piece.type);
        return {
          id: piece.id,
          type: piece.type,
          name: item.name,
          x: piece.x,
          z: piece.z,
          rotation: piece.rotation,
          existing: Boolean(piece.existing),
          size: item.size,
          model: item.model,
        };
      }),
    };
    const text = JSON.stringify(roomFile, null, 2);
    const link = document.createElement('a');
    link.download = 'apt-studio-room.json';
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // The piece that is selected, if any. While there is one, its panel replaces the moodboard.
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);

  // A saved room may hold furniture made from moodboard images. Wait for the list
  // of those models before drawing the room, so every piece can be looked up.
  if (!isReady) return <div className="app" aria-busy="true" />;

  return (
    <div className={`app app--${tab}`}>
      <header className="top-bar">
        <div className="top-bar__left">
          <span className="wordmark">Apt Studio</span>
          <Button variant="secondary" icon="image" onClick={() => setIsFinding(true)}>
            Your furniture
          </Button>
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
          <LightingMenu lighting={lighting} onChange={setLighting} windows={room.windows} />
          <SurfacesMenu surfaces={surfaces} onChange={setSurfaces} room={room} onRoomChange={changeRoom} />
          <Button variant="secondary" icon="link" onClick={() => setIsShopping(true)}>
            Shop list
          </Button>
          <DownloadMenu onPicture={handleDownload} onRoomFile={handleDownloadRoom} />
        </div>
      </header>

      <RoomTabs
        homeName={homeName}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onRenameHome={onRenameHome}
        onPick={handlePickRoom}
        onEdit={() => setIsEditingRoom(true)}
        onAdd={() => setIsAddingRoom(true)}
        onStartOver={() => {
          onStartOver();
          setSelectedId(null);
          setPast([]);
          setFuture([]);
          setToast(null);
        }}
      />

      <main className="workspace" style={{ '--moodboard-width': `${moodboardWidth}px` }}>
        <PreviewPanel
          pinModels={pinModels}
          room={room}
          pieces={pieces}
          selectedId={selectedId}
          view={view}
          showGrid={showGrid}
          lighting={lighting}
          surfaces={surfaces}
          onRoomChange={changeRoom}
          realistic={realistic}
          passes={passes}
          brightness={brightness}
          onBrightness={setBrightness}
          onSavePicture={handleDownload}
          onRealistic={(isOn) => {
            setRealistic(isOn);
            setPasses(0);
          }}
          onPasses={setPasses}
          zoom={zoom}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onSelect={setSelectedId}
          onMove={handleMove}
          onDragStart={rememberPieces}
          onRotate={handleRotate}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
          onSetLink={handleSetLink}
          onAddItem={handleAddItem}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoom={handleZoom}
          onCanvasReady={(canvas, camera) => {
            canvasRef.current = canvas;
            cameraRef.current = camera;
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
        {selectedPiece ? (
          <PiecePanel
            piece={selectedPiece}
            room={room}
            fit={getFit(selectedPiece, pieces, room)}
            onRotate={handleRotate}
            onDuplicate={handleDuplicate}
            onRemove={handleRemove}
            onSetLink={handleSetLink}
            lighting={lighting}
            onLightingChange={setLighting}
            onClose={() => setSelectedId(null)}
          />
        ) : (
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
        )}
      </main>

      <TabBar tab={tab} onChange={setTab} />

      {isFinding && <FoundFurniture onAdd={handleAddExisting} onClose={() => setIsFinding(false)} />}
      {isShopping && <ShopList pieces={pieces} onClose={() => setIsShopping(false)} />}
      {isPickingPlan && <PlanRooms room={room} onSave={handleSaveSize} onClose={() => setIsPickingPlan(false)} />}

      {isEditingRoom && (
        <RoomSetup
          entry={activeRoom}
          onSave={handleSaveRoom}
          onCancel={() => setIsEditingRoom(false)}
          onUsePlan={() => {
            setIsEditingRoom(false);
            setIsPickingPlan(true);
          }}
          onRemove={rooms.length > 1 ? handleDeleteRoom : null}
        />
      )}

      {/* The same dialog with no room handed in makes a new one. */}
      {isAddingRoom && <RoomSetup onSave={handleCreateRoom} onUseExample={handleUseExample} onCancel={() => setIsAddingRoom(false)} />}

      {isConnecting && <PinterestImport onImport={handleImport} onCancel={() => setIsConnecting(false)} />}

      {toast && (
        <UndoToast key={toast.key} message={toast.text} onUndo={handleUndo} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

export default Workspace;
