// Plain functions about the room and the pieces in it. No React in this file.
// The room is measured in metres with its centre at (0, 0).
// x runs across the room (width) and z runs front to back (length).

import { getItem, hangsOnWall, kindOfType, sizeOf } from '../data/catalog.js';

export const DEFAULT_ROOM = {
  width: 3.6,
  length: 3.0,
  height: 2.5,
  windows: [{ id: 'window-1', wall: 'back', along: 0.67, width: 1.2, bottom: 0.9, top: 2.0 }],
  doors: [{ id: 'door-1', wall: 'left', along: 0.852, width: 0.85 }],
};

// How wide a door is unless you change it, in metres.
export const DOOR_SIZE = 0.85;

// ---------- windows ----------
// A room has a list of windows. Each one says which wall it is on ('back', 'left',
// 'right' or 'front'), how far along that wall its middle is (0 to 1: left to right
// on the back and front walls, back to front on the side walls), how wide it is,
// and how high its bottom and top edges are. All sizes are in metres.

export const WALL_NAMES = { back: 'Back', left: 'Left', right: 'Right', front: 'Front' };

// The one window a new room starts with: on the back wall, right of the middle.
export function defaultWindows(size) {
  return [{ id: 'window-1', wall: 'back', along: 0.67, width: Math.min(1.2, size.width - 0.6), bottom: 0.9, top: 2.0 }];
}

// A new window for the "Add a window" button: on the first wall that has none yet.
export function newWindow(windows) {
  const free = ['back', 'right', 'left', 'front'].find((wall) => !windows.some((win) => win.wall === wall)) || 'back';
  return { id: `window-${Date.now()}`, wall: free, along: 0.5, width: 1.0, bottom: 0.9, top: 2.0 };
}

// How a wall is placed in the room, for drawing it. Every wall is drawn in its own
// frame: x runs along the wall, y is up, z points into the room. `position` and
// `turn` (an angle about the up axis) put that frame in the room. `flip` is true
// when the frame's x runs against the direction `along` is counted in.
export function wallFrame(wall, room) {
  if (wall === 'back') return { position: [0, 0, -room.length / 2], turn: 0, length: room.width, flip: false };
  if (wall === 'front') return { position: [0, 0, room.length / 2], turn: Math.PI, length: room.width, flip: true };
  if (wall === 'left') return { position: [-room.width / 2, 0, 0], turn: Math.PI / 2, length: room.length, flip: true };
  return { position: [room.width / 2, 0, 0], turn: -Math.PI / 2, length: room.length, flip: false };
}

// A window as its wall sees it: `u` is its middle in metres from the wall's middle,
// `half` is half its width. It is kept `clear` metres from the corners (15 cm for a
// window) and under the ceiling.
export function openingOf(win, room, clear = 0.15) {
  const frame = wallFrame(win.wall, room);
  const half = Math.min(win.width, frame.length - clear * 2) / 2;
  const limit = frame.length / 2 - clear - half;
  const u = Math.min(Math.max((win.along - 0.5) * frame.length, -limit), limit) * (frame.flip ? -1 : 1);
  const top = Math.min(win.top, room.height - 0.1);
  const bottom = Math.max(0, Math.min(win.bottom, top - 0.3));
  return { id: win.id, wall: win.wall, u, half, bottom, top };
}

// The same window in room coordinates: where its middle is on the wall's inner face
// (x, z) and which way is into the room from there (`inward`, as [x, z]).
export function windowInRoom(win, room, clear = 0.15) {
  const frame = wallFrame(win.wall, room);
  const opening = openingOf(win, room, clear);
  return {
    ...opening,
    x: frame.position[0] + opening.u * Math.cos(frame.turn),
    z: frame.position[2] - opening.u * Math.sin(frame.turn),
    inward: [Math.sin(frame.turn), Math.cos(frame.turn)],
  };
}

// ---------- doors ----------
// A room also has a list of doors. A door says which wall it is on, how far along
// that wall its middle is, and how wide it is. It is 2 m tall and may sit right in a corner.

const DOOR_HEIGHT = 2.0;

// The one door a new room starts with: on the left wall, at the front corner.
export function defaultDoors(size) {
  return [{ id: 'door-1', wall: 'left', along: 1 - (DOOR_SIZE / 2 + 0.02) / size.length, width: DOOR_SIZE }];
}

