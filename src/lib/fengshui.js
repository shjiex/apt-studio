// A check of the room's layout: a score out of 100 and a few things to try.
//
// Every check is a guideline turned into a measurement the app can take from what
// it knows: the walls, the doors, the windows and the furniture. Each one says where
// it comes from (`from`):
//   'Feng shui'  the form school's layout advice. The main idea is the commanding
//                position: your bed, sofa and desk have a solid wall behind them and
//                a view of the door, without standing straight in line with it.
//   'Design'     distances interior designers use, such as 75 to 90 cm for a walkway
//                and 35 to 45 cm between a sofa and its coffee table.
// The sources are listed in the README under "A wider room score". Schools of feng
// shui disagree on some points (a mirror facing a door is one), and those are left out.
// The compass, the elements and colours are left out too, because the app does not
// know which way your home faces. The checks are a guide, not a rule.

import { getItem, hangsOnWall, sizeOf } from '../data/catalog.js';
import { coversDoor, doorInRoom, getFootprint, getWallDistances, windowInRoom, liesFlat } from './room.js';

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

// The middle of a piece's back edge: the pillow end of a bed, the back of a sofa.
function backOf(piece) {
  const front = frontOf(piece);
  const { d } = sizeOf(piece);
  return { x: piece.x - (front.x * d) / 2, z: piece.z - (front.z * d) / 2 };
}

// How far behind you the door is when you are at `spot` looking along `front`.
// 1 means a door is straight behind you, 0 means it is exactly to your side and -1
// means it is straight ahead. With several doors the worst one counts. With no door
// there is nothing behind you, so the answer is -1.
function doorBehind(spot, front, room) {
  let behindness = -1;
  for (const entry of room.doors) {
    const door = doorInRoom(entry, room);
    const toDoor = { x: door.x - spot.x, z: door.z - spot.z };
    const distance = Math.hypot(toDoor.x, toDoor.z) || 1;
    behindness = Math.max(behindness, -(toDoor.x * front.x + toDoor.z * front.z) / distance);
  }
  return behindness;
}

// How far `spot` is from the nearest door, in metres. With no door it is very far.
function doorDistance(spot, room) {
  let nearest = Infinity;
  for (const entry of room.doors) {
    const door = doorInRoom(entry, room);
    nearest = Math.min(nearest, Math.hypot(door.x - spot.x, door.z - spot.z));
  }
  return nearest;
}

// Where `other` is, seen from `piece`: how far in front of its front edge (`ahead`,
// measured edge to edge) and how far off to one side its middle is (`aside`).
function inFrontOf(piece, other) {
  const front = frontOf(piece);
  const mine = getFootprint(piece);
  const theirs = getFootprint(other);
  const lengthways = front.z !== 0; // the front points along the room's length
  const toOther = { x: other.x - piece.x, z: other.z - piece.z };
  const along = toOther.x * front.x + toOther.z * front.z;
  return {
    ahead: along - (lengthways ? mine.d + theirs.d : mine.w + theirs.w) / 2,
    aside: Math.abs(lengthways ? toOther.x : toOther.z),
    halfWidths: (lengthways ? mine.w + theirs.w : mine.d + theirs.d) / 2,
  };
}

// The least width most designers allow for a walkway: 75 cm (30 inches).
const WALKWAY = 0.75;

