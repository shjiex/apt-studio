// An example room that anyone can open from the "Add a room" dialog.
// It is based on one of the sample moodboard photos (mood-2.jpg: an orange sofa that
// faces a walnut sideboard, plants, and warm lamps by a window), rebuilt with
// pieces from the catalog. No React in this file.

import { getItem } from './catalog.js';
import { asset } from '../lib/paths.js';
import { DEFAULT_LIGHTING } from '../lib/light.js';
import { DEFAULT_SURFACES } from '../lib/surface.js';

// What the dialog shows about the example before you open it.
export const EXAMPLE_ROOM = {
  name: 'Colour block living room',
  kind: 'living', // one of the ids in ROOM_KINDS (lib/rooms.js)
  picture: '/mood/mood-2.jpg', // the photo the room is based on
  size: { width: 4.6, length: 3.8, height: 2.6 }, // metres
};

// The furniture, each piece as the app stores it: `type` is a catalog type, x and z
// are metres from the middle of the room (x: left is negative, z: the back wall is
// negative), and `rotation` is in degrees. At 0 a piece has its back to the back
// wall. At 90 it has its back to the right wall. At 180 it has its back to the front wall.
// Every position was checked with getFit (lib/room.js): nothing overlaps, nothing
// stands where the door swings, and each piece keeps at least 15 cm from the next.
const PIECES = [
  // The sideboard stands against the middle of the back wall. It is the catalog's TV
  // stand, the closest piece to the low walnut sideboard in the photo.
  { type: 'tv_stand', x: 0, z: -1.67, rotation: 0 },
  // A plant beside it, and a floor lamp in each back corner.
  { type: 'plant', x: 1.1, z: -1.6, rotation: 0 },
  { type: 'lamp', x: -2.0, z: -1.6, rotation: 0 },
  { type: 'lamp', x: 2.05, z: -1.65, rotation: 0 },
  // The low bookcase has its back to the right wall.
  { type: 'bookcase', x: 2.14, z: -0.75, rotation: 90 },
  // The rug, with the coffee table standing on it.
  { type: 'rug', x: -0.25, z: -0.3, rotation: 0 },
  { type: 'coffee_table', x: -0.25, z: -0.35, rotation: 0 },
  // The sofa is in the front half of the room and faces the sideboard.
  { type: 'sofa', x: -0.25, z: 0.75, rotation: 180 },
  // The armchair is on the right and faces the coffee table.
  { type: 'armchair', x: 1.35, z: 0.35, rotation: 90 },
  // A side table at the end of the sofa, and a second plant by the window.
  { type: 'side_table', x: -1.55, z: 0.9, rotation: 0 },
  { type: 'plant', x: -2.02, z: 0.2, rotation: 0 },
];

// Make the example as a new room, in the same shape newRoom() in lib/rooms.js gives.
// It is a function, not a constant, so every time it is opened the room gets its own id.
export function exampleRoom() {
  return {
    id: `room-${Date.now()}`,
    name: EXAMPLE_ROOM.name,
    kind: EXAMPLE_ROOM.kind,
    size: {
      ...EXAMPLE_ROOM.size,
      // One wide window on the left wall. `along` is how far along the wall its middle is, from 0 (back) to 1 (front).
      windows: [{ id: 'window-1', wall: 'left', along: 0.45, width: 1.6, bottom: 0.8, top: 2.2 }],
      // The door is on the front wall, near the right corner.
      doors: [{ id: 'door-1', wall: 'front', along: 0.86, width: 0.85 }],
    },
    // Leave out any piece the catalog no longer has, then give each one an id such as "sofa-8".
    pieces: PIECES.filter((piece) => getItem(piece.type)).map((piece, index) => ({ id: `${piece.type}-${index + 1}`, ...piece })),
    // Early on a June evening. The back wall faces north, so the window on the
    // left wall faces west and the low sun comes in through it. The lamps are on
    // with a warm bulb (2400 K).
    lighting: {
      ...DEFAULT_LIGHTING,
      windowFaces: 'north',
      month: 6,
      hour: 18,
      lamps: { ...DEFAULT_LIGHTING.lamps, on: true, kelvin: 2400 },
    },
    // The oak floor every room starts with. The back wall, behind the sideboard, has a
    // picture in place of plain paint: cream with four arches of colour, drawn for this
    // example (public/example). One copy of the picture is 4.6 m wide, so it covers the
    // back wall exactly once. `onlyOn` keeps it to that wall, as in the photo, and the
    // other walls are painted in `color`, the same cream. `aspect` is the picture's
    // width divided by its height.
    surfaces: {
      ...DEFAULT_SURFACES,
      wall: { kind: 'photo', color: '#EFE6D2', photo: asset('/example/colour-block-wall.jpg'), aspect: 1839 / 1040, span: 4.6, onlyOn: 'back' },
    },
    // The first inside view, set up like the photo: standing behind the sofa, near the
    // front wall, looking straight at the sideboard and the arches on the back wall.
    // `stand` is in metres from the middle of the room; yaw 0 faces the back wall and
    // pitch is how far you look down, in degrees.
    insideView: { stand: { x: -0.2, z: 1.45 }, look: { yaw: 0, pitch: -8 } },
  };
}