// A new door for the "Add a door" button: on the first wall that has none yet.
export function newDoor(doors) {
  const free = ['left', 'front', 'right', 'back'].find((wall) => !doors.some((door) => door.wall === wall)) || 'front';
  return { id: `door-${Date.now()}`, wall: free, along: 0.5, width: DOOR_SIZE };
}

// A door as its wall sees it, and in room coordinates: the same as a window that
// starts at the floor, except that it may come within 2 cm of a corner.
export function doorOpening(door, room) {
  return openingOf({ ...door, bottom: 0, top: DOOR_HEIGHT }, room, 0.02);
}
export function doorInRoom(door, room) {
  return windowInRoom({ ...door, bottom: 0, top: DOOR_HEIGHT }, room, 0.02);
}

// Keep a window or door clear of the others on its wall. `entry` is the window or
// door the way the person wants it and `list` says which it is ('windows' or
// 'doors'). If it would overlap another opening, it is moved along the wall to the
// nearest free place, 5 cm from its neighbour. Returns the entry to keep, or null
// when the wall has no free place wide enough.
export function keepClear(entry, list, room) {
  const GAP = 0.05;
  const see = (opening, kind) => (kind === 'doors' ? doorOpening(opening, room) : openingOf(opening, room));
  const mine = see(entry, list);
  const others = [
    ...room.windows.filter((win) => win.wall === entry.wall).map((win) => see(win, 'windows')),
    ...room.doors.filter((door) => door.wall === entry.wall).map((door) => see(door, 'doors')),
  ].filter((other) => other.id !== entry.id);
  // two openings overlap when their middles are closer than their half widths plus the gap
  const overlaps = (u) => others.some((other) => Math.abs(other.u - u) < other.half + mine.half + GAP - 0.0001);
  if (!overlaps(mine.u)) return entry;

  // The nearest free places are right beside each neighbour, on either side.
  const frame = wallFrame(entry.wall, room);
  const limit = frame.length / 2 - (list === 'doors' ? 0.02 : 0.15) - mine.half;
  const places = others
    .flatMap((other) => [other.u - other.half - mine.half - GAP, other.u + other.half + mine.half + GAP])
    .filter((u) => Math.abs(u) <= limit + 0.0001 && !overlaps(u))
    .sort((a, b) => Math.abs(a - mine.u) - Math.abs(b - mine.u));
  if (places.length === 0) return null;
  // back from metres on the wall to "along", which runs 0 to 1 (see openingOf)
  const along = (places[0] * (frame.flip ? -1 : 1)) / frame.length + 0.5;
  return { ...entry, along };
}

// The floor a door swings over: a square as deep as the door is wide, in front of it.
// Returned as the square's edges in room coordinates.
export function doorZone(door, room) {
  const place = doorInRoom(door, room);
  const depth = place.half * 2;
  const [inX, inZ] = place.inward;
  if (Math.abs(inX) < 0.5) {
    // on the back or front wall: the square runs along x and reaches into the room along z
    const farZ = place.z + Math.sign(inZ) * depth;
    return { minX: place.x - place.half, maxX: place.x + place.half, minZ: Math.min(place.z, farZ), maxZ: Math.max(place.z, farZ) };
  }
  const farX = place.x + Math.sign(inX) * depth;
  return { minX: Math.min(place.x, farX), maxX: Math.max(place.x, farX), minZ: place.z - place.half, maxZ: place.z + place.half };
}

// The solid parts of a wall around its windows, as [from, to, bottom, top] blocks.
// from and to are metres along the wall from its middle. `extra` lengthens the wall
// at both ends (the back and front walls also cover the corners).
export function wallBlocks(length, height, openings, extra) {
  const sorted = [...openings].sort((a, b) => a.u - a.half - (b.u - b.half));
  const blocks = [];
  let cursor = -length / 2 - extra;
  for (const opening of sorted) {
    const from = opening.u - opening.half;
    const to = opening.u + opening.half;
    if (from < cursor) continue; // overlaps the window before it: leave it out
    if (from > cursor) blocks.push([cursor, from, 0, height]); // full-height wall up to the window
    if (opening.bottom > 0) blocks.push([from, to, 0, opening.bottom]); // under the window
    if (opening.top < height) blocks.push([from, to, opening.top, height]); // over the window
    cursor = to;
  }
  blocks.push([cursor, length / 2 + extra, 0, height]);
  return blocks;
}

