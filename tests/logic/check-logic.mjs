// Checks for the fit tags (getFit in src/lib/room.js) and the room score
// (getFengShui in src/lib/fengshui.js). Each line sets up a small room, asks for
// an answer, and prints ok or FAIL next to it.
//
// Run it from the project folder:   node tests/logic/check-logic.mjs
//
// The app's files are loaded through Vite, the same tool that runs the app, because
// they use Vite features (import.meta.env) that plain Node does not know.
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectFolder = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({ root: projectFolder, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const room = await server.ssrLoadModule('/src/lib/room.js');
const feng = await server.ssrLoadModule('/src/lib/fengshui.js');
const ex = await server.ssrLoadModule('/src/data/exampleRoom.js');

let failures = 0;
// Print one result. `got` is what the app's code answered, `want` is the right answer.
function expect(name, got, want) {
  // Written out as text, so lists and objects can be compared too.
  const isRight = JSON.stringify(got) === JSON.stringify(want);
  if (isRight) {
    console.log(`ok   ${name}: ${JSON.stringify(got)}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}: ${JSON.stringify(got)} (wanted ${JSON.stringify(want)})`);
  }
}
// A 4 by 3 m room with no windows or doors. Others below are copies of it with one added.
const base = { width: 4, length: 3, height: 2.6, windows: [], doors: [] };

// Does the room score check with this title pass for these pieces in this room?
function check(pieces, r, title) {
  const found = feng.getFengShui(pieces, r).checks.find((entry) => entry.title === title);
  return found ? found.passes : undefined;
}

// getFit
const bed = { id: 'b', type: 'bed', x: 0, z: -0.45, rotation: 0 }; // 1.5 x 2.05, head against the back wall
expect('lone bed fits', room.getFit(bed, [bed], base), 'fits');
const desk = { id: 'd', type: 'desk', x: 0, z: 1.1, rotation: 0 }; // 1.15 x 0.58
expect('desk overlapping bed is blocked', room.getFit({ ...desk, z: 0.8 }, [bed, { ...desk, z: 0.8 }], base), 'blocked');
expect('desk 10 cm from bed is tight', room.getFit({ ...desk, z: -0.45 + 1.025 + 0.1 + 0.29 }, [bed, desk], base), 'tight');
const rug = { id: 'r', type: 'rug', x: 0, z: 0, rotation: 0 };
expect('bed on a rug fits', room.getFit(bed, [bed, rug], base), 'fits');
const withDoor = { ...base, doors: [{ id: 'door', wall: 'front', along: 0.5, width: 0.85 }] };
expect('desk in the door swing is blocked', room.getFit({ ...desk, z: 1.2 }, [{ ...desk, z: 1.2 }], withDoor), 'blocked');
const turned = { id: 't', type: 'bed', x: 0, z: 0, rotation: 90 };
expect('turned bed footprint swaps', room.getFootprint(turned), { w: 2.05, d: 1.5 });
expect('rotation 270 swaps too', room.getFootprint({ ...turned, rotation: 270 }), { w: 2.05, d: 1.5 });

// room score
expect('bed head on solid wall passes', check([bed], base, 'Headboard against a solid wall'), true);
const backWindow = { ...base, windows: [{ id: 'w', wall: 'back', along: 0.5, width: 1.0, bottom: 0.9, top: 2.0 }] };
expect('bed under a back window fails headboard', check([bed], backWindow, 'Headboard against a solid wall'), false);
expect('bed under a back window fails window check', check([bed], backWindow, 'Bed not under a window'), false);
const sideWindow = { ...base, windows: [{ id: 'w', wall: 'left', along: 0.5, width: 1.0, bottom: 0.9, top: 2.0 }] };
expect('bed with window on another wall passes', check([bed], sideWindow, 'Bed not under a window'), true);
const doorInLine = { ...base, doors: [{ id: 'door', wall: 'front', along: 0.5, width: 0.85 }] };
expect('bed in line with the door fails', check([bed], doorInLine, 'Bed out of the door’s path'), false);
const doorAside = { ...base, doors: [{ id: 'door', wall: 'front', along: 0.92, width: 0.85 }] };
expect('bed out of line with the door passes', check([{ ...bed, x: -1.2 }], doorAside, 'Bed out of the door’s path'), true);
// a bed turned to have its head on the right wall (rotation 90: back to the right wall)
const bedRight = room.clampToRoom({ id: 'b2', type: 'bed', x: 5, z: 0, rotation: 90 }, base);
expect('turned bed head on right wall passes', check([bedRight], base, 'Headboard against a solid wall'), true);
const rightWindow = { ...base, windows: [{ id: 'w', wall: 'right', along: 0.5, width: 1.0, bottom: 0.9, top: 2.0 }] };
expect('turned bed under a right window fails', check([bedRight], rightWindow, 'Bed not under a window'), false);
// desk: sitting with the door behind you
const deskFacingBack = { id: 'd', type: 'desk', x: 0, z: -1.21, rotation: 180 }; // front toward the back wall? see frontOf
const deskFacingFront = { id: 'd', type: 'desk', x: 0, z: -1.21, rotation: 0 };
// at rotation 0 a desk against the back wall has you facing that wall, so a door in the front wall is behind you
expect('desk facing the back wall, door in the front wall: door behind you', check([deskFacingFront], doorInLine, 'Desk does not turn your back to the door'), false);
expect('desk turned 180 faces the front wall and its door', check([{ ...deskFacingBack, z: 1.0 }], doorAside, 'Desk does not turn your back to the door'), true);
expect('desk with no door anywhere passes', check([deskFacingFront], base, 'Desk does not turn your back to the door'), true);
// open floor
const crowded = [0, 1].map((i) => ({ id: `b${i}`, type: 'bed', x: -1 + 2 * i, z: 0, rotation: 0 })); // 6.15 of 12 m², 51%
expect('crowded room fails open floor', check(crowded, base, 'Enough open floor'), false);
// example room scores 100
const e = ex.exampleRoom();
const score = feng.getFengShui(e.pieces, e.size);
expect('example room score', score.score, 100);
// every piece in the example room should fit
for (const piece of e.pieces) {
  expect(`example room ${piece.type} fits`, room.getFit(piece, e.pieces, e.size), 'fits');
}

console.log(failures ? `${failures} failed` : 'all passed');
await server.close();
