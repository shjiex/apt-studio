import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import FurnitureModel from './FurnitureModel.jsx';
import { CATEGORY_COLORS, getItem } from '../data/catalog.js';
import { doorOpening, getFit, getFootprint, getWallDistances, openingOf, wallBlocks, wallFrame, keepClear } from '../lib/room.js';
import { bulbIntensity, bulbOf, fixedLightPoints, getSun, kelvinToColor, lightOutput } from '../lib/light.js';
import { asset } from '../lib/paths.js';

// The room is ONE 3D scene. "2D" is that scene seen from straight above and
// "3D" is the same scene seen from a lower angle. Nothing is drawn twice.

const WALL = 0.1; // wall thickness in metres
// Two parts of this view are big pieces of code that the plan never uses: the
// extra pass that shades corners (RoomEffects.jsx, for 3D and inside) and the
// realistic picture (PathTraced.jsx, inside only). import() fetches a file only
// when it is asked for, so the plan opens without them. Each is fetched once,
// ahead of the moment it is needed, and its component is kept in `extras`, so
// switching it on afterwards is instant. If a file cannot be fetched (no
// connection), loadExtra gives back null and that part is left out.
const extras = { effects: null, tracer: null };
function loadExtra(name) {
  const file = name === 'effects' ? import('./RoomEffects.jsx') : import('./PathTraced.jsx');
  return file
    .then((module) => {
      extras[name] = module.default; // the component the file exports
      return module.default;
    })
    .catch(() => null);
}

const HALL_DEPTH = 1.2; // how far the hall behind a doorway goes back, in metres
const DOOR_OPEN = THREE.MathUtils.degToRad(75); // how far a door stands open
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
function SoftLight({ daylight, strength }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const surroundings = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = surroundings;

    return () => {
      scene.environment = null;
      surroundings.dispose();
      generator.dispose();
    };
  }, [gl, scene]);

  // With daylight off only a little light is left, so the room's own bulbs do the work.
  useEffect(() => {
    scene.environmentIntensity = daylight ? 0.22 + 0.25 * strength : 0.05;
  }, [scene, daylight, strength]);

  return null;
}

// Moves the camera between the top view and the angled view.
// Where you stand in the inside view: the front right corner, half a metre from each wall, at eye height.
// `stand` is the spot on the floor you clicked to stand on, if you have clicked one.
function standingPoint(room, stand) {
  if (stand) return new THREE.Vector3(stand.x, 1.5, stand.z);
  return new THREE.Vector3(room.width / 2 - 0.5, 1.5, room.length / 2 - 0.5);
}