// A piece turned 90 or 270 degrees swaps its width and depth.
export function getFootprint(piece) {
  const { w, d } = sizeOf(piece);
  const turned = piece.rotation === 90 || piece.rotation === 270;
  return turned ? { w: d, d: w } : { w, d };
}

// Put a piece that hangs on a wall (a print, a mirror) flat against the wall it is
// nearest to, facing into the room. `rotation` says which way it faces: 0 on the back
// wall, 180 on the front wall, 270 on the left wall and 90 on the right wall.
export function snapToWall(piece, room) {
  const { w, d } = sizeOf(piece);
  const toWalls = {
    back: piece.z + room.length / 2,
    front: room.length / 2 - piece.z,
    left: piece.x + room.width / 2,
    right: room.width / 2 - piece.x,
  };
  const nearest = Object.keys(toWalls).reduce((best, name) => (toWalls[name] < toWalls[best] ? name : best));
  // how far along the wall it may go: it stays clear of the corners by half its width
  const keep = (value, half) => Math.min(Math.max(value, -Math.max(half - w / 2, 0)), Math.max(half - w / 2, 0));
  if (nearest === 'back') return { ...piece, x: keep(piece.x, room.width / 2), z: -room.length / 2 + d / 2, rotation: 0, wall: 'back' };
  if (nearest === 'front') return { ...piece, x: keep(piece.x, room.width / 2), z: room.length / 2 - d / 2, rotation: 180, wall: 'front' };
  if (nearest === 'left') return { ...piece, x: -room.width / 2 + d / 2, z: keep(piece.z, room.length / 2), rotation: 270, wall: 'left' };
  return { ...piece, x: room.width / 2 - d / 2, z: keep(piece.z, room.length / 2), rotation: 90, wall: 'right' };
}

// A piece lies flat on the floor (a rug) when it is no more than 5 cm high.
// Other furniture can stand on it.
export function liesFlat(piece) {
  return sizeOf(piece).h <= 0.05;
}

// Keep a piece fully inside the walls. A piece that hangs on a wall goes onto its nearest wall.
export function clampToRoom(piece, room) {
  if (hangsOnWall(piece.type)) return snapToWall(piece, room);
  const { w, d } = getFootprint(piece);
  const maxX = Math.max(room.width / 2 - w / 2, 0);
  const maxZ = Math.max(room.length / 2 - d / 2, 0);
  return {
    ...piece,
    x: Math.min(Math.max(piece.x, -maxX), maxX),
    z: Math.min(Math.max(piece.z, -maxZ), maxZ),
  };
}

const SNAP_DISTANCE = 0.12; // metres: closer than this to a wall, the piece jumps flush

// Distance from each side of a piece to the wall on that side, in metres.
export function getWallDistances(piece, room) {
  const { w, d } = getFootprint(piece);
  return {
    left: piece.x - w / 2 + room.width / 2,
    right: room.width / 2 - (piece.x + w / 2),
    back: piece.z - d / 2 + room.length / 2,
    front: room.length / 2 - (piece.z + d / 2),
  };
}

// Keep a piece inside the room, and pull it flush to a wall it is nearly touching.
export function snapToRoom(piece, room) {
  const clamped = clampToRoom(piece, room);
  if (hangsOnWall(piece.type)) return clamped; // already flat against its wall

  const gaps = getWallDistances(clamped, room);
  let { x, z } = clamped;
  if (gaps.left < SNAP_DISTANCE) x -= gaps.left;
  else if (gaps.right < SNAP_DISTANCE) x += gaps.right;
  if (gaps.back < SNAP_DISTANCE) z -= gaps.back;
  else if (gaps.front < SNAP_DISTANCE) z += gaps.front;
  return { ...clamped, x, z };
}

// How far apart two pieces are. Negative means they overlap.
function gapBetween(a, b) {
  const fa = getFootprint(a);
  const fb = getFootprint(b);
  const gapX = Math.abs(a.x - b.x) - (fa.w + fb.w) / 2;
  const gapZ = Math.abs(a.z - b.z) - (fa.d + fb.d) / 2;
  return Math.max(gapX, gapZ);
}

