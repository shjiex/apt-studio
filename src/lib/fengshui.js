// A check of the room's layout: a score out of 100 and a few things to try.
// Most are common feng shui guidelines turned into simple measurements; two are
// everyday interior design habits (daylight, and a rug held down by furniture).
// They are a guide, not a rule, and they only look at what this app knows:
// the walls, the door, the window and the furniture.

import { getItem } from '../data/catalog.js';
import { coversDoor, doorInRoom, getFootprint, getWallDistances, windowInRoom } from './room.js';

// 'bed', 'desk' and so on, also for furniture made from a moodboard image.
function kindOf(piece) {
  return getItem(piece.type).baseType || piece.type;
}

// Which way the front of a piece points: x is across the room, z is toward the front.
// Turned 0 degrees a piece faces the front of the room, so its back is to the back wall.
function frontOf(piece) {
  const angle = (piece.rotation * Math.PI) / 180;
  return { x: Math.round(-Math.sin(angle)), z: Math.round(Math.cos(angle)) };
}

// Is this piece lined up with a window on the given wall? `slack` widens the window a little.
// On the back and front walls "lined up" is judged across the room (x), on the side walls front to back (z).
function facesWindow(piece, wall, room, slack) {
  const { w, d } = getFootprint(piece);
  return room.windows
    .filter((win) => win.wall === wall)
    .map((win) => windowInRoom(win, room))
    .some((win) => {
      const acrossRoom = wall === 'back' || wall === 'front';
      const middle = acrossRoom ? piece.x - win.x : piece.z - win.z;
      const half = (acrossRoom ? w : d) / 2;
      return Math.abs(middle) < win.half + half - slack;
    });
}

// How much of a piece lies in the straight line a door opens onto, in metres.
// The line is a strip as wide as the door, running across the whole room from it.
function inDoorPath(piece, room) {
  const { w, d } = getFootprint(piece);
  let most = 0;
  for (const door of room.doors) {
    const place = doorInRoom(door, room);
    const acrossRoom = Math.abs(place.inward[0]) > 0.5; // a door on a side wall opens across the room
    const middle = acrossRoom ? piece.z - place.z : piece.x - place.x;
    const half = (acrossRoom ? d : w) / 2;
    // how far the piece's range and the door's range overlap
    most = Math.max(most, Math.min(middle + half, place.half) - Math.max(middle - half, -place.half));
  }
  return most;
}

// How far the BACK of a piece is from the wall behind it, in metres.
function gapBehind(piece, room) {
  const gaps = getWallDistances(piece, room);
  const front = frontOf(piece);
  if (front.z === 1) return { wall: 'back', gap: gaps.back };
  if (front.z === -1) return { wall: 'front', gap: gaps.front };
  if (front.x === 1) return { wall: 'left', gap: gaps.left };
  return { wall: 'right', gap: gaps.right };
}

// Each check gives: what it is called, whether it passes, how much it counts, and a tip.
function checkBed(bed, room) {
  const behind = gapBehind(bed, room);
  const gaps = getWallDistances(bed, room);

  // A door's path runs straight across the room from it.
  const overlapWithDoorPath = inDoorPath(bed, room);

  // Under a window: the head is against a wall, and a window on that wall sits over the bed.
  const underWindow = behind.gap < 0.3 && facesWindow(bed, behind.wall, room, 0.2);

  // The two long sides of the bed: is there room to get in on both?
  const front = frontOf(bed);
  const sideGaps = front.z !== 0 ? [gaps.left, gaps.right] : [gaps.back, gaps.front];

  return [
    {
      title: 'Headboard against a solid wall',
      passes: behind.gap <= 0.15 && !underWindow,
      points: 20,
      tip: "Try pushing the head of your bed against a wall that has no window. A solid wall behind you tends to feel steadier.",
    },
    {
      title: 'Bed out of the door’s path',
      passes: overlapWithDoorPath < 0.1,
      points: 20,
      tip: "Move your bed out of the straight line from the door. You’ll still want to see the door from bed without lying right in front of it.",
    },
    {
      title: 'Bed not under a window',
      passes: !underWindow,
      points: 10,
      tip: "Slide your bed out from under the window, or turn it toward another wall.",
    },
    {
      title: 'Room to get in on both sides',
      passes: Math.min(sideGaps[0], sideGaps[1]) >= 0.45,
      points: 10,
      tip: "Leave at least 45 cm on both sides of your bed so you can get in from either side.",
    },
  ];
}

