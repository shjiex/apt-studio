// A home is a list of rooms. Each room keeps its own size, furniture, lighting, floor and walls.
// No React in this file.

import { DEFAULT_LIGHTING } from './light.js';
import { defaultDoors, defaultWindows } from './room.js';
import { DEFAULT_SURFACES } from './surface.js';

// The kinds of room you can add. `icon` is a name in Icon.jsx, and `size` is a
// usual size for that kind of room in metres, used as a starting point.
export const ROOM_KINDS = [
  { id: 'bedroom', name: 'Bedroom', icon: 'bed', size: { width: 3.6, length: 3.0, height: 2.5 } },
  { id: 'living', name: 'Living room', icon: 'sofa', size: { width: 4.6, length: 3.8, height: 2.5 } },
  { id: 'kitchen', name: 'Kitchen', icon: 'kitchen', size: { width: 3.0, length: 2.6, height: 2.5 } },
  { id: 'dining', name: 'Dining room', icon: 'dining', size: { width: 3.4, length: 3.0, height: 2.5 } },
  { id: 'office', name: 'Office', icon: 'desk', size: { width: 3.0, length: 2.6, height: 2.5 } },
  { id: 'bathroom', name: 'Bathroom', icon: 'bath', size: { width: 2.2, length: 1.8, height: 2.5 } },
];

// Look up one kind by its id, e.g. kindOf('living').
export function kindOf(id) {
  return ROOM_KINDS.find((kind) => kind.id === id) || ROOM_KINDS[0];
}

// A new, empty room. `details` is what the room dialog collected: { name, kind, size }.
export function newRoom(details) {
  return {
    id: `room-${Date.now()}`,
    name: details.name,
    kind: details.kind,
    size: { ...details.size, windows: defaultWindows(details.size), doors: defaultDoors(details.size) },
    pieces: [],
    lighting: DEFAULT_LIGHTING,
    surfaces: DEFAULT_SURFACES,
  };
}
