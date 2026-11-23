// Checks saving a home and a moodboard to an account and loading them back, with no
// browser and no real Firebase. Run it from the project folder:
//
//   node tests/logic/check-account.mjs
//
// 'firebase/firestore' is swapped for tests/logic/fake-firestore.js, which keeps the
// documents in memory and refuses what the real Firestore refuses (undefined values,
// a list inside a list, a document over 1 MiB). The app's own lib/storage.js runs unchanged.
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectFolder = fileURLToPath(new URL('../..', import.meta.url));
const here = fileURLToPath(new URL('.', import.meta.url));
const server = await createServer({
  root: projectFolder,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  resolve: {
    alias: [
      { find: 'firebase/firestore', replacement: `${here}fake-firestore.js` },
      { find: /^\.\.\/firebase\.js$/, replacement: `${here}fake-firebase.js` },
    ],
  },
});
const storage = await server.ssrLoadModule('/src/lib/storage.js');
const fake = await server.ssrLoadModule(`${here}fake-firestore.js`);
const room = await server.ssrLoadModule('/src/lib/room.js');
const light = await server.ssrLoadModule('/src/lib/light.js');
const surface = await server.ssrLoadModule('/src/lib/surface.js');
const example = await server.ssrLoadModule('/src/data/exampleRoom.js');

let failures = 0;
function expect(name, got, want) {
  const isRight = JSON.stringify(got) === JSON.stringify(want);
  if (!isRight) failures += 1;
  console.log(`${isRight ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got).slice(0, 160)}${isRight ? '' : ` (wanted ${JSON.stringify(want).slice(0, 160)})`}`);
}

// The home a new person starts with, plus the example room, as App.jsx holds them.
const bedroom = {
  id: 'room-1',
  name: 'Bedroom',
  kind: 'bedroom',
  size: room.DEFAULT_ROOM,
  // `tint: undefined` is the kind of value a piece can pick up on the way; Firestore refuses it as it is
  pieces: [{ id: 'bed-1', type: 'bed', x: -1.0, z: -0.45, rotation: 0, existing: true, tint: undefined }],
  lighting: light.DEFAULT_LIGHTING,
  surfaces: surface.DEFAULT_SURFACES,
};
const living = example.exampleRoom();
const home = { name: 'My home', activeRoomId: living.id, rooms: [bedroom, living] };
const person = 'person-1';

// 1. Nothing saved yet
expect('a new account has no home', await storage.loadHome(person), null);
expect('a new account has no moodboard', await storage.loadMoodboard(person), null);

// 2. Save the home, load it back
await storage.saveHome(person, home, home.rooms, []);
const back = await storage.loadHome(person);
expect('the home comes back with its name', back.name, 'My home');
expect('the open room comes back', back.activeRoomId, living.id);
expect('the rooms come back in tab order', back.rooms.map((entry) => entry.id), [bedroom.id, living.id]);
expect('the example room comes back whole', back.rooms[1], storage.completeHome(JSON.parse(JSON.stringify(home))).rooms[1]);
expect('the bed comes back', back.rooms[0].pieces[0].type, 'bed');
expect('one document per room', [...fake.store.keys()].sort(), [`users/${person}`, `users/${person}/rooms/${bedroom.id}`, `users/${person}/rooms/${living.id}`].sort());

// 3. Change one room, remove the other
const moved = { ...bedroom, pieces: [{ ...bedroom.pieces[0], x: 0.5 }] };
await storage.saveHome(person, { name: 'Flat', activeRoomId: moved.id, rooms: [moved] }, [moved], [living.id]);
const after = await storage.loadHome(person);
expect('the new name is saved', after.name, 'Flat');
expect('the removed room is gone', after.rooms.map((entry) => entry.id), [bedroom.id]);
expect('the moved bed is saved', after.rooms[0].pieces[0].x, 0.5);

// 4. The moodboard, next to the home in the same document
const board = { source: 'pinterest', boardName: 'Ideas', boardUrl: 'https://www.pinterest.com/a/b/', owner: 'A', pinCount: 2, images: [{ id: '1', src: 'https://i.pinimg.com/564x/a.jpg', width: 564, height: 700, color: '#aaaaaa', description: 'Pin', link: 'https://www.pinterest.com/pin/1/' }], pickedIds: ['1'] };
await storage.saveMoodboard(person, board);
expect('the moodboard comes back', await storage.loadMoodboard(person), board);
expect('saving the moodboard keeps the home', (await storage.loadHome(person)).name, 'Flat');
await storage.saveMoodboard(person, null);
expect('the moodboard can be forgotten', await storage.loadMoodboard(person), null);

// 5. Another person sees none of it
expect('another account starts empty', await storage.loadHome('person-2'), null);

// 6. Photos. A floor or wall photo is a JPEG kept as text inside the room. Two photos
// of 300 kB fit in a room's document; this shows how much room is left.
const photo = (bytes) => `data:image/jpeg;base64,${'A'.repeat(bytes)}`;
const withPhotos = { ...bedroom, surfaces: { floor: { ...bedroom.surfaces.floor, kind: 'photo', photo: photo(300000) }, wall: { ...bedroom.surfaces.wall, kind: 'photo', photo: photo(300000) } } };
let photoProblem = 'none';
try {
  await storage.saveHome(person, { name: 'Flat', activeRoomId: withPhotos.id, rooms: [withPhotos] }, [withPhotos], []);
} catch (error) {
  photoProblem = error.message;
}
expect('a room with two 300 kB photos saves', photoProblem, 'none');
const tooBig = { ...bedroom, surfaces: { ...withPhotos.surfaces, floor: { ...withPhotos.surfaces.floor, photo: photo(1100000) } } };
let bigProblem = 'none';
try {
  await storage.saveHome(person, { name: 'Flat', activeRoomId: tooBig.id, rooms: [tooBig] }, [tooBig], []);
} catch (error) {
  bigProblem = error.message.includes('byte limit') ? 'refused for size' : error.message;
}
expect('a room over 1 MiB is refused, which the account menu reports', bigProblem, 'refused for size');

console.log(failures ? `${failures} failed` : 'all passed');
await server.close();
