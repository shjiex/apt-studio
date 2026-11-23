// Checks for the fit tags (getFit in src/lib/room.js) and the room score
// (getFengShui in src/lib/fengshui.js). Each line sets up a small room, asks for
// an answer, and prints ok or FAIL next to it.
//
// Run it from the project folder:   node tests/logic/check-logic.mjs
//
// The app's files are loaded through Vite, the same tool that runs the app, because
// they use Vite features (import.meta.env) that plain Node does not know.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectFolder = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({ root: projectFolder, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const room = await server.ssrLoadModule('/src/lib/room.js');
const feng = await server.ssrLoadModule('/src/lib/fengshui.js');
const ex = await server.ssrLoadModule('/src/data/exampleRoom.js');
const catalog = await server.ssrLoadModule('/src/data/catalog.js');

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
// The example room copies a photo where the sofa floats in the middle with its back
// to the door, so those two sofa checks fail and the rest pass.
expect('example room score', score.score, 78);
expect('example room failed checks', score.checks.filter((entry) => !entry.passes).map((entry) => entry.title), ['Sofa backed by a wall', 'Sofa can see the door']);
// every check says where it comes from
expect('every check has a source', score.checks.every((entry) => entry.from === 'Feng shui' || entry.from === 'Design'), true);

// the wider checks
// bed: head on the back wall, door in the front wall off to one side: the door is ahead of you
expect('door ahead of the bed is seen', check([{ ...bed, x: -1.2 }], doorAside, 'You can see the door from bed'), true);
// door in the back wall, behind the pillows
const doorBehindBed = { ...base, doors: [{ id: 'door', wall: 'back', along: 0.9, width: 0.85 }] };
expect('door behind the pillows is not seen', check([{ ...bed, x: -1.2 }], doorBehindBed, 'You can see the door from bed'), false);
expect('pillows next to the door fail', check([{ ...bed, x: 1.0 }], doorBehindBed, 'Pillows away from the door'), false);
expect('pillows across from the door pass', check([{ ...bed, x: -1.2 }], doorAside, 'Pillows away from the door'), true);
// a mirror on the front wall looks straight at a bed whose head is on the back wall
const mirrorAhead = room.clampToRoom({ id: 'm', type: 'wall_mirror', x: 0, z: 5, rotation: 0 }, base);
expect('mirror across from the bed faces it', check([bed, mirrorAhead], base, 'No mirror facing the bed'), false);
const mirrorAside = room.clampToRoom({ id: 'm', type: 'wall_mirror', x: 1.6, z: 5, rotation: 0 }, base);
expect('mirror off to the side does not', check([bed, mirrorAside], base, 'No mirror facing the bed'), true);
expect('no mirror, no mirror check', check([bed], base, 'No mirror facing the bed'), undefined);
// sofa: back to the back wall, facing the front
const sofa = room.clampToRoom({ id: 's', type: 'sofa', x: 0, z: -5, rotation: 0 }, base);
expect('sofa against a wall is backed', check([sofa], base, 'Sofa backed by a wall'), true);
expect('sofa in the middle is not backed', check([{ ...sofa, z: 0 }], base, 'Sofa backed by a wall'), false);
expect('sofa under a back window fails', check([sofa], backWindow, 'Sofa not in front of a window'), false);
expect('sofa facing the door wall sees the door', check([sofa], doorAside, 'Sofa can see the door'), true);
expect('sofa with the door behind it does not', check([{ ...sofa, z: 0, rotation: 180 }], doorInLine, 'Sofa can see the door'), false);
const sofaDepth = catalog.sizeOf(sofa).d;
const tableDepth = catalog.sizeOf({ type: 'coffee_table' }).d;
const tableAt = (gap) => ({ id: 'c', type: 'coffee_table', x: 0, z: sofa.z + sofaDepth / 2 + gap + tableDepth / 2, rotation: 0 });
expect('coffee table 40 cm away is in reach', check([sofa, tableAt(0.4)], base, 'Coffee table within reach'), true);
expect('coffee table 90 cm away is not', check([sofa, tableAt(0.9)], base, 'Coffee table within reach'), false);
// desk against the back wall, looking at it
expect('desk right against a wall faces the wall', check([deskFacingFront], base, 'Desk looks into the room'), false);
expect('desk turned round looks into the room', check([{ ...deskFacingBack, z: -0.3 }], base, 'Desk looks into the room'), true);
// walkway: a wardrobe wall to wall between the door and the bed cuts the bed off
const longRoom = { width: 3, length: 6, height: 2.6, windows: [], doors: [{ id: 'door', wall: 'front', along: 0.5, width: 0.85 }] };
const farBed = room.clampToRoom({ id: 'b', type: 'bed', x: 0, z: -5, rotation: 0 }, longRoom);
expect('nothing in the way: walkway passes', check([farBed], longRoom, 'A clear walkway from the door'), true);
const wall = [-1, 0, 1].map((i) => ({ id: `w${i}`, type: 'wardrobe_wide', x: i * 1.0, z: 1.0, rotation: 0 }));
expect('furniture across the room: walkway fails', check([farBed, ...wall], longRoom, 'A clear walkway from the door'), false);
expect('no bed, sofa or desk: no walkway check', check([], longRoom, 'A clear walkway from the door'), undefined);
// A new piece goes where it fits, turned 90 degrees if it has to. The starter bedroom
// (3.6 by 3 m with a bed) has no room for the 2.27 m couch from the first sample
// moodboard picture as it comes, so it should come in turned, and not on top of the bed.
const manifest = JSON.parse(readFileSync(new URL('../../public/models/pins/manifest.json', import.meta.url)));
catalog.setPinItems(manifest);
const starterBed = { id: 'bed-1', type: 'bed', x: -1.0, z: -0.45, rotation: 0, existing: true };
const couchSpot = room.findOpenSpot('pin-mood-1', [starterBed], room.DEFAULT_ROOM);
const couch = { id: 'new', type: 'pin-mood-1', ...couchSpot };
expect('couch in the starter bedroom is not blocked', room.getFit(couch, [starterBed, couch], room.DEFAULT_ROOM) !== 'blocked', true);
expect('couch in the starter bedroom comes in turned', couchSpot.rotation, 90);
expect('a desk in an empty room comes in as it is', room.findOpenSpot('desk', [], base).rotation, 0);

