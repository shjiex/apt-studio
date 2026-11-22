import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import FurnitureModel from './FurnitureModel.jsx';
import { CATEGORY_COLORS, getItem } from '../data/catalog.js';
import { DOOR_SIZE, getFit, getFootprint, getWallDistances } from '../lib/room.js';

// The room is ONE 3D scene. "2D" is that scene seen from straight above and
// "3D" is the same scene seen from a lower angle. Nothing is drawn twice.

const WALL = 0.1; // wall thickness in metres
const WALL_COLOR = '#F4F3EF';
const TRIM_COLOR = '#E3E2DE';
const FIT_COLORS = { fits: '#1FA85A', tight: '#FFE03A', blocked: '#FF4F2B' };
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Where a pointer event's ray meets the floor, in metres.
function getFloorPoint(event) {
  return event.ray.intersectPlane(FLOOR_PLANE, new THREE.Vector3());
}

// Soft light from all around, like a bright room with big windows. Shiny and
// matte materials only look real when they have surroundings to reflect.
// RoomEnvironment is a small built-in studio, so no image file is needed.
function SoftLight() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const surroundings = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = surroundings;
    scene.environmentIntensity = 0.45;

    return () => {
      scene.environment = null;
      surroundings.dispose();
      generator.dispose();
    };
  }, [gl, scene]);

  return null;
}