function CameraRig({ view, room, zoom, orbit, look, stand }) {
  // 0 means fully top view, 1 means fully 3D. It eases toward the target.
  const progress = useRef(view === '3d' ? 1 : 0);
  // The camera eases toward the angle and zoom the person asked for.
  const turnNow = useRef(orbit.turn);
  const tiltNow = useRef(orbit.tilt);
  const zoomNow = useRef(zoom);
  // The same for where you look in the inside view.
  const yawNow = useRef(look.yaw);
  const pitchNow = useRef(look.pitch);

  useFrame((state, delta) => {
    const target = view === '3d' ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, target, 5, delta);
    const t = progress.current;
    const camera = state.camera;

    // Tilt away from straight down, and turn toward the front-right corner.
    turnNow.current = THREE.MathUtils.damp(turnNow.current, orbit.turn, 10, delta);
    tiltNow.current = THREE.MathUtils.damp(tiltNow.current, orbit.tilt, 10, delta);
    zoomNow.current = THREE.MathUtils.damp(zoomNow.current, zoom, 10, delta);

    // Inside view: stand in the room like a person with a camera, and look where the drag points.
    // A wide lens (68 degrees) takes in the room; zooming narrows it.
    if (view === 'inside') {
      const eye = standingPoint(room, stand);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, eye.x, 8, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, eye.y, 8, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, eye.z, 8, delta);
      camera.fov = THREE.MathUtils.damp(camera.fov, Math.min(68 / zoomNow.current, 95), 8, delta);
      // ease towards where the drag (or a move to a new spot) points, so a turn is never a jump
      yawNow.current = THREE.MathUtils.damp(yawNow.current, look.yaw, 12, delta);
      pitchNow.current = THREE.MathUtils.damp(pitchNow.current, look.pitch, 12, delta);
      const yaw = THREE.MathUtils.degToRad(yawNow.current);
      const pitch = THREE.MathUtils.degToRad(pitchNow.current);
      camera.near = 0.1; // standing in the room, things can be right in front of the camera
      // yaw 0 looks at the window wall (-z); a positive yaw turns to the right
      camera.lookAt(
        camera.position.x + Math.sin(yaw) * Math.cos(pitch),
        camera.position.y + Math.sin(pitch),
        camera.position.z - Math.cos(yaw) * Math.cos(pitch)
      );
      camera.updateProjectionMatrix();
      progress.current = 1; // going back to 3D starts from the angled view, not the plan
      return;
    }
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

    // The nearest thing the camera still draws ("near"). A graphics card can tell
    // two surfaces apart only if their distances differ by enough, and how much is
    // enough grows fast when near is tiny compared with how far away things are.
    // The plan's camera is about 80 m up (a narrow lens from far away is what makes
    // it flat). With near at 0.1 m, the card could only tell heights about 5 mm
    // apart, and the flat marks on the floor sit closer together than that (door
    // swing 4 mm, selection mark 6 mm, daylight 8 mm, floor shadow 12 mm, rug top
    // 16 and 18 mm), so they flickered against each other. Starting the drawing
    // just above the room brings that down to a few thousandths of a millimetre.
    // In 3D the camera is close and this works out to the same 0.1 m as before.
    const reach = THREE.MathUtils.lerp(room.height + 2, GROUND_SIZE, t);
    camera.near = Math.max(0.1, distance - reach);

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

// A photo of your own floor or wall as a texture. It repeats mirrored (every
// second copy is flipped), so the edges of neighbouring copies always match.
function usePhotoTexture(photo) {
  return useMemo(() => {
    if (!photo) return null;
    const texture = new THREE.TextureLoader().load(photo);
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [photo]);
}

// The floor's textures. With a photo: just its colours, repeated so that one
// copy covers `span` metres across. Without: the oak boards.
function useFloorTextures(room, floor) {
  const photo = usePhotoTexture(floor.kind === 'photo' ? floor.photo : null);
  const oak = useOakTextures(room);
  if (!photo) return oak;
  photo.repeat.set(room.width / floor.span, room.length / (floor.span / floor.aspect));
  return { colour: photo, normal: null, roughness: null };
}

function useOakTextures(room) {
  return useMemo(() => {
    const loader = new THREE.TextureLoader();
    const textures = {
      colour: loader.load(asset('/textures/floor-oak-colour.jpg')),
      normal: loader.load(asset('/textures/floor-oak-normal.jpg')),
      roughness: loader.load(asset('/textures/floor-oak-roughness.jpg')),
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
// The material of one wall block: paint, or your photo. Each block gets its own
// copy of the photo, placed by where the block starts (left, bottom, in metres)
// so the pattern runs on from one block to the next.
function WallSkin({ wall, photo, size, start }) {
  const map = useMemo(() => {
    if (!photo) return null;
    const copy = photo.clone();
    const tall = wall.span / wall.aspect; // how many metres one copy covers up the wall
    copy.repeat.set(size[0] / wall.span, size[1] / tall);
    copy.offset.set(start[0] / wall.span, start[1] / tall);
    copy.needsUpdate = true;
    return copy;
  }, [photo, wall.span, wall.aspect, size[0], size[1], start[0], start[1]]);
  // `key` makes a fresh material when a photo comes or goes, which three.js needs.
  return <meshStandardMaterial key={map ? 'photo' : 'paint'} map={map} color={map ? '#FFFFFF' : wall.color} roughness={0.95} />;
}

// One wall of the room, with its windows. It is drawn in the wall's own frame
// (see wallFrame in lib/room.js): x runs along the wall, y is up, z points into
// the room, and the wall itself fills the 10 cm behind z = 0.
// `mode` is 'real' for a wall you see at full height, or 'low' for a wall that is
// cut down to a low rim so you can see into the room. A low wall still has unseen
// full-height blocks that cast shadows, so the sun only gets in through windows.
// On the plan (`plan` is true) every window and door also has an unseen grip on
// the wall line: press it and drag to slide the window or door along its wall.
// `onGrab` is told which list it is in ('windows' or 'doors') and its id.
function Wall({ name, room, mode, inside, plan, daylight, wall, wallPhoto, onGrab }) {
  const frame = wallFrame(name, room);
  const extra = name === 'back' || name === 'front' ? WALL : 0; // these two also cover the corners
  const openings = room.windows.filter((win) => win.wall === name).map((win) => openingOf(win, room));
  // Each door as the wall sees it, plus which edge its hinge is on (-1 the left edge
  // as you face the wall from inside, 1 the right) and whether it is shut.
  const doors = room.doors
    .filter((door) => door.wall === name)
    .map((door) => ({ ...doorOpening(door, room), side: door.hinge === 'right' ? 1 : -1, shut: Boolean(door.shut) }));
  // The wall is solid everywhere except at its windows and its doorways.
  const blocks = wallBlocks(frame.length, room.height, [...openings, ...doors], extra);
  const paint = wall.kind === 'paint' ? wall.color : TRIM_COLOR; // the colour of the hall behind a doorway

  // The grip for one window or door: a box around its place on the wall that you
  // cannot see, and on top of it a dark dot in a white ring that you can, so it is
  // clear the window or door can be dragged.
  function grip(list, opening) {
    return (
      <group>
        <mesh
          userData={{ helper: true }}
          position={[0, 0.3, -WALL / 2]}
          onPointerDown={(event) => {
            event.stopPropagation();
            onGrab(list, opening.id);
          }}
          onPointerOver={() => (document.body.style.cursor = 'grab')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <boxGeometry args={[opening.half * 2, 0.6, WALL + 0.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* the handle lies flat, just above the top of the wall, so the plan's camera sees it from above */}
        <mesh userData={{ helper: true }} rotation={[-Math.PI / 2, 0, 0]} position={[0, room.height + 0.05, -WALL / 2]}>
          <circleGeometry args={[0.085, 28]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
        <mesh userData={{ helper: true }} rotation={[-Math.PI / 2, 0, 0]} position={[0, room.height + 0.06, -WALL / 2]}>
          <circleGeometry args={[0.055, 28]} />
          <meshBasicMaterial color="#111111" toneMapped={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={frame.position} rotation={[0, frame.turn, 0]}>
      {mode === 'low' && (
        <mesh position={[0, 0.06, -WALL / 2]}>
          <boxGeometry args={[frame.length + extra * 2, 0.12, WALL]} />
          <meshStandardMaterial color={TRIM_COLOR} roughness={0.95} />
        </mesh>
      )}

      {blocks.map(([from, to, bottom, top]) =>
        mode === 'real' ? (
          <group key={`${from}-${bottom}`}>
            <mesh position={[(from + to) / 2, (bottom + top) / 2, -WALL / 2]} castShadow receiveShadow>
              <boxGeometry args={[to - from, top - bottom, WALL]} />
              <WallSkin wall={wall} photo={wallPhoto} size={[to - from, top - bottom]} start={[from, bottom]} />
            </mesh>
            {/* With a wall photo, a thin plain cap covers the top of the block, so the
                plan view shows a clean wall line and not the photo squeezed into a strip. */}
            {wallPhoto && !inside && top === room.height && (
              <mesh position={[(from + to) / 2, top + 0.003, -WALL / 2]}>
                <boxGeometry args={[to - from, 0.006, WALL]} />
                <meshStandardMaterial color={TRIM_COLOR} roughness={0.95} />
              </mesh>
            )}
          </group>
        ) : (
          <mesh key={`${from}-${bottom}`} userData={{ helper: true }} position={[(from + to) / 2, (bottom + top) / 2, -WALL / 2]} castShadow>
            <boxGeometry args={[to - from, top - bottom, WALL]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        )
      )}

      {openings.map((opening) => {
        const width = opening.half * 2;
        const tall = opening.top - opening.bottom;
        const middle = (opening.top + opening.bottom) / 2;
        return (
          <group key={opening.id} position={[opening.u, 0, 0]}>
            {plan && grip('windows', opening)}
            {/* the sill, which also shows in the plan */}
            <mesh position={[0, opening.bottom - 0.02, 0.05]}>
              <boxGeometry args={[width + 0.1, 0.04, 0.1]} />
              <meshStandardMaterial color={TRIM_COLOR} />
            </mesh>
            {/* sky light on the floor in front of the window: a faint soft patch. The sun's own patch comes from the sun light. */}
            <mesh userData={{ helper: true }} visible={daylight} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0.95]} renderOrder={1}>
              <planeGeometry args={[width * 1.9, 2.4]} />
              <meshBasicMaterial
                map={WINDOW_LIGHT_TEXTURE}
                transparent
                opacity={0.16}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
            {/* seen from outside on a full wall: a bright pane by day, dark at night */}
            {mode === 'real' && !inside && (
              <mesh userData={{ helper: true }} position={[0, middle, 0.005]}>
                <planeGeometry args={[width, tall]} />
                <meshBasicMaterial color={daylight ? '#FFFFFF' : '#2A2F3A'} />
              </mesh>
            )}
            {/* on a low wall: a pale mark on the rim shows where the window is */}
            {mode === 'low' && (
              <mesh userData={{ helper: true }} position={[0, 0.125, -WALL / 2]}>
                <boxGeometry args={[width, 0.02, WALL + 0.02]} />
                <meshBasicMaterial color="#BFD9F2" />
              </mesh>
            )}
            {/* inside the room: the sky outside (a bright hazy blue by day, near black at night),
                a frame around the opening and a bar down the middle */}
            {inside && (
              <>
                <mesh userData={{ helper: true }} position={[0, middle + 0.15, -WALL - 0.4]}>
                  <planeGeometry args={[width * 4, 4]} />
                  <meshBasicMaterial color={daylight ? '#CFE3F7' : '#0E1320'} toneMapped={false} />
                </mesh>
                {[
                  [[-opening.half + 0.02, middle], [0.04, tall, 0.06]],
                  [[opening.half - 0.02, middle], [0.04, tall, 0.06]],
                  [[0, middle], [0.03, tall, 0.05]],
                  [[0, opening.top - 0.02], [width, 0.04, 0.06]],
                  [[0, opening.bottom + 0.02], [width, 0.04, 0.06]],
                ].map(([place, size]) => (
                  <mesh key={place.join()} position={[place[0], place[1], -WALL / 2]} castShadow>
                    <boxGeometry args={size} />
                    <meshStandardMaterial color="#F6F5F1" roughness={0.5} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        );
      })}

      {/* Doors: a doorway through the wall with its door, open or shut, and the floor the
          door swings over as a pale quarter circle. `side` says which edge the hinge is on. */}
      {doors.map((door) => (
        <group key={door.id} position={[door.u, 0, 0]}>
          {plan && grip('doors', door)}
          {/* Sunlight must not come in through a doorway (a hall is behind it, not the
              sky), so an unseen sheet in the doorway still casts a shadow. */}
          <mesh userData={{ helper: true }} position={[0, door.top / 2, -WALL]} castShadow>
            <boxGeometry args={[door.half * 2, door.top, 0.02]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
          {mode === 'real' && (
            <>
              {/* The door: 4 cm thick, with a knob on each face. The group sits on the hinge
                  and is turned about it. Shut, the door lies in the doorway. Open, it is
                  swung 75 degrees into the room: not a full 90, so it reads as a door and
                  not as part of the next wall. With the hinge on the left the shut door
                  points along +x and opens by turning the other way round the up axis; with
                  the hinge on the right it points along -x (half a turn) and opens onward. */}
              <group
                position={[door.side * door.half, 0, 0]}
                rotation={[0, door.side === -1 ? -(door.shut ? 0 : DOOR_OPEN) : Math.PI + (door.shut ? 0 : DOOR_OPEN), 0]}
              >
                <mesh position={[door.half, door.top / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[door.half * 2 - 0.02, door.top - 0.02, 0.04]} />
                  <meshStandardMaterial color="#FBFAF7" roughness={0.45} />
                </mesh>
                {[-1, 1].map((face) => (
                  <mesh key={face} position={[door.half * 2 - 0.09, 1.0, face * 0.045]}>
                    <sphereGeometry args={[0.028, 16, 12]} />
                    <meshStandardMaterial color="#8E8A84" roughness={0.35} metalness={0.8} />
                  </mesh>
                ))}
              </group>
              {/* the frame around the doorway: two posts and the piece across the top */}
              {[
                [[-door.half - 0.03, door.top / 2], [0.06, door.top, WALL + 0.03]],
                [[door.half + 0.03, door.top / 2], [0.06, door.top, WALL + 0.03]],
                [[0, door.top + 0.03], [door.half * 2 + 0.12, 0.06, WALL + 0.03]],
              ].map(([place, size]) => (
                <mesh key={place.join()} position={[place[0], place[1], -WALL / 2 + 0.015]} castShadow>
                  <boxGeometry args={size} />
                  <meshStandardMaterial color="#F6F5F1" roughness={0.5} />
                </mesh>
              ))}
            </>
          )}
          {/* From outside (the 3D view) a hall would stick out past the wall and show from
              above, so there the doorway is closed at the back by a flat dim sheet. You see
              a dark doorway and not the bright ground beyond it. On the plan the sheet is
              seen edge on, so it does not show. */}
          {!inside && mode === 'real' && (
            <mesh userData={{ helper: true }} position={[0, door.top / 2, -WALL + 0.002]}>
              <planeGeometry args={[door.half * 2, door.top]} />
              <meshBasicMaterial color="#6F6B65" />
            </mesh>
          )}
          {/* Seen from inside the room, a short hall lies behind the doorway: a back wall,
              a floor, a ceiling and two sides, 10 cm wider than the door on each side. Its parts cast and take shadows, so the
              sun cannot light it from outside. It is only
              built for the inside view; from above it would stick out of the plan. */}
          {inside && (
            <group position={[0, 0, -WALL]}>
              <mesh position={[0, room.height / 2, -HALL_DEPTH]} castShadow receiveShadow>
                <planeGeometry args={[door.half * 2 + 0.2, room.height]} />
                <meshStandardMaterial color={paint} roughness={0.95} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -HALL_DEPTH / 2]} receiveShadow>
                <planeGeometry args={[door.half * 2 + 0.2, HALL_DEPTH]} />
                <meshStandardMaterial color="#A89F92" roughness={0.8} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, room.height, -HALL_DEPTH / 2]} castShadow receiveShadow>
                <planeGeometry args={[door.half * 2 + 0.2, HALL_DEPTH]} />
                <meshStandardMaterial color="#F4F3EF" roughness={0.95} side={THREE.DoubleSide} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} rotation={[0, Math.PI / 2, 0]} position={[side * (door.half + 0.1), room.height / 2, -HALL_DEPTH / 2]} castShadow receiveShadow>
                  <planeGeometry args={[HALL_DEPTH, room.height]} />
                  <meshStandardMaterial color={paint} roughness={0.95} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          )}
          {mode === 'low' && (
            <mesh userData={{ helper: true }} position={[0, 0.125, -WALL / 2]}>
              <boxGeometry args={[door.half * 2, 0.02, WALL + 0.02]} />
              <meshBasicMaterial color="#CFC9BE" />
            </mesh>
          )}
          {/* the quarter circle starts at the hinge: it opens to the right of a left hinge and to the left of a right one */}
          <mesh userData={{ helper: true }} visible={!inside} rotation={[-Math.PI / 2, 0, 0]} position={[door.side * door.half, 0.004, 0]}>
            <circleGeometry args={[door.half * 2, 32, door.side === -1 ? -Math.PI / 2 : Math.PI, Math.PI / 2]} />
            <meshBasicMaterial color="#D9D8D3" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// `inside` is true for the inside view: all four walls stand at full height and the room has a ceiling.
function RoomShell({ room, tallSide, daylight, surfaces, inside, plan, onGrab }) {
  const { width, length, height } = room;
  const floor = useFloorTextures(room, surfaces.floor);
  const wall = surfaces.wall;
  const wallPhoto = usePhotoTexture(wall.kind === 'photo' ? wall.photo : null);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          key={floor.normal ? 'oak' : 'photo'}
          map={floor.colour}
          normalMap={floor.normal}
          roughnessMap={floor.roughness}
          roughness={floor.normal ? 1 : 0.75}
        />
      </mesh>

      {/* The four walls. Inside the room all are real. From outside, the back wall and
          the side wall away from the camera are real, and the other two are low rims. */}
      {['back', 'left', 'right', 'front'].map((name) => (
        <Wall
          key={name}
          name={name}
          room={room}
          mode={inside || name === 'back' || name === tallSide ? 'real' : 'low'}
          inside={inside}
          plan={plan}
          daylight={daylight}
          wall={wall}
          wallPhoto={wallPhoto}
          onGrab={onGrab}
        />
      ))}

      {inside ? (
        <>
          {/* Inside view: a real ceiling, and skirting boards along the foot of all four walls. */}
          <mesh position={[0, height + 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + WALL * 2, 0.04, length + WALL * 2]} />
            <meshStandardMaterial color="#FAFAF8" roughness={0.95} />
          </mesh>
          {[
            [[0, 0.04, -length / 2 + 0.006], [width, 0.08, 0.012]],
            [[0, 0.04, length / 2 - 0.006], [width, 0.08, 0.012]],
            [[-width / 2 + 0.006, 0.04, 0], [0.012, 0.08, length]],
            [[width / 2 - 0.006, 0.04, 0], [0.012, 0.08, length]],
          ].map(([position, size]) => (
            <mesh key={position.join()} position={position} receiveShadow>
              <boxGeometry args={size} />
              <meshStandardMaterial color="#F6F5F1" roughness={0.6} />
            </mesh>
          ))}
        </>
      ) : (
        // From outside: a ceiling you cannot see. It is not drawn (colorWrite off) but it
        // still casts a shadow, so sunlight does not pour in over the top of the open room.
        <mesh userData={{ helper: true }} position={[0, height + 0.02, 0]} castShadow>
          <boxGeometry args={[width + WALL * 2, 0.04, length + WALL * 2]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      )}

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

// A soft-edged square, drawn once on a small canvas and reused.
// Black, it is the dark patch under a piece of furniture: real furniture darkens the
// floor right under it, and without that pieces look like they float.
// White, it is the daylight that falls on the floor in front of the window.
function makeSoftPatch(colour) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const pen = canvas.getContext('2d');
  // A square drawn off the canvas, so only its blurred shadow lands on it.
  pen.shadowColor = colour;
  pen.shadowBlur = 22;
  pen.shadowOffsetX = 200;
  pen.fillRect(-200 + 30, 30, 68, 68);
  return new THREE.CanvasTexture(canvas);
}
const CONTACT_TEXTURE = makeSoftPatch('rgb(0, 0, 0)');
const WINDOW_LIGHT_TEXTURE = makeSoftPatch('rgb(255, 244, 225)');

const SETTLE_TIME = 0.35; // seconds
const PREFERS_LESS_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One piece of furniture standing in the room.
// `plan` is true in the 2D view, where furniture you already own is drawn grey.
// In 3D and inside the room it keeps its real colours.
function Piece({ piece, fit, isSelected, plan, onPointerDown }) {
  const item = getItem(piece.type);
  const footprint = getFootprint({ ...piece, rotation: 0 });
  const group = useRef(null);
  const age = useRef(0); // seconds since this piece appeared

  // A new piece settles into the room: for a third of a second it grows from
  // 85 % to full size and comes down a few centimetres, fast at first, then gently.
  // Someone who asked their system for less motion gets it in place at once.
  useFrame((state, delta) => {
    if (age.current >= SETTLE_TIME || !group.current) return;
    age.current = PREFERS_LESS_MOTION ? SETTLE_TIME : Math.min(age.current + delta, SETTLE_TIME);
    const done = 1 - Math.pow(1 - age.current / SETTLE_TIME, 3); // 0 to 1, easing out
    group.current.scale.setScalar(0.85 + 0.15 * done);
    group.current.position.y = 0.12 * (1 - done);
  });

  return (
    <group
      ref={group}
      position={[piece.x, 0, piece.z]}
      rotation={[0, -THREE.MathUtils.degToRad(piece.rotation), 0]}
      onPointerDown={(event) => onPointerDown(event, piece)}
    >
      {isSelected && (
        <mesh userData={{ helper: true }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <planeGeometry args={[footprint.w + 0.3, footprint.d + 0.3]} />
          {/* depthWrite off: a see-through mark must not hide what is drawn after it */}
          <meshBasicMaterial color={FIT_COLORS[fit]} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      {/* the dark patch on the floor under the piece; a rug lies flat and needs none */}
      {item.size.h > 0.1 && (
        <mesh userData={{ helper: true }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={1}>
          <planeGeometry args={[footprint.w * 1.5, footprint.d * 1.5]} />
          <meshBasicMaterial
            map={CONTACT_TEXTURE}
            transparent
            opacity={0.55}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      )}
      <FurnitureModel
        type={item.baseType || piece.type}
        size={item.size}
        color={CATEGORY_COLORS[item.category]}
        muted={piece.existing && plan}
        model={item.model}
      />
    </group>
  );
}

// Everything inside the canvas. Kept separate from Room3D so it can use
// pointer events from React Three Fiber.
function Scene({ room, pieces, selectedId, view, showGrid, zoom, lighting, surfaces, realistic, brightness, onPasses, onRoomChange, onSelect, onMove, onDragStart }) {
  // While a piece is being dragged we remember which one, and where on the
  // piece the pointer grabbed it, so it does not jump to the pointer.
  const [drag, setDrag] = useState(null);
  // The 3D viewing angle in degrees. Dragging empty floor in 3D changes it.
  const [orbit, setOrbit] = useState({ turn: 32, tilt: 55 });
  // The window or door being slid along its wall on the plan: { list, id }, or null.
  const [grab, setGrab] = useState(null);
  // Which way you look in the inside view, in degrees. yaw 0 faces the window wall.
  const [look, setLook] = useState({ yaw: -38, pitch: -6 });
  // Where you stand in the inside view: { x, z } after a click on the floor, or null for the usual corner.
  const [stand, setStand] = useState(null);
  // Where an orbit or look drag began: { x, y, and the angles then }, or null when not dragging the view.
  const orbitStart = useRef(null);

  useEffect(() => {
    // Letting go anywhere, even outside the canvas, ends a drag or an orbit.
    function handleUp() {
      // A press on the floor that never turned into a drag is a click: stand there.
      const start = orbitStart.current;
      if (start && start.look && !start.moved && start.floor) {
        setStand(start.floor);
        // Turn to face the middle of the room from the new spot, so you never end up
        // with your nose against a wall. Yaw 0 looks at the back wall (-z), and the
        // new yaw is written as the nearest turn from the old one, not a full spin.
        const toMiddle = THREE.MathUtils.radToDeg(Math.atan2(-start.floor.x, start.floor.z));
        const isAtMiddle = Math.hypot(start.floor.x, start.floor.z) < 0.5;
        if (!isAtMiddle) {
          const turn = ((((toMiddle - start.look.yaw) % 360) + 540) % 360) - 180;
          setLook({ yaw: start.look.yaw + turn, pitch: start.look.pitch });
        }
      }
      setDrag(null);
      setGrab(null);
      orbitStart.current = null;
    }
    function handleMove(event) {
      const start = orbitStart.current;
      if (!start) return;
      // moving more than a few pixels makes it a drag, not a click
      if (Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > 4) start.moved = true;
      if (start.look) {
        // Inside: dragging pulls the room past you, so dragging right turns you left.
        setLook({
          yaw: start.look.yaw - (event.clientX - start.x) * 0.18,
          pitch: Math.min(Math.max(start.look.pitch + (event.clientY - start.y) * 0.12, -35), 35),
        });
        return;
      }
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
    // Inside the room, the same press starts looking around.
    if (view === 'inside') {
      // Remember where on the floor the press landed, if it is inside the room: a
      // click there moves you to that spot. You stand at least 40 cm from every
      // wall, so a click right by a wall puts you just in front of it.
      const point = getFloorPoint(event);
      const isOnFloor = point && Math.abs(point.x) < room.width / 2 && Math.abs(point.z) < room.length / 2;
      const keepIn = (value, half) => Math.min(Math.max(value, -(half - 0.4)), half - 0.4);
      orbitStart.current = {
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
        look,
        floor: isOnFloor ? { x: keepIn(point.x, room.width / 2), z: keepIn(point.z, room.length / 2) } : null,
      };
    }
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

  // Where the sun is right now, from the lighting the person described.
  const sun = getSun(lighting);

  // The realistic picture is only offered inside the room, where the room is closed.
  const isTracing = realistic && view === 'inside';
  // True once the realistic picture has drawn its first frame. Until then the
  // normal picture stays on screen, so switching Realistic on never shows an
  // empty or dark stage while the tracer gets ready.
  const [tracedShown, setTracedShown] = useState(false);

  // The two big extras, as components, once their files have arrived (null until then).
  // A component is a function, and React would call a function handed to a state
  // setter, so it is wrapped: setRoomEffects(() => part).
  const [RoomEffects, setRoomEffects] = useState(() => extras.effects);
  const [PathTraced, setPathTraced] = useState(() => extras.tracer);
  // Fetch them ahead of time, while nobody is waiting: the corner shading a moment
  // after the room opens (at once if a view that uses it is already open), and the
  // realistic picture as soon as you step inside, the only place its switch is offered.
  useEffect(() => {
    if (RoomEffects) return undefined;
    const timer = setTimeout(() => loadExtra('effects').then((part) => part && setRoomEffects(() => part)), view === '2d' ? 1500 : 0);
    return () => clearTimeout(timer);
  }, [view, RoomEffects]);
  useEffect(() => {
    if (view === 'inside' && !PathTraced) loadExtra('tracer').then((part) => part && setPathTraced(() => part));
  }, [view, PathTraced]);
  // A text that changes whenever the room's contents change, so the realistic picture
  // knows to start again. A photo is long, so only its length goes in.
  const signature = JSON.stringify([
    room,
    pieces,
    lighting,
    [surfaces.floor.kind, surfaces.floor.span, (surfaces.floor.photo || '').length],
    [surfaces.wall.kind, surfaces.wall.color, surfaces.wall.span, (surfaces.wall.photo || '').length],
    selectedId,
  ]);

  function handleFloorMove(event) {
    // Sliding a window or door: it follows the pointer along its wall. "Along" is
    // counted left to right on the back and front walls, back to front on the sides.
    if (grab) {
      const point = getFloorPoint(event);
      if (!point) return;
      const held = room[grab.list].find((entry) => entry.id === grab.id);
      const acrossRoom = held.wall === 'back' || held.wall === 'front';
      const along = acrossRoom ? point.x / room.width + 0.5 : point.z / room.length + 0.5;
      const kept = Math.min(Math.max(along, 0.02), 0.98);
      // It may not overlap another window or door on the wall: it stops beside it,
      // and jumps to the far side once the pointer is nearer to that side.
      const moved = keepClear({ ...held, along: kept }, grab.list, room);
      if (moved) onRoomChange({ ...room, [grab.list]: room[grab.list].map((entry) => (entry.id === grab.id ? moved : entry)) });
      return;
    }
    if (!drag) return;
    const point = getFloorPoint(event);
    if (point) {
      onMove(drag.id, point.x - drag.offsetX, point.z - drag.offsetZ);
    }
  }

  return (
    <>
      <CameraRig view={view} room={room} zoom={zoom} orbit={orbit} look={look} stand={stand} />
      {/* The realistic picture takes over the drawing while it is on (inside view only).
          It is there the whole time you are inside, so it can get ready before you switch it on. */}
      {view === 'inside' && PathTraced && (
        <PathTraced
          isOn={isTracing}
          room={room}
          signature={signature}
          daylight={sun.up}
          strength={sun.strength}
          brightness={brightness}
          onPasses={onPasses}
          onShown={setTracedShown}
        />
      )}
      {/* the same grey as the stage behind the canvas, so the picture has no see-through parts */}
      <color attach="background" args={['#EFEEEB']} />

      {/* In 3D and inside the room, the picture gets one more pass before it is shown:
          ambient occlusion darkens the places light reaches least (corners, under
          furniture, where a wall meets the floor), which is what makes things look like
          they sit in the room. Then tone mapping rolls bright areas off the way a
          camera does. The plan view skips it: from that far away it adds nothing. */}
      {/* It stays on until the realistic picture has something to show, then steps aside. */}
      {view !== '2d' && RoomEffects && !(isTracing && tracedShown) && <RoomEffects />}
      <SoftLight daylight={sun.up} strength={sun.strength} />
      <ambientLight intensity={sun.up ? 0.22 : 0.04} />

      {/* Lights fixed to the room, as described: each bulb has its place, its colour
          (Kelvin) and its brightness (lumens). A small glowing shape shows where it is. */}
      {lighting.fixed
        .filter((light) => light.on)
        .map((light) => {
          const points = fixedLightPoints(light, room);
          return points.map((point, index) => (
            <group key={`${light.id}-${index}`} position={point}>
              <pointLight
                userData={{ fixedKind: light.kind }}
                color={kelvinToColor(light.kelvin)}
                intensity={bulbIntensity(lightOutput(light) / points.length)}
                castShadow={light.kind === 'ceiling'}
                shadow-mapSize={[512, 512]}
                shadow-bias={-0.002}
              />
              <mesh userData={{ helper: true }} position={[0, light.kind === 'ceiling' ? 0.06 : 0, 0]}>
                {light.kind === 'ceiling' ? <cylinderGeometry args={[0.16, 0.16, 0.03, 32]} /> : <sphereGeometry args={[0.05, 16, 12]} />}
                <meshBasicMaterial color={kelvinToColor(light.kelvin)} />
              </mesh>
            </group>
          ));
        })}

      {/* Every lamp standing in the room shines with its bulb: its own, or the shared one. */}
      {pieces
        .filter((piece) => (getItem(piece.type).baseType || piece.type) === 'lamp')
        .map((piece) => ({ piece, bulb: bulbOf(piece, lighting) }))
        .filter(({ bulb }) => bulb.on)
        .map(({ piece, bulb }) => (
          <pointLight
            key={piece.id}
            userData={{ lampHeight: getItem(piece.type).size.h }}
            position={[piece.x, getItem(piece.type).size.h * 0.85, piece.z]}
            color={kelvinToColor(bulb.kelvin)}
            intensity={bulbIntensity(lightOutput(bulb))}
          />
        ))}

      {/* The sun, where it stands for the chosen place, month and hour. The walls and the
          ceiling block it, so it only shines in through windows that face it, as a moving patch. */}
      <directionalLight
        position={[sun.direction[0] * 9, sun.direction[1] * 9, sun.direction[2] * 9]}
        color={kelvinToColor(sun.kelvin)}
        intensity={sun.up ? 4.2 * sun.strength : 0}
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
      <RoomShell room={room} tallSide={view === '3d' && orbit.turn < 0 ? 'right' : 'left'} daylight={sun.up} surfaces={surfaces} inside={view === 'inside'} plan={view === '2d'} onGrab={(list, id) => setGrab({ list, id })} />
      {showGrid && view !== 'inside' && <MeasureGrid room={room} />}

      {/* Inside the room, a big unseen ball around everything hears a press on a wall
          or the ceiling, so you can drag anywhere to look around. */}
      {view === 'inside' && (
        <mesh userData={{ helper: true }} onPointerDown={handleFloorDown}>
          <sphereGeometry args={[25, 16, 12]} />
          <meshBasicMaterial side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* A large see-through sheet on the floor. It hears pointer moves for
          dragging, and a press on empty floor clears the selection. */}
      <mesh
        userData={{ helper: true }}
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
          plan={view === '2d'}
          onPointerDown={handlePieceDown}
        />
      ))}
    </>
  );
}

function Room3D({ room, pieces, selectedId, view, showGrid, zoom, lighting, surfaces, realistic, brightness, onPasses, onRoomChange, onSelect, onMove, onDragStart, onZoom, onCanvasReady }) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ fov: 4, near: 0.1, far: 1000, position: [0, 60, 0.01] }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl, camera }) => onCanvasReady(gl.domElement, camera)}
      // Fill the stage without adding to its height, so the stage can shrink as well as grow.
      style={{ touchAction: 'none', position: 'absolute', inset: 0 }}
      onWheel={(event) => onZoom(event.deltaY < 0 ? zoom * 1.08 : zoom / 1.08)}
    >
      <Scene
        room={room}
        pieces={pieces}
        selectedId={selectedId}
        view={view}
        showGrid={showGrid}
        lighting={lighting}
        surfaces={surfaces}
        realistic={realistic}
        brightness={brightness}
        onPasses={onPasses}
        onRoomChange={onRoomChange}
        zoom={zoom}
        onSelect={onSelect}
        onMove={onMove}
        onDragStart={onDragStart}
      />
    </Canvas>
  );
}

export default Room3D;