function checkDesk(desk, room) {
  // The person sits at the front of the desk and looks toward its back.
  const { d } = getFootprint({ ...desk, rotation: 0 });
  const front = frontOf(desk);
  const seat = { x: desk.x + front.x * (d / 2 + 0.4), z: desk.z + front.z * (d / 2 + 0.4) };
  // 1 means a door is straight behind the chair, -1 means straight ahead. With several
  // doors the worst one counts; with none there is nothing behind you.
  let behindness = -1;
  for (const entry of room.doors) {
    const door = doorInRoom(entry, room);
    const toDoor = { x: door.x - seat.x, z: door.z - seat.z };
    const distance = Math.hypot(toDoor.x, toDoor.z) || 1;
    behindness = Math.max(behindness, (toDoor.x * front.x + toDoor.z * front.z) / distance);
  }

  return [
    {
      title: 'Desk does not turn your back to the door',
      passes: behindness < 0.5,
      points: 15,
      tip: "Turn your desk so you can see the door while you work, even from the corner of your eye.",
    },
  ];
}

function checkRoom(pieces, room) {
  const solid = pieces.filter((piece) => kindOf(piece) !== 'rug');
  const doorBlocked = solid.some((piece) => coversDoor(piece, room));

  let covered = 0;
  solid.forEach((piece) => {
    const { w, d } = getFootprint(piece);
    covered += w * d;
  });
  const share = covered / (room.width * room.length);

  // Two interior design habits that are not feng shui but can be measured the same way.
  // A rug should be held down by furniture: some other piece stands partly on it.
  const rug = pieces.find((piece) => kindOf(piece) === 'rug');
  const rugAnchored =
    rug &&
    solid.some((piece) => {
      const a = getFootprint(piece);
      const b = getFootprint(rug);
      return Math.abs(piece.x - rug.x) < (a.w + b.w) / 2 && Math.abs(piece.z - rug.z) < (a.d + b.d) / 2;
    });
  // Tall furniture right in front of a window blocks the daylight.
  const windowBlocked = solid.some((piece) => {
    const tall = getItem(piece.type).size.h > 1.1;
    const gaps = getWallDistances(piece, room);
    return tall && ['back', 'front', 'left', 'right'].some((wall) => gaps[wall] < 0.6 && facesWindow(piece, wall, room, 0));
  });

  return [
    {
      title: 'Nothing tall in front of a window',
      passes: !windowBlocked,
      points: 10,
      tip: "Move the tall piece away from the window so daylight can reach the rest of your room.",
    },
    ...(rug
      ? [
          {
            title: 'Rug held down by furniture',
            passes: Boolean(rugAnchored),
            points: 5,
            tip: "Slide the rug until your bed or sofa stands partly on it, so the two read as one group.",
          },
        ]
      : []),
    {
      title: 'Door can open freely',
      passes: !doorBlocked,
      points: 15,
      tip: "Clear the floor where the door swings so it can open fully.",
    },
    {
      title: 'Enough open floor',
      passes: share <= 0.45,
      points: 10,
      tip: `Your furniture covers ${Math.round(share * 100)}% of the floor. Keeping it under 45% leaves you room to walk around.`,
    },
    {
      title: 'Something living',
      passes: pieces.some((piece) => kindOf(piece) === 'plant'),
      points: 5,
      tip: "Add a plant if you’d like something living in your room.",
    },
    {
      title: 'A lamp of your own',
      passes: pieces.some((piece) => kindOf(piece) === 'lamp'),
      points: 5,
      tip: "Add a lamp so your light doesn’t come only from the ceiling.",
    },
  ];
}

// The whole check: { score, checks, tips }.
export function getFengShui(pieces, room) {
  const bed = pieces.find((piece) => kindOf(piece) === 'bed');
  const desk = pieces.find((piece) => kindOf(piece) === 'desk');

  const checks = [
    ...(bed ? checkBed(bed, room) : []),
    ...(desk ? checkDesk(desk, room) : []),
    ...checkRoom(pieces, room),
  ];

  let possible = 0;
  let earned = 0;
  checks.forEach((check) => {
    possible += check.points;
    if (check.passes) earned += check.points;
  });

  // The three failed checks that count the most.
  const tips = checks
    .filter((check) => !check.passes)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((check) => check.tip);

  return { score: Math.round((earned / possible) * 100), checks, tips };
}
