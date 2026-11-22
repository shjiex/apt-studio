// Plain functions about the room and the pieces in it. No React in this file.
// The room is measured in metres with its centre at (0, 0).
// x runs across the room (width) and z runs front to back (length).

import { getItem } from '../data/catalog.js';

export const DEFAULT_ROOM = { width: 3.6, length: 3.0, height: 2.5 };

// The door sits on the left wall near the front. This square is its swing.
export const DOOR_SIZE = 0.85;

// A piece turned 90 or 270 degrees swaps its width and depth.
export function getFootprint(piece) {
  const { w, d } = getItem(piece.type).size;
  const turned = piece.rotation === 90 || piece.rotation === 270;
  return turned ? { w: d, d: w } : { w, d };
}

// Keep a piece fully inside the walls.
export function clampToRoom(piece, room) {
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

function coversDoor(piece, room) {
  const { w, d } = getFootprint(piece);
  const doorRight = -room.width / 2 + DOOR_SIZE;
  const doorBack = room.length / 2 - DOOR_SIZE;
  return piece.x - w / 2 < doorRight && piece.z + d / 2 > doorBack;
}

// 'fits', 'tight' or 'blocked' for one piece. A rug can sit under anything.
export function getFit(piece, pieces, room) {
  if (piece.type === 'rug') return 'fits';
  if (coversDoor(piece, room)) return 'blocked';
  let closest = Infinity;
  for (const other of pieces) {
    if (other.id === piece.id || other.type === 'rug') continue;
    closest = Math.min(closest, gapBetween(piece, other));
  }
  if (closest < 0) return 'blocked';
  if (closest < 0.15) return 'tight';
  return 'fits';
}

// Find the first open spot for a new piece by trying a grid of positions.
export function findOpenSpot(type, pieces, room) {
  // A rug goes in the middle; it can sit under other furniture.
  if (type === 'rug') return { x: 0, z: 0 };
  const step = 0.25;
  for (let z = -room.length / 2; z <= room.length / 2; z += step) {
    for (let x = -room.width / 2; x <= room.width / 2; x += step) {
      const candidate = clampToRoom({ id: 'new', type, x, z, rotation: 0 }, room);
      if (getFit(candidate, pieces, room) === 'fits') {
        return { x: candidate.x, z: candidate.z };
      }
    }
  }
  return { x: 0, z: 0 };
}

// Floor area in square metres, rounded to one decimal.
export function getArea(room) {
  return Math.round(room.width * room.length * 10) / 10;
}

export function formatRoom(room) {
  return `${room.width} × ${room.length} m`;
}