// Can you walk from a door to this piece along a path at least WALKWAY wide?
// The floor is cut into 10 cm squares. A square is open when its middle is at least
// half a walkway from every wall and every piece of furniture, so a person fits
// there. Starting from the open squares near the doors, the open squares that
// touch them are marked, then the ones that touch those, and so on (a flood fill).
// The piece can be walked to if a marked square ends up right beside it.
function walkableTo(target, solid, room) {
  const STEP = 0.1;
  const keep = WALKWAY / 2;
  const columns = Math.round(room.width / STEP);
  const rows = Math.round(room.length / STEP);
  const middleOf = (column, row) => ({ x: -room.width / 2 + (column + 0.5) * STEP, z: -room.length / 2 + (row + 0.5) * STEP });
  // is the box of `piece`, grown by `extra` on every side, over this spot?
  const near = (piece, spot, extra) => {
    const { w, d } = getFootprint(piece);
    return Math.abs(spot.x - piece.x) < w / 2 + extra && Math.abs(spot.z - piece.z) < d / 2 + extra;
  };
  const isOpen = (spot) =>
    Math.abs(spot.x) <= room.width / 2 - keep + 0.001 &&
    Math.abs(spot.z) <= room.length / 2 - keep + 0.001 &&
    !solid.some((piece) => near(piece, spot, keep - 0.001));

  const open = [];
  const marked = [];
  const waiting = []; // squares that are marked but whose neighbours are not looked at yet
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const spot = middleOf(column, row);
      const index = row * columns + column;
      open[index] = isOpen(spot);
      // start from the open squares within 90 cm of a door
      if (open[index] && doorDistance(spot, room) < 0.9) {
        marked[index] = true;
        waiting.push([column, row]);
      }
    }
  }
  while (waiting.length > 0) {
    const [column, row] = waiting.pop();
    if (near(target, middleOf(column, row), keep + STEP * 1.5)) return true;
    for (const [nextColumn, nextRow] of [[column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]]) {
      const index = nextRow * columns + nextColumn;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      if (!open[index] || marked[index]) continue;
      marked[index] = true;
      waiting.push([nextColumn, nextRow]);
    }
  }
  return false;
}

// Each check gives: what it is called, whether it passes, how much it counts, a tip,
// and where the guideline comes from.
function checkBed(bed, pieces, room) {
  const behind = gapBehind(bed, room);
  const gaps = getWallDistances(bed, room);
  const pillow = backOf(bed);

  // A door's path runs straight across the room from it.
  const overlapWithDoorPath = inDoorPath(bed, room);

  // Under a window: the head is against a wall, and a window on that wall sits over the bed.
  const underWindow = behind.gap < 0.3 && facesWindow(bed, behind.wall, room, 0.2);

  // The two long sides of the bed: is there room to get in on both?
  const front = frontOf(bed);
  const sideGaps = front.z !== 0 ? [gaps.left, gaps.right] : [gaps.back, gaps.front];

  // Lying down you look toward the foot of the bed. The door should be ahead of you,
  // even if well off to one side. A door level with your pillow or behind it, such as
  // one in the wall your headboard is on, is out of view.
  const seesDoor = doorBehind(pillow, front, room) < -0.15;

  // The pillow end should be in the half of the room away from the door. The room's
  // corner to corner length is the farthest two points in it can be apart.
  const cornerToCorner = Math.hypot(room.width, room.length);
  const farFromDoor = doorDistance(pillow, room) >= cornerToCorner * 0.4;

  // A mirror faces the bed when the bed is straight in front of the mirror's glass.
  const mirrors = pieces.filter((piece) => MIRRORS.includes(kindOf(piece)));
  const mirrorFacesBed = mirrors.some((mirror) => {
    const seen = inFrontOf(mirror, bed);
    return seen.ahead > -0.05 && seen.aside < seen.halfWidths - 0.1;
  });

  return [
    {
      title: 'Headboard against a solid wall',
      passes: behind.gap <= 0.15 && !underWindow,
      points: 20,
      from: 'Feng shui',
      tip: "Try pushing the head of your bed against a wall that has no window. A solid wall behind you tends to feel steadier.",
    },
    {
      title: 'Bed out of the door’s path',
      passes: overlapWithDoorPath < 0.1,
      points: 20,
      from: 'Feng shui',
      tip: "Move your bed out of the straight line from the door. You’ll still want to see the door from bed without lying right in front of it.",
    },
    {
      title: 'You can see the door from bed',
      passes: seesDoor,
      points: 10,
      from: 'Feng shui',
      tip: "Turn your bed so the door is ahead of you when you lie down, off to one side. This is called the commanding position.",
    },
    {
      title: 'Bed not under a window',
      passes: !underWindow,
      points: 10,
      from: 'Feng shui',
      tip: "Slide your bed out from under the window, or turn it toward another wall.",
    },
    {
      title: 'Room to get in on both sides',
      passes: Math.min(sideGaps[0], sideGaps[1]) >= 0.45,
      points: 10,
      from: 'Feng shui',
      tip: "Leave at least 45 cm on both sides of your bed so you can get in from either side.",
    },
    {
      title: 'Pillows away from the door',
      passes: farFromDoor,
      points: 5,
      from: 'Feng shui',
      tip: "Move the head of your bed toward the side of the room farthest from the door, ideally the corner across from it.",
    },
    // only worth a line when the room has a mirror
    ...(mirrors.length > 0
      ? [
          {
            title: 'No mirror facing the bed',
            passes: !mirrorFacesBed,
            points: 5,
            from: 'Feng shui',
            tip: "Move the mirror to a wall beside your bed, so you don’t see yourself in it when you lie down.",
          },
        ]
      : []),
  ];
}