// Moves the camera between the top view and the angled view.
function CameraRig({ view, room, zoom, orbit }) {
  // 0 means fully top view, 1 means fully 3D. It eases toward the target.
  const progress = useRef(view === '3d' ? 1 : 0);
  // The camera eases toward the angle and zoom the person asked for.
  const turnNow = useRef(orbit.turn);
  const tiltNow = useRef(orbit.tilt);
  const zoomNow = useRef(zoom);

  useFrame((state, delta) => {
    const target = view === '3d' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, target, 5, delta);
    const t = progress.current;
    const camera = state.camera;

    // Tilt away from straight down, and turn toward the front-right corner.
    turnNow.current = THREE.MathUtils.damp(turnNow.current, orbit.turn, 10, delta);
    tiltNow.current = THREE.MathUtils.damp(tiltNow.current, orbit.tilt, 10, delta);
    zoomNow.current = THREE.MathUtils.damp(zoomNow.current, zoom, 10, delta);
    const tilt = THREE.MathUtils.lerp(0.0001, THREE.MathUtils.degToRad(tiltNow.current), t);
    const turn = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(turnNow.current), t);
    // A narrow lens from far away looks flat like a plan; widen it for 3D.
    camera.fov = THREE.MathUtils.lerp(4, 30, t);

    // Back the camera off far enough that the whole room stays in frame.
    const aspect = state.size.width / state.size.height;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    // From above the room is a rectangle: fit its length and its width.
    const margin = 0.9;
    const topDistance = Math.max(
      (room.length / 2 + margin) / Math.tan(verticalFov / 2),
      (room.width / 2 + margin) / Math.tan(horizontalFov / 2)
    );
    // From an angle, fit a ball that wraps the whole room.
    const radius = 0.5 * Math.hypot(room.width, room.length, room.height);
    const angledDistance = (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 0.9;
    const distance = THREE.MathUtils.lerp(topDistance, angledDistance, t) / zoomNow.current;

    camera.position.set(
      distance * Math.sin(tilt) * Math.sin(turn),
      distance * Math.cos(tilt),
      distance * Math.sin(tilt) * Math.cos(turn)
    );
    camera.lookAt(0, room.height * 0.3 * t, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

// The three images that make the wood floor look real: its colour, its small
// bumps (normal) and where it is shinier or duller (roughness).
// They are made by pipeline/make_floor.py. One image covers 2.4 m of floor.
const FLOOR_TILE = 2.4;

function useFloorTextures(room) {
  return useMemo(() => {
    const loader = new THREE.TextureLoader();
    const textures = {
      colour: loader.load('/textures/floor-oak-colour.jpg'),
      normal: loader.load('/textures/floor-oak-normal.jpg'),
      roughness: loader.load('/textures/floor-oak-roughness.jpg'),
    };
    Object.values(textures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(room.width / FLOOR_TILE, room.length / FLOOR_TILE);
      texture.anisotropy = 8; // keeps the planks sharp when seen at a low angle
    });
    textures.colour.colorSpace = THREE.SRGBColorSpace;
    return textures;
  }, [room.width, room.length]);
}

// A light grid drawn on the ground AROUND the room, like graph paper the room
// sits on. Each square is half a metre. The room's own floor covers it, so the
// grid only shows outside the walls. The room's width and length are written
// along the two open sides.
const GROUND_SIZE = 40; // metres
const PIXELS_PER_METRE = 160;

function MeasureGrid({ room }) {
  const { width, length } = room;

  // One square metre of grid, repeated across the ground.
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    for (const [position, alpha] of [[1, 0.16], [128, 0.08]]) {
      ctx.strokeStyle = `rgba(15, 15, 14, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, 256);
      ctx.moveTo(0, position);
      ctx.lineTo(256, position);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(GROUND_SIZE, GROUND_SIZE);
    // Line the grid up with the room's back-left corner.
    texture.offset.set(-width / 2, length / 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [width, length]);

  // The two measurements, each painted on its own small label.
  function makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = PIXELS_PER_METRE;
    canvas.height = PIXELS_PER_METRE / 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0F0F0E';
    ctx.font = '600 34px "Host Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const widthLabel = useMemo(() => makeLabel(`${width} m`), [width]);
  const lengthLabel = useMemo(() => makeLabel(`${length} m`), [length]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial map={gridTexture} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, length / 2 + 0.45]}>
        <planeGeometry args={[1, 0.5]} />
        <meshBasicMaterial map={widthLabel} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[width / 2 + 0.45, 0.002, 0]}>
        <planeGeometry args={[1, 0.5]} />
        <meshBasicMaterial map={lengthLabel} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// Floor, two full-height far walls, two low near walls, a window and a door.
// tallSide is 'left' or 'right': the side wall away from the camera stands
// tall and the one nearest the camera is lowered so it never blocks the view.
function RoomShell({ room, tallSide }) {
  const { width, length, height } = room;
  const floor = useFloorTextures(room);
  const windowWidth = Math.min(1.2, width - 0.6);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial map={floor.colour} normalMap={floor.normal} roughnessMap={floor.roughness} />
      </mesh>

      {/* back wall and left wall stand at full height */}
      <mesh position={[0, height / 2, -length / 2 - WALL / 2]} receiveShadow>
        <boxGeometry args={[width + WALL * 2, height, WALL]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      <mesh position={[(tallSide === 'left' ? -1 : 1) * (width / 2 + WALL / 2), height / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL, height, length]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>

      {/* right wall and front wall are low so you can see into the room */}
      <mesh position={[(tallSide === 'left' ? 1 : -1) * (width / 2 + WALL / 2), 0.06, 0]}>
        <boxGeometry args={[WALL, 0.12, length]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, length / 2 + WALL / 2]}>
        <boxGeometry args={[width + WALL * 2, 0.12, WALL]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.95} />
      </mesh>

      {/* window on the back wall, with a sill that also shows in the top view */}
      <mesh position={[width / 6, 1.45, -length / 2 + 0.005]}>
        <planeGeometry args={[windowWidth, 1.1]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[width / 6, 0.88, -length / 2 + 0.05]}>
        <boxGeometry args={[windowWidth + 0.1, 0.04, 0.1]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>

      {/* door on the left wall, and the floor space it swings through */}
      {tallSide === 'left' && (
        <mesh position={[-width / 2 + 0.02, 1.0, length / 2 - DOOR_SIZE / 2]}>
          <boxGeometry args={[0.04, 2.0, DOOR_SIZE]} />
          <meshStandardMaterial color={TRIM_COLOR} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2, 0.004, length / 2]}>
        <circleGeometry args={[DOOR_SIZE, 32, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#D9D8D3" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

// Two thin lines from the selected piece to its nearest side wall and its
// nearest back or front wall, so the distance in the selection bar is visible.
function WallGuides({ piece, room }) {
  const { w, d } = getFootprint(piece);
  const gaps = getWallDistances(piece, room);
  const toLeft = gaps.left <= gaps.right;
  const toBack = gaps.back <= gaps.front;
  const sideGap = toLeft ? gaps.left : gaps.right;
  const depthGap = toBack ? gaps.back : gaps.front;
  const sideX = toLeft ? piece.x - w / 2 - sideGap / 2 : piece.x + w / 2 + sideGap / 2;
  const depthZ = toBack ? piece.z - d / 2 - depthGap / 2 : piece.z + d / 2 + depthGap / 2;
  return (
    <group>
      {sideGap > 0.02 && (
        <mesh position={[sideX, 0.02, piece.z]}>
          <boxGeometry args={[sideGap, 0.006, 0.02]} />
          <meshBasicMaterial color="#1FA85A" />
        </mesh>
      )}
      {depthGap > 0.02 && (
        <mesh position={[piece.x, 0.02, depthZ]}>
          <boxGeometry args={[0.02, 0.006, depthGap]} />
          <meshBasicMaterial color="#1FA85A" />
        </mesh>
      )}
    </group>
  );
}

// One piece of furniture standing in the room.
function Piece({ piece, fit, isSelected, onPointerDown }) {
  const item = getItem(piece.type);
  const footprint = getFootprint({ ...piece, rotation: 0 });

  return (
    <group
      position={[piece.x, 0, piece.z]}
      rotation={[0, -THREE.MathUtils.degToRad(piece.rotation), 0]}
      onPointerDown={(event) => onPointerDown(event, piece)}
    >
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <planeGeometry args={[footprint.w + 0.3, footprint.d + 0.3]} />
          <meshBasicMaterial color={FIT_COLORS[fit]} transparent opacity={0.3} />
        </mesh>
      )}
      <FurnitureModel
        type={item.baseType || piece.type}
        size={item.size}
        color={CATEGORY_COLORS[item.category]}
        muted={piece.existing}
        model={item.model}
      />
    </group>
  );
}

// Everything inside the canvas. Kept separate from Room3D so it can use
// pointer events from React Three Fiber.
function Scene({ room, pieces, selectedId, view, showGrid, zoom, onSelect, onMove, onDragStart }) {
  // While a piece is being dragged we remember which one, and where on the
  // piece the pointer grabbed it, so it does not jump to the pointer.
  const [drag, setDrag] = useState(null);
  // The 3D viewing angle in degrees. Dragging empty floor in 3D changes it.
  const [orbit, setOrbit] = useState({ turn: 32, tilt: 55 });
  // Where an orbit drag began: { x, y, turn, tilt }, or null when not orbiting.
  const orbitStart = useRef(null);

  useEffect(() => {
    // Letting go anywhere, even outside the canvas, ends a drag or an orbit.
    function handleUp() {
      setDrag(null);
      orbitStart.current = null;
    }
    function handleMove(event) {
      const start = orbitStart.current;
      if (!start) return;
      const turn = start.turn - (event.clientX - start.x) * 0.3;
      const tilt = start.tilt - (event.clientY - start.y) * 0.2;
      setOrbit({
        turn: Math.min(Math.max(turn, -70), 70),
        tilt: Math.min(Math.max(tilt, 25), 72),
      });
    }
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointermove', handleMove);
    return () => {
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointermove', handleMove);
    };
  }, []);

  // Pressing empty floor clears the selection. In 3D it also starts an orbit.
  function handleFloorDown(event) {
    onSelect(null);
    if (view === '3d') {
      orbitStart.current = {
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
        turn: orbit.turn,
        tilt: orbit.tilt,
      };
    }
  }

  function handlePieceDown(event, piece) {
    event.stopPropagation();
    onSelect(piece.id);
    const point = getFloorPoint(event);
    if (point) {
      onDragStart(); // one history entry for the whole drag
      setDrag({ id: piece.id, offsetX: point.x - piece.x, offsetZ: point.z - piece.z });
    }
  }

  function handleFloorMove(event) {
    if (!drag) return;
    const point = getFloorPoint(event);
    if (point) {
      onMove(drag.id, point.x - drag.offsetX, point.z - drag.offsetZ);
    }
  }

  return (
    <>
      <CameraRig view={view} room={room} zoom={zoom} orbit={orbit} />
      <SoftLight />
      <ambientLight intensity={0.15} />
      {/* The sun: one light from the front left, so shadows fall to the right
          where the camera can see them. */}
      <directionalLight
        position={[-room.width * 0.9, 5.5, room.length * 0.6]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <RoomShell room={room} tallSide={view === '3d' && orbit.turn < 0 ? 'right' : 'left'} />
      {showGrid && <MeasureGrid room={room} />}

      {/* A large see-through sheet on the floor. It hears pointer moves for
          dragging, and a press on empty floor clears the selection. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        onPointerMove={handleFloorMove}
        onPointerDown={handleFloorDown}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {pieces
        .filter((piece) => piece.id === selectedId)
        .map((piece) => (
          <WallGuides key={piece.id} piece={piece} room={room} />
        ))}

      {pieces.map((piece) => (
        <Piece
          key={piece.id}
          piece={piece}
          fit={getFit(piece, pieces, room)}
          isSelected={piece.id === selectedId}
          onPointerDown={handlePieceDown}
        />
      ))}
    </>
  );
}

function Room3D({ room, pieces, selectedId, view, showGrid, zoom, onSelect, onMove, onDragStart, onZoom, onCanvasReady }) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ fov: 4, near: 0.1, far: 1000, position: [0, 60, 0.01] }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => onCanvasReady(gl.domElement)}
      style={{ touchAction: 'none' }}
      onWheel={(event) => onZoom(event.deltaY < 0 ? zoom * 1.08 : zoom / 1.08)}
    >
      <Scene
        room={room}
        pieces={pieces}
        selectedId={selectedId}
        view={view}
        showGrid={showGrid}
        zoom={zoom}
        onSelect={onSelect}
        onMove={onMove}
        onDragStart={onDragStart}
      />
    </Canvas>
  );
}

export default Room3D;