// Does a piece stand on the floor a door swings over?
export function coversDoor(piece, room) {
  const { w, d } = getFootprint(piece);
  return room.doors.some((door) => {
    const zone = doorZone(door, room);
    return piece.x - w / 2 < zone.maxX && piece.x + w / 2 > zone.minX && piece.z - d / 2 < zone.maxZ && piece.z + d / 2 > zone.minZ;
  });
}

// 'fits', 'tight' or 'blocked' for one piece.
// A rug can sit under anything, so it always fits. Something that hangs on a wall is
// only in the way of other things on the same wall. Furniture on the floor is checked
// against the door swings and against the other furniture on the floor.
export function getFit(piece, pieces, room) {
  if (liesFlat(piece)) return 'fits';
  const onWall = hangsOnWall(piece.type);
  if (!onWall && coversDoor(piece, room)) return 'blocked';
  let closest = Infinity;
  for (const other of pieces) {
    if (other.id === piece.id || liesFlat(other)) continue;
    if (hangsOnWall(other.type) !== onWall) continue; // a print on the wall and a sofa under it do not collide
    closest = Math.min(closest, gapBetween(piece, other));
  }
  if (closest < 0) return 'blocked';
  if (closest < (onWall ? 0.05 : 0.15)) return 'tight';
  return 'fits';
}

// Find a spot for a new piece. It tries a grid of positions, first with the piece
// as it comes (turned 0 degrees) and then turned 90 degrees. A spot where it fits
// is best; failing that, one where it is only tight. If there is neither, it goes in
// the middle of the room, where its tag shows Blocked.
// Gives back { x, z, rotation }.
export function findOpenSpot(type, pieces, room) {
  // A rug goes in the middle; it can sit under other furniture.
  if (kindOfType(type) === 'rug' || getItem(type).size.h <= 0.05) return { x: 0, z: 0, rotation: 0 };
  // Something for the wall: try places along the back wall, then the left, the right and the front.
  if (hangsOnWall(type)) {
    const starts = [];
    for (let x = -room.width / 2; x <= room.width / 2; x += 0.25) starts.push({ x, z: -room.length / 2 });
    for (let z = -room.length / 2; z <= room.length / 2; z += 0.25) starts.push({ x: -room.width / 2, z });
    for (let z = -room.length / 2; z <= room.length / 2; z += 0.25) starts.push({ x: room.width / 2, z });
    for (let x = -room.width / 2; x <= room.width / 2; x += 0.25) starts.push({ x, z: room.length / 2 });
    // the middle of the back wall is tried first, since that is where a print usually goes
    starts.unshift({ x: 0, z: -room.length / 2 });
    for (const start of starts) {
      const candidate = snapToWall({ id: 'new', type, ...start, rotation: 0 }, room);
      if (getFit(candidate, pieces, room) === 'fits') return { x: candidate.x, z: candidate.z, rotation: candidate.rotation };
    }
    return { x: 0, z: -room.length / 2, rotation: 0 };
  }
  for (const wanted of ['fits', 'tight']) {
    for (const rotation of [0, 90]) {
      const spot = firstSpotWhere(type, rotation, wanted, pieces, room);
      if (spot) return spot;
    }
  }
  return { x: 0, z: 0, rotation: 0 };
}

// The first position on a 25 cm grid where a piece of this type, turned this way,
// gets the wanted tag ('fits' or 'tight'). null if there is none.
function firstSpotWhere(type, rotation, wanted, pieces, room) {
  const step = 0.25;
  for (let z = -room.length / 2; z <= room.length / 2; z += step) {
    for (let x = -room.width / 2; x <= room.width / 2; x += step) {
      const candidate = clampToRoom({ id: 'new', type, x, z, rotation }, room);
      if (getFit(candidate, pieces, room) === wanted) {
        return { x: candidate.x, z: candidate.z, rotation };
      }
    }
  }
  return null;
}

// Floor area in square metres, rounded to one decimal.
export function getArea(room) {
  return Math.round(room.width * room.length * 10) / 10;
}

export function formatRoom(room) {
  return `${room.width} × ${room.length} m`;
}