// The kinds of piece that are a mirror.
const MIRRORS = ['floor_mirror', 'round_mirror', 'wall_mirror'];

function checkSofa(sofa, pieces, room) {
  const behind = gapBehind(sofa, room);
  const front = frontOf(sofa);
  // A window right behind the sofa: the back is near a wall, and a window on that wall is behind it.
  const windowBehind = behind.gap < 0.6 && facesWindow(sofa, behind.wall, room, 0.2);

  // The coffee table nearest the front of the sofa, if the room has one.
  const tables = pieces.filter((piece) => kindOf(piece) === 'coffee_table').map((table) => inFrontOf(sofa, table));
  const table = tables.sort((a, b) => Math.abs(a.ahead - 0.4) - Math.abs(b.ahead - 0.4))[0];

  return [
    {
      title: 'Sofa backed by a wall',
      passes: behind.gap <= 0.3 && !windowBehind,
      points: 10,
      from: 'Feng shui',
      tip: "Put the back of your sofa near a wall with no window. It can stand up to 30 cm away from the wall.",
    },
    {
      title: 'Sofa not in front of a window',
      passes: !windowBehind,
      points: 5,
      from: 'Feng shui',
      tip: "Move your sofa to a wall without a window, or pull it at least 60 cm away from the window.",
    },
    {
      title: 'Sofa can see the door',
      passes: doorBehind({ x: sofa.x, z: sofa.z }, front, room) < 0.5,
      points: 10,
      from: 'Feng shui',
      tip: "Turn your sofa so you can see who comes in while you sit, without facing the door head on.",
    },
    ...(table
      ? [
          {
            title: 'Coffee table within reach',
            passes: table.ahead >= 0.3 && table.ahead <= 0.55 && table.aside < table.halfWidths,
            points: 5,
            from: 'Design',
            tip: "Keep the coffee table 35 to 45 cm from the front of your sofa. That is close enough to reach and leaves room for your legs.",
          },
        ]
      : []),
  ];
}

function checkDesk(desk, room) {
  // The person sits at the front of the desk and looks toward its back.
  const { d } = getFootprint({ ...desk, rotation: 0 });
  const front = frontOf(desk);
  const seat = { x: desk.x + front.x * (d / 2 + 0.4), z: desk.z + front.z * (d / 2 + 0.4) };
  const looking = { x: -front.x, z: -front.z };
  // the wall you look at when you sit, and how far past the desk it is
  const ahead = gapBehind(desk, room);

  return [
    {
      title: 'Desk does not turn your back to the door',
      passes: doorBehind(seat, looking, room) < 0.5,
      points: 15,
      from: 'Feng shui',
      tip: "Turn your desk so you can see the door while you work, even from the corner of your eye.",
    },
    {
      title: 'Desk looks into the room',
      passes: ahead.gap >= 0.5,
      points: 5,
      from: 'Feng shui',
      tip: "Turn your desk so you look into the room when you sit, with a wall behind your chair in place of one right in front of you.",
    },
  ];
}

function checkDining(table, room) {
  const gaps = getWallDistances(table, room);
  const least = Math.min(gaps.left, gaps.right, gaps.back, gaps.front);
  return [
    {
      title: 'Room to pull out the dining chairs',
      passes: least >= 0.9,
      points: 5,
      from: 'Design',
      tip: `Leave about 90 cm between your dining table and the walls so chairs can slide out. The tightest side has ${Math.round(least * 100)} cm.`,
    },
  ];
}

// What the walkway check tries to walk to, by kind.
const MAIN_KINDS = ['bed', 'sofa', 'desk'];

