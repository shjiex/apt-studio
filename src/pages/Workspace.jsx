import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import FoundFurniture from '../components/FoundFurniture.jsx';
import Logo from '../components/Logo.jsx';
import Button from '../components/Button.jsx';
import AccountButton from '../components/AccountButton.jsx';
import PiecePanel from '../components/PiecePanel.jsx';
import PinterestImport from '../components/PinterestImport.jsx';
import PlanRooms from '../components/PlanRooms.jsx';
import PreviewPanel from '../components/PreviewPanel.jsx';
import RoomSetup from '../components/RoomSetup.jsx';
import RoomTabs from '../components/RoomTabs.jsx';
import SidePanel from '../components/SidePanel.jsx';
import Tips from '../components/Tips.jsx';
import ToolsPanel from '../components/ToolsPanel.jsx';
import Welcome from '../components/Welcome.jsx';
import { PreferencesMenu, SettingsMenu } from '../components/TopMenus.jsx';
import TabBar from '../components/TabBar.jsx';
import UndoToast from '../components/UndoToast.jsx';
import { CATALOG, getItem, setPinItems, sizeOf } from '../data/catalog.js';
import { clampToRoom, findOpenSpot, getFit, snapToRoom } from '../lib/room.js';
import { asset } from '../lib/paths.js';
import { bulbOf, fixedLightPoints, getSun, lightOutput } from '../lib/light.js';