// every piece in the example room should fit
for (const piece of e.pieces) {
  expect(`example room ${piece.type} fits`, room.getFit(piece, e.pieces, e.size), 'fits');
}

// something on the wall may not cover a window or a doorway
const windowWall = { ...base, windows: [{ id: 'w', wall: 'back', along: 0.5, width: 1.0, bottom: 0.9, top: 2.0 }] };
const printOnWindow = room.clampToRoom({ id: 'p', type: 'wall_art', x: 0, z: -5, rotation: 0 }, windowWall);
expect('a print over the window is blocked', room.getFit(printOnWindow, [printOnWindow], windowWall), 'blocked');
const printBeside = room.clampToRoom({ id: 'p', type: 'wall_art', x: 1.4, z: -5, rotation: 0 }, windowWall);
expect('a print beside the window fits', room.getFit(printBeside, [printBeside], windowWall), 'fits');
const printOtherWall = room.clampToRoom({ id: 'p', type: 'wall_art', x: -5, z: 0, rotation: 0 }, windowWall);
expect('a print on another wall fits', room.getFit(printOtherWall, [printOtherWall], windowWall), 'fits');
const doorWall = { ...base, doors: [{ id: 'door', wall: 'front', along: 0.5, width: 0.85 }] };
const mirrorOnDoor = room.clampToRoom({ id: 'm', type: 'wall_mirror', x: 0, z: 5, rotation: 0 }, doorWall);
expect('a mirror across a doorway is blocked', room.getFit(mirrorOnDoor, [mirrorOnDoor], doorWall), 'blocked');
const newPrint = room.findOpenSpot('wall_art', [], windowWall);
const placed = room.clampToRoom({ id: 'n', type: 'wall_art', ...newPrint }, windowWall);
expect('a new print is given a place clear of the window', room.getFit(placed, [placed], windowWall), 'fits');

// room-sized lengths typed in metres or in feet
const units = await server.ssrLoadModule('/src/lib/units.js');
expect('3.6 m shown in feet', units.toBig(3.6, 'imperial'), 11.8);
expect('3.6 m shown in metres', units.toBig(3.6, 'metric'), 3.6);
expect('11.8 ft typed, in metres', units.fromBig(11.8, 'imperial'), 3.6);
expect('3.456 m typed, to the centimetre', units.fromBig(3.456, 'metric'), 3.46);
expect('the smallest room in feet', units.toBig(1.5, 'imperial'), 4.9);
expect('the big unit in Imperial', units.bigUnit('imperial'), 'ft');
expect('a slider length in feet and inches', units.formatLength(1.2, 'imperial'), '3 ft 11 in');

// Pinterest board links, in the shapes people paste them
const pinterest = await server.ssrLoadModule('/src/lib/pinterest.js');
const boardOf = (text) => {
  const read = pinterest.readBoardLink(text);
  return read.problem ? 'problem' : `${read.username}/${read.board}`;
};
expect('board link with https', boardOf('https://www.pinterest.com/someone/my-board/'), 'someone/my-board');
expect('board link without https', boardOf('pinterest.com/someone/my-board'), 'someone/my-board');
expect('board link from another country', boardOf('https://www.pinterest.co.uk/someone/my-board/'), 'someone/my-board');
expect('board link with a country in front', boardOf('https://br.pinterest.com/someone/my-board/'), 'someone/my-board');
expect('board link with a section', boardOf('https://www.pinterest.com/someone/my-board/chairs/'), 'someone/my-board');
expect('board link inside a shared message', boardOf('Look at this board! https://www.pinterest.com/someone/my-board/?invite_code=abc'), 'someone/my-board');
expect('a pin is not a board', boardOf('https://www.pinterest.com/pin/123456/'), 'problem');
expect('a profile is not a board', boardOf('https://www.pinterest.com/someone/'), 'problem');
expect('a profile tab is not a board', boardOf('https://www.pinterest.com/someone/_saved/'), 'problem');
expect('a short link is not followed', boardOf('https://pin.it/4abcDEF'), 'problem');
expect('another site is not a board', boardOf('https://example.com/someone/my-board'), 'problem');
expect('plain words are not a board', boardOf('my living room ideas'), 'problem');

console.log(failures ? `${failures} failed` : 'all passed');
await server.close();