function checkRoom(pieces, room) {
  // furniture that stands on the floor: no rugs, and nothing that hangs on a wall
  const solid = pieces.filter((piece) => !liesFlat(piece) && !hangsOnWall(piece.type));
  const doorBlocked = solid.some((piece) => coversDoor(piece, room));

  let covered = 0;
  solid.forEach((piece) => {
    const { w, d } = getFootprint(piece);
    covered += w * d;
  });
  const share = covered / (room.width * room.length);

  // A walkway from a door to each main piece (the first bed, sofa and desk).
  // The piece that is walked to does not block its own walkway.
  const mainPieces = MAIN_KINDS.map((kind) => solid.find((piece) => kindOf(piece) === kind)).filter(Boolean);
  const cutOff = room.doors.length > 0 ? mainPieces.find((piece) => !walkableTo(piece, solid, room)) : undefined;

  // A rug should be held down by furniture: some other piece stands partly on it.
  const rug = pieces.find((piece) => liesFlat(piece));
  const rugAnchored =
    rug &&
    solid.some((piece) => {
      const a = getFootprint(piece);
      const b = getFootprint(rug);
      return Math.abs(piece.x - rug.x) < (a.w + b.w) / 2 && Math.abs(piece.z - rug.z) < (a.d + b.d) / 2;
    });
  // Tall furniture right in front of a window blocks the daylight.
  const windowBlocked = solid.some((piece) => {
    const tall = sizeOf(piece).h > 1.1;
    const gaps = getWallDistances(piece, room);
    return tall && ['back', 'front', 'left', 'right'].some((wall) => gaps[wall] < 0.6 && facesWindow(piece, wall, room, 0));
  });

  return [
    {
      title: 'Door can open freely',
      passes: !doorBlocked,
      points: 15,
      from: 'Feng shui',
      tip: "Clear the floor where the door swings so it can open fully.",
    },
    ...(mainPieces.length > 0
      ? [
          {
            title: 'A clear walkway from the door',
            passes: !cutOff,
            points: 10,
            from: 'Design',
            tip: `Leave a path about 75 cm wide from the door to your ${cutOff ? getItem(cutOff.type).name.toLowerCase() : 'furniture'}. Something narrows it right now.`,
          },
        ]
      : []),
    {
      title: 'Nothing tall in front of a window',
      passes: !windowBlocked,
      points: 10,
      from: 'Design',
      tip: "Move the tall piece away from the window so daylight can reach the rest of your room.",
    },
    {
      title: 'Enough open floor',
      passes: share <= 0.45,
      points: 10,
      from: 'Feng shui',
      tip: `Your furniture covers ${Math.round(share * 100)}% of the floor. Keeping it under 45% leaves you room to walk around.`,
    },
    ...(rug
      ? [
          {
            title: 'Rug held down by furniture',
            passes: Boolean(rugAnchored),
            points: 5,
            from: 'Design',
            tip: "Slide the rug until your bed or sofa stands partly on it, so the two read as one group.",
          },
        ]
      : []),
    {
      title: 'A plant in the room',
      passes: pieces.some((piece) => kindOf(piece) === 'plant'),
      points: 5,
      from: 'Feng shui',
      tip: "Add a plant if you’d like a living thing in your room.",
    },
    {
      title: 'A lamp of your own',
      passes: pieces.some((piece) => LAMPS.includes(kindOf(piece))),
      points: 5,
      from: 'Design',
      tip: "Add a lamp so your light doesn’t come only from the ceiling.",
    },
  ];
}

// The kinds of piece that are a lamp.
const LAMPS = ['lamp', 'table_lamp', 'wall_lamp'];

// The whole check: { score, checks, tips }.
export function getFengShui(pieces, room) {
  const first = (kinds) => pieces.find((piece) => kinds.includes(kindOf(piece)));
  const bed = first(['bed']);
  const sofa = first(['sofa']);
  const desk = first(['desk']);
  const dining = first(['dining_table', 'round_table']);

  const checks = [
    ...(bed ? checkBed(bed, pieces, room) : []),
    ...(sofa ? checkSofa(sofa, pieces, room) : []),
    ...(desk ? checkDesk(desk, room) : []),
    ...(dining ? checkDining(dining, room) : []),
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