const MIN_MOODBOARD_WIDTH = 360;
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
  onUseSamples,
  onTogglePick,
  onLogOut,
  accountState,
  onTryAgain,
  onFirstRoom,
  onStartWithExample,
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
  // Is the realistic picture on? It only draws in the inside view, and it is on from
  // the start, so stepping inside sharpens into the realistic picture by itself.
  const [realistic, setRealistic] = useState(true);
  const [passes, setPasses] = useState(0); // how many passes the realistic picture has averaged
  const [brightness, setBrightness] = useState(1); // the person's lighter / darker setting for the realistic picture
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFinding, setIsFinding] = useState(false); // is the "already in your room" dialog open?
  const [isPickingPlan, setIsPickingPlan] = useState(false); // is the floor plan picker open?
  // Which small panel is open over the room: 'lighting', 'surfaces', 'download',
  // 'score', or null for none. Keeping it here means only one is open at a time.
  const [openPanel, setOpenPanel] = useState(null);
  const [tab, setTab] = useState('preview'); // which panel a phone shows
  // The welcome questions show on a first visit, and again after "Start over".
  // 'apt-studio-welcomed' in the browser's storage remembers that they were seen.
  // Someone who already has a saved home from an earlier visit is not asked again.
  const [isWelcoming, setIsWelcoming] = useState(
    () => !localStorage.getItem('apt-studio-welcomed') && !localStorage.getItem('apt-studio-home'),
  );
  // The tour of small tips beside the controls. It follows the welcome the first time.
  const [isTouring, setIsTouring] = useState(false);
  // The section to the right of the room: is it open, and is it showing the moodboard or the shop list?
  const [isSideOpen, setIsSideOpen] = useState(true);
  const [sideTab, setSideTab] = useState('moodboard');
  // Where the tools sit: 'stage' (furniture under the room, lighting and floor and walls
  // opened from buttons on it) or 'side' (all three in a section to the left of the room).
  // The choice is kept in the browser, so it is the same next time.
  const [layout, setLayout] = useState(() => localStorage.getItem('apt-studio-layout') || 'stage');
  // The tools section to the left of the room: null when closed, or 'furniture', 'lighting' or 'surfaces'.
  const [tool, setTool] = useState(() => (localStorage.getItem('apt-studio-layout') === 'side' ? 'furniture' : null));
  // Metric (metres and centimetres) or imperial (feet and inches), also kept in the browser.
  const [units, setUnits] = useState(() => localStorage.getItem('apt-studio-units') || 'metric');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1); // 1 fits the room; bigger is closer
  const [moodboardWidth, setMoodboardWidth] = useState(560); // pixels, set by the divider
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
    // A room made smaller (by its size handles on the plan) may leave pieces outside the walls, so pull them back in.
    if (nextRoom.width < room.width || nextRoom.length < room.length) setPieces(pieces.map((piece) => clampToRoom(piece, nextRoom)));
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
  // Dragging a tile onto the room adds it where it is dropped: `at` is that place on
  // the floor ({ x, z } in metres). Without `at` it goes to the first open spot.
  function handleAddItem(type, at) {
    const item = getItem(type);
    const spot = at ? { ...at, rotation: 0 } : findOpenSpot(type, pieces, room);
    const newPiece = snapToRoom({ id: `${type}-${Date.now()}`, type, x: spot.x, z: spot.z, rotation: spot.rotation, existing: false }, room);
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
        { id: `${type}-own-${Date.now()}-${index}`, type, x: spot.x, z: spot.z, rotation: spot.rotation, existing: true },
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

  // Save changed fields of one piece from the piece panel: its size, where it
  // stands, how it is turned, its colour, its finish or whether you own it.
  // A size of null means "back to the catalog's size", so that field is taken off.
  // After a change of size or place the piece is kept inside the walls.
  function handleChangePiece(id, changes) {
    const nextPieces = pieces.map((piece) => {
      if (piece.id !== id) return piece;
      const changed = { ...piece, ...changes };
      if (changes.size === null) delete changed.size;
      return clampToRoom(changed, room);
    });
    const name = getItem(pieces.find((piece) => piece.id === id).type).name;
    changePieces(nextPieces, `${name} changed`);
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

  // Open a panel by its name. Pressing the button of the panel that is already
  // open closes it. Opening a different one closes the one before.
  function togglePanel(name) {
    if (openPanel === name) setOpenPanel(null);
    else setOpenPanel(name);
  }

  // The lighting and the floor and walls buttons on the stage. Pressing the one whose
  // panel is open closes the tools section; in the side layout it goes back to the furniture.
  function handleTool(name) {
    if (tool === name) setTool(layout === 'side' ? 'furniture' : null);
    else setTool(name);
  }

  // Change where the tools sit, and remember the choice.
  function handleLayout(next) {
    setLayout(next);
    localStorage.setItem('apt-studio-layout', next);
    if (next === 'side') setTool(tool || 'furniture');
    if (next === 'stage' && tool === 'furniture') setTool(null);
  }

  function handleUnits(next) {
    setUnits(next);
    localStorage.setItem('apt-studio-units', next);
  }

  // The welcome is done, one way or another. Remember that, and start the tour of tips
  // if this browser has not seen it yet.
  function finishWelcome() {
    localStorage.setItem('apt-studio-welcomed', 'yes');
    setIsWelcoming(false);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    if (!localStorage.getItem('apt-studio-toured')) setIsTouring(true);
  }

  function finishTour() {
    localStorage.setItem('apt-studio-toured', 'yes');
    setIsTouring(false);
  }

  // A double click in the room: on the floor, a wall, a window or a door. Each opens
  // the floor and walls panel, where that part is changed.
  function handleEditPart() {
    setTool('surfaces');
  }

  // A furniture tile was dropped on the stage at (clientX, clientY), in pixels on
  // the screen. A ray is shot from the camera through that point, and where it
  // meets the floor (the flat plane at height 0) is where the piece goes.
  function handleDropItem(type, clientX, clientY) {
    const box = canvasRef.current.getBoundingClientRect();
    // the same point counted from -1 to 1 across the canvas, which is what three.js asks for
    const pointer = new THREE.Vector2(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, cameraRef.current);
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = ray.ray.intersectPlane(floor, new THREE.Vector3());
    if (point) handleAddItem(type, { x: point.x, z: point.z });
    else handleAddItem(type);
  }

  function handleZoom(nextZoom) {
    setZoom(Math.min(Math.max(nextZoom, 0.5), 3));
  }

  // Close whichever dialog is open, the same as its Cancel or Close button.
  // Gives back true if one was open.
  function closeDialog() {
    const wasOpen = isEditingRoom || isAddingRoom || isConnecting || isFinding || isPickingPlan;
    setIsEditingRoom(false);
    setIsAddingRoom(false);
    setIsConnecting(false);
    setIsFinding(false);
    setIsPickingPlan(false);
    return wasOpen;
  }

  // Keyboard shortcuts. The effect runs again whenever something it reads changes,
  // so the handler always sees the current pieces and selection.
  useEffect(() => {
    function handleKeyDown(event) {
      // Escape closes an open dialog first, even while you are typing in it.
      if (event.key === 'Escape' && closeDialog()) {
        event.preventDefault();
        return;
      }
      const isTyping = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
      if (isTyping || isEditingRoom || isAddingRoom || isPickingPlan || isConnecting) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      // Escape closes an open panel first, before it clears the selection.
      if (event.key === 'Escape' && openPanel) {
        setOpenPanel(null);
        return;
      }
      if (!selectedId) return;
      const step = 0.05;
      if (event.key === 'ArrowLeft') handleNudge(-step, 0);
      else if (event.key === 'ArrowRight') handleNudge(step, 0);
      else if (event.key === 'ArrowUp') handleNudge(0, -step);
      else if (event.key === 'ArrowDown') handleNudge(0, step);
      else if (event.key.toLowerCase() === 'r') handleRotate(selectedId);
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
          size: sizeOf(piece),
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

  // The furniture made from moodboard pictures comes from the sample photos.
  const boardGroupName = moodboard.source === 'pinterest' ? 'From the sample photos' : 'From your board';

  // The piece that is selected, if any. While there is one, its panel replaces the moodboard.
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);

  // A saved room may hold furniture made from moodboard images. Wait for the list
  // of those models before drawing the room, so every piece can be looked up.
  if (!isReady) return <div className="app" aria-busy="true" />;

  return (
    <div className={`app app--${tab}`}>
      <header className="top-bar">
        <div className="top-bar__left">
          <RoomTabs
            homeName={homeName}
            rooms={rooms}
            activeRoomId={activeRoomId}
            onRenameHome={onRenameHome}
            onPick={handlePickRoom}
            onEdit={() => setIsEditingRoom(true)}
            onAdd={() => setIsAddingRoom(true)}
          />
        </div>
        {/* The mark sits in the middle of the top bar, between the rooms and the menus. */}
        <Logo height={24} />
        <div className="top-bar__right">
          {/* These two only show while their section is closed, to open it again. */}
          {layout === 'side' && tool === null && (
            <Button variant="glass" icon="sidebar" aria-label="Open the tools" title="Open the tools" onClick={() => setTool('furniture')} />
          )}
          {!isSideOpen && (
            <Button variant="glass" icon="image" aria-label="Open the moodboard" title="Open the moodboard" onClick={() => setIsSideOpen(true)} />
          )}
          <SettingsMenu
            isOpen={openPanel === 'settings'}
            onToggle={() => togglePanel('settings')}
            onYourFurniture={() => {
              setOpenPanel(null);
              setIsFinding(true);
            }}
            onShowTips={() => {
              setOpenPanel(null);
              setIsTouring(true);
            }}
            onStartOver={() => {
              setOpenPanel(null);
              onStartOver();
              setSelectedId(null);
              setPast([]);
              setFuture([]);
              setToast(null);
              setIsWelcoming(true); // back to "How would you like to start?"
            }}
          />
          <PreferencesMenu
            isOpen={openPanel === 'preferences'}
            onToggle={() => togglePanel('preferences')}
            units={units}
            onUnits={handleUnits}
            layout={layout}
            onLayout={handleLayout}
          />
          <AccountButton user={user} onLogOut={onLogOut} state={accountState} onTryAgain={onTryAgain} />
        </div>
      </header>

      {/* The classes say which sections are open, so the CSS can lay out the columns. */}
      <main
        className={`workspace${tool ? ' has-tools' : ''}${isSideOpen || selectedPiece ? '' : ' no-side'}`}
        style={{ '--moodboard-width': `${moodboardWidth}px` }}
      >
        {tool && (
          <ToolsPanel
            tab={tool}
            tabs={layout === 'side' ? ['furniture', 'lighting', 'surfaces'] : [tool]}
            onTab={setTool}
            onClose={() => setTool(null)}
            items={[...CATALOG, ...pinModels]}
            boardName={boardGroupName}
            pieces={pieces}
            onAddItem={handleAddItem}
            lighting={lighting}
            onLighting={setLighting}
            surfaces={surfaces}
            onSurfaces={setSurfaces}
            room={room}
            onRoomChange={changeRoom}
            units={units}
          />
        )}
        <PreviewPanel
          pinModels={pinModels}
          boardName={boardGroupName}
          room={room}
          pieces={pieces}
          selectedId={selectedId}
          isScoreOpen={openPanel === 'score'}
          onToggleScore={() => togglePanel('score')}
          onView={setView}
          onGrid={() => setShowGrid(!showGrid)}
          openTool={tool}
          onTool={handleTool}
          isDownloadOpen={openPanel === 'download'}
          onToggleDownload={() => togglePanel('download')}
          onCloseDownload={() => setOpenPanel(null)}
          onRoomFile={handleDownloadRoom}
          showStrip={layout === 'stage'}
          units={units}
          onEdit={handleEditPart}
          onDropItem={handleDropItem}
          roomId={activeRoom.id}
          startView={activeRoom.insideView}
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
        {(isSideOpen || selectedPiece) && (
          <div
            className="divider"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the moodboard"
            // A separator you can move tells screen readers where it is now and how far it goes.
            aria-valuenow={moodboardWidth}
            aria-valuemin={MIN_MOODBOARD_WIDTH}
            aria-valuemax={MAX_MOODBOARD_WIDTH}
            tabIndex={0}
            onPointerDown={handleDividerDown}
            onKeyDown={handleDividerKey}
          />
        )}
        {selectedPiece ? (
          <PiecePanel
            piece={selectedPiece}
            room={room}
            fit={getFit(selectedPiece, pieces, room)}
            units={units}
            onRotate={handleRotate}
            onRemove={handleRemove}
            onChange={handleChangePiece}
            onSetLink={handleSetLink}
            lighting={lighting}
            onLightingChange={setLighting}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          isSideOpen && (
            <SidePanel
              tab={sideTab}
              onTab={setSideTab}
              onClose={() => setIsSideOpen(false)}
              pieces={pieces}
              moodboard={moodboard}
              pickedIds={pickedIds}
              user={user}
              pinModels={pinModels}
              onAddItem={handleAddItem}
              onTogglePick={onTogglePick}
              onConnect={() => setIsConnecting(true)}
            />
          )
        )}
      </main>

      <TabBar tab={tab} onChange={setTab} />

      {isWelcoming && (
        <Welcome
          units={units}
          onPlan={() => {
            finishWelcome();
            setIsPickingPlan(true);
          }}
          onReady={finishWelcome}
          onExample={() => {
            onStartWithExample();
            finishWelcome();
          }}
          onAnswers={(details) => {
            onFirstRoom(details);
            finishWelcome();
          }}
        />
      )}
      {isTouring && !isWelcoming && !isPickingPlan && <Tips onDone={finishTour} />}

      {isFinding && <FoundFurniture onAdd={handleAddExisting} onClose={() => setIsFinding(false)} />}
      {isPickingPlan && <PlanRooms room={room} units={units} onSave={handleSaveSize} onClose={() => setIsPickingPlan(false)} />}

      {isEditingRoom && (
        <RoomSetup
          units={units}
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
      {isAddingRoom && <RoomSetup units={units} onSave={handleCreateRoom} onUseExample={handleUseExample} onCancel={() => setIsAddingRoom(false)} />}

      {isConnecting && (
        <PinterestImport
          isConnected={moodboard.source === 'pinterest'}
          onImport={handleImport}
          onUseSamples={() => {
            onUseSamples();
            setIsConnecting(false);
          }}
          onCancel={() => setIsConnecting(false)}
        />
      )}

      {toast && (
        <UndoToast key={toast.key} message={toast.text} onUndo={handleUndo} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

export default Workspace;
