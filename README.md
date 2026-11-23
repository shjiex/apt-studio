# Apt Studio

Your inspiration, in your room. A room and desk planner for students, renters and remote workers.
HCDE 438 final project (the "Curio" proposal from FP1, renamed Apt Studio).

## Run it

```
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

## Set up accounts (once)

Logging in and saving need a Firebase project. Until this is done the app still runs, with a notice on the login page.

1. In the [Firebase console](https://console.firebase.google.com/) create a project and add a Web app.
2. Copy `src/firebaseConfig.example.js` to `src/firebaseConfig.js` and paste the `firebaseConfig` values into it. That file is in `.gitignore`, so it is not in the repository; without it the app runs in visitor mode.
3. Authentication > Get started > enable **Email/Password**.
4. Firestore Database > Create database, then paste the contents of `firestore.rules` into the Rules tab so each person can only read their own data.

## What works now

Milestone 1: the room
- A room you build by hand: **Edit room** sets width, length and height in metres.
- One 3D scene with two views: **2D** looks straight down, **3D** tilts the same camera.
- Press a furniture tile to put the piece in the room; press it again to take it out.
- Drag a piece to move it. Select it to **Rotate** or **Remove** it.
- Each piece says whether it **Fits**, is **Tight**, or is **Blocked** (overlapping furniture or the door swing).
- **Undo** after every add, remove and rotate. **Download** saves the room as a PNG.
- Phones show one panel at a time with a tab bar.

Milestone 2: a real moodboard
- **Connect Pinterest**: paste the link to a public board and its pins become the moodboard (up to 50).
- **Log in / Create account** with email and password (Firebase Authentication).
- When signed in, the connected board and the picked pins are saved to your account (Cloud Firestore) and come back on the next visit or another device.
- A board connected before logging in is kept and saved once you log in.

Layout round (after review)
- A top bar holds the name, the room chip (press it to change the room size), the **2D / 3D** switch, the measurement grid toggle and Download.
- **Measurement grid**: a light half-metre grid on the floor with the room's width and length written along the open sides. Works in 2D and 3D.
- The bar between the room and the moodboard can be **dragged** (or moved with the arrow keys) to change how wide each side is.
- The moodboard is laid out like a Pinterest board: board name, pins in columns that reflow with the width, titles under pins. A picked pin gets a border inside the image.
- Connect board and account are two icons at the top right of the moodboard.

Interaction round
- Pressing a tile adds one more of that piece (a badge counts them); **Duplicate** copies the selected piece.
- Pieces **snap flush to a wall** when dragged within 12 cm of it. Two green lines and the selection bar show the distance to the nearest walls.
- **Undo and redo** keep the whole history (buttons on the stage, or Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z). The room's area is shown beside them.
- **Keyboard:** arrow keys nudge the selected piece 5 cm, R rotates, D duplicates, Delete removes, Escape deselects.
- **Zoom** with the mouse wheel or the + / − / fit buttons. In **3D, drag empty floor to orbit**; the side wall nearest the camera lowers so it never blocks the view.

Not saved yet: the room and its furniture reset on refresh.

### Realistic 3D round (22 Nov)

- The eight catalog pieces are real 3D model files now (`public/models/catalog/*.glb`), the
  same furniture as the tile pictures. A simple box version shows until a model has loaded.
- The floor is wood with real-looking grain and grooves (`public/textures/`).
- Soft light from all around plus one sun light, so materials and shadows look natural.
- Each moodboard image aims at one object. If a 3D model was made from it, hovering shows a
  frame around the object and a button under the image adds it to the room.
- The models are made by the Python scripts in `pipeline/`. See `pipeline/README.md` for what
  they do and their limits.

Checked in a headless browser on Linux: all model files load, catalog and moodboard pieces can
be added, no console errors in 2D or 3D. Not yet run on a Mac.

### Feng shui, groups and shop links (22 Nov, later)

- **Feng shui score** in the top bar, out of 100, with the checks behind it and up to three things
  to try. It measures the room: headboard against a solid wall, bed out of the door's path and not
  under the window, room on both sides of the bed, desk not turning your back to the door, door free
  to open, enough open floor, a plant, a lamp. Based on common feng shui guidelines; a guide, not a rule.
- **Furniture groups**: chips above the tiles (All, From your board, Seating, Desks and tables,
  Storage, Beds, Lighting, Rugs and plants) so the strip stays short.
- **Shop link per piece**: select a piece, press "Add link" and paste a product page (for example an
  Amazon page). "Shop" then opens it. Furniture made from a Pin starts with the page the Pin came from.
- **Shop list** in the top bar: every piece in the room that has a link, with a button to open it.
- One moodboard model (the blue sofa) is now a real image-to-3D result; see `pipeline/README.md`.
- The app runs on a fresh copy without `src/firebaseConfig.js` (visitor mode).
- **Your furniture** (top bar): furniture you already own, read from a photo of your room by
  `pipeline/photo2inventory.py`. The dialog shows the photo with each piece framed, you keep or drop
  each one, and the kept ones go into the plan in grey. The photo cannot tell where a piece stands,
  so each lands in the first open spot and you drag it into place. A sample list from one of the
  sample photos is included.

Checked in a headless browser on Linux: score changes as furniture is added, groups filter the
tiles, a link can be saved and shows in the shop list, no console errors. Shop links are not saved
to an account yet.

### Photo render and floor plan (22 Nov, morning)

- **Room file**: the download button now opens two choices, "Picture" (as before) and "Room file".
  The room file holds the room's size and every piece: what it is, where it stands, which way it
  faces, its size and its 3D model.
- **Photo render**: `pipeline/render_room.py` turns a room file into one realistic picture with
  Blender. It is a separate step run from a terminal, about 6 minutes a picture on the machine it was built on. Samples: `pipeline/samples/`.
- **Room from a floor plan**: room chip, then "Take it from a floor plan instead". The dialog shows
  the plan with each room `pipeline/plan2room.py` found. Pick yours and type how wide it is; the app
  works out the length. A drawn sample plan is included. On real plans it finds roughly two thirds
  of the rooms; details and measured errors are in `pipeline/README.md`.

Checked in a headless browser on Linux: both downloads save a file, a room picked from the plan
changes the room size (4.25 m typed gives 4.25 × 6.21 m; the drawing says 6.20), a size the app
cannot hold is refused, no console errors.

### Live demo, shapes and shadows (22 Nov, 6 am)

- **Live demo build**: `VITE_DEMO=1 npx vite build --base=./ --outDir dist-demo` makes a copy that runs
  from any folder and keeps its pages in memory (see the note at the top of `src/App.jsx`). It is
  what the hosted test page uses. `src/demoFiles.json` lists where that host keeps the 3D model files.
- **Contact shadows**: a soft dark patch under every piece, so furniture sits on the floor in 2D and 3D.
- **Daylight**: the sun now comes from behind the window wall, so shadows fall toward you, and a soft
  warm patch lies on the floor in front of the window.
- **Piece panel**: selecting a piece swaps the moodboard for a panel about that piece: fit tag, icon
  buttons (rotate, duplicate, remove), size, distance to the two nearest walls, how far it is turned,
  and its shop link. Closing it, or clicking empty floor, brings the moodboard back. On a phone the
  bar over the stage is kept instead.
- **Lighting you describe**: the bulb button in the top bar opens a panel for the room's real light.
  - Daylight: on or off, which way the window faces (N, E, S, W) and the time of day. The sun is
    placed for that hour and only shines in through the window, so its patch moves across the room.
    A window facing away from the sun gets sky light only.
  - Fixed lights: add ceiling lights (nine spots), wall lights (which wall, how far along) and LED
    strips (along the top of a wall). Each has its colour in Kelvin and its brightness in lumens.
  - Lamps: every lamp piece shines. Select a lamp to give it its own bulb in the piece panel.
  The room file carries all of it to the photo render. `src/lib/light.js` holds the formulas
  (Kelvin to colour, lumens to brightness, where the sun stands).
- **Bigger catalog**: six more pieces made the same way as the first eight (armchair, nightstand,
  dresser, low bookcase, coffee table, dining table). 14 in all, plus the ones from the moodboard.
- **Moodboard cards**: just the image. On hover the rest of the photo fades, the target object is
  outlined in its real shape, and the caption and a small "add in 3D" button show under the image.
- **Room score**: the feng shui score is now a ring with the number in the corner of the preview. It
  also checks two layout habits: nothing tall in front of the window, and a rug held down by furniture.
- **Render from your view**: the room file also holds the 3D camera. `render_room.py --view app` takes the
  photo render from the angle that was on screen.
- **Your furniture**: each found piece is drawn as its real outline, not a rectangle. Sizes read
  "~200 × 90 cm" and "Likely" / "Uncertain" are chips.
- **Shop list**: each row shows the site's own icon (its `/favicon.ico`, or its first letter if that
  fails) and "Open" has an arrow.

### About the Pinterest connection

The pins come from the public feed behind Pinterest's own board-embed widget
(`widgets.pinterest.com/v3/pidgets/boards/<user>/<board>/pins/`). It needs no key, but it only
reads public boards, returns at most 50 pins, and is not a documented API, so it could change.
Pinterest's official API (v5) would allow "Log in with Pinterest" and secret boards, but it needs
an approved developer app and a server to hold the app secret. That is the next step if this
project continues.

## Plan

| Milestone | What it adds | Course requirement it covers |
|---|---|---|
| 1 (done) | Manual room, 2D/3D preview, furniture tiles, drag, fit check | React, interactive, responsive |
| 2 (done) | Pinterest board as the moodboard, accounts, saved moodboard, routes | Data from an API and from users, database, React Router |
| 3 | Save the room, suggestions tied to picked pins with a reason | Persistence for everything |
| 4 | Testing with people, accessibility pass, deploy | Deployment, evaluation |

## Routes

| Path | Page |
|---|---|
| `/` | `Workspace`: the room preview and the moodboard. Open to visitors. |
| `/login` | `AuthPage` in login mode. |
| `/signup` | `AuthPage` in sign-up mode. |

### Rooms, search and your own floor (22 Nov, 7 am)

- **Rooms as tabs**: a home is now a list of rooms. The row under the top bar shows the home's name
  (press it to retype it), one tab per room with the icon of its kind, and a + to add a room. Each
  room keeps its own size, pieces, lighting, floor and walls. Pressing the open room's tab opens the
  room dialog: kind (six to choose from), name, size, "Take the size from a floor plan" and "Remove
  this room". Undo history starts fresh when you open another room. `src/lib/rooms.js` lists the kinds.
- **Search**: a search field beside the group chips looks through every group by name. An empty
  result says so and suggests words to try.
- **Floor and walls**: the layers button in the top bar sets what the room is made of.
  - Floor: the built-in oak, or a photo of your own floor. You say how many metres the photo shows
    from left to right, and it repeats at that real size.
  - Walls: seven paint colours, any other colour, or a photo (wallpaper, brick, tiles).
  - A photo is made smaller and its light is evened out before use, so a bright side does not turn
    into stripes when it repeats. It repeats mirrored, so the edges of copies always match.
    `src/lib/surface.js` does this and explains it.
  - The room file carries the floor and walls, and the photo render uses them.
- **Fixed**: the stage could grow but not shrink again (the 3D canvas held it open). The canvas now
  fills the stage without adding to its height. On a phone the top bar wraps onto three rows.

### Angled photos, saving and board search (22 Nov, 8 am)

- **Angled floor and wall photos**: after you choose a photo, a dialog shows it with four corner
  handles. Drag them onto a rectangle you can measure (a block of tiles, a rug) and type its width
  and depth. The app straightens that rectangle and repeats it at its real size. A photo shot square
  on needs no dragging. `src/lib/straighten.js` holds the maths and explains it step by step.
- **Light evened out better**: the brightness of a photo is now read from a few big areas, so the
  correction follows the light and leaves a tile or board pattern alone.
- **Your home is saved**: the rooms (size, pieces, lighting, floor and walls) are kept in this
  browser, so a reload brings them back. When you are logged in they are also saved to your account,
  one Firestore document per room. The rules for that are in `firestore.rules`; paste the new
  version into the Firebase console. The account part has not been run against a real Firebase project.
- **Moodboard search**: a search field over the pins (it looks through each pin's description, its
  tags and the furniture made from it), three filters (All, Picked, In 3D) and an Explore link that
  opens a Pinterest search for the typed words in a new tab.

### Real sun, dimmers and start over (22 Nov, 8:10 am)

- **Sun for your place and month**: the lighting panel now asks where the home is (a city, or a
  latitude slider) and the month. The sun's height and compass direction come from the standard
  solar formulas in `src/lib/light.js` (`sunPosition`), so a June noon in Seattle is 66 degrees up
  and a December noon is 19. The panel shows when the sun rises and sets. Time is sun time: 12:00
  is when the sun is highest, so a clock can be an hour or so off.
- **Dimmer**: every fixed light and lamp bulb has a dimmer (5 to 100 percent) next to Kelvin and
  lumens. The room file carries the lumens after dimming, so the photo render matches.
- **Start over**: at the end of the room bar. It asks once, then goes back to the starter home.
- **Wall photo in the plan**: the tops of the walls stay plain, so the plan shows a clean wall line.

### Inside view, realistic picture, no dot separators (22 Nov, 8:40 am)

- **Inside view**: a third view beside 2D and 3D. You stand in the room at eye height with a wide
  lens, all four walls and the ceiling are there, and dragging looks around. A room seen from
  outside with its walls cut away always reads as a model; from inside it reads as a room.
- **Realistic picture** (inside view, the Realistic button): the picture is path traced in the
  browser with `three-gpu-pathtracer`. Light is followed as it bounces, so walls pick up colour from
  the floor and shadows are soft. It starts grainy and clears up pass by pass while you hold still;
  moving anything starts it again. The window opening is treated as a light so it clears up quickly.
  `src/components/PathTraced.jsx` explains each step. It has only been run on a machine without a
  graphics card (29 passes in 105 seconds); on a real one it should be many times faster.
- **Softer, truer normal view**: in 3D and inside, ambient occlusion darkens corners and the places
  under furniture, and tone mapping rolls off bright areas (`@react-three/postprocessing`, `n8ao`).
- **Your own furniture in real colours**: it is grey only on the 2D plan now.
- **No dot separators**: places that strung facts together with "·" now use layout. The moodboard
  header shows only where the pins come from (counts are on the filters); the lighting panel shows
  the sun state as a tag, sunrise, sunset and sun height as three small facts, and a bulb's colour
  name beside its swatch; room score tips are separate blocks; the phone selection bar uses a tag
  and separate items.

### Windows you place, motion, a calmer realistic picture (22 Nov, 9:30 am)

- **Windows**: a room has a list of windows. The layers button in the top bar (now "Floor, walls
  and windows") has a card per window: which wall, how far along it, width, bottom edge and top
  edge, plus "Add a window" and "Remove". The wall is really opened there, so daylight and the sun
  come in where your window is, in all three views and in the photo render. A balcony door is a
  window whose bottom edge is at 0. Walls you look over in the 3D view show a pale mark where a
  window is. `src/lib/room.js` has the window helpers (`wallFrame`, `openingOf`, `wallBlocks`).
  The room score checks now look at every window.
- **Motion**: panels grow out of the button that opened them, dialogs rise into place, the right
  panel slides when it swaps, the toast comes up from the bottom, buttons give a little when pressed,
  tiles lift on hover, and a new piece of furniture settles into the room. All of it is under a
  quarter of a second and is switched off when the system asks for reduced motion (the "motion"
  block at the end of `src/styles/app.css`, and `Piece` in `Room3D.jsx`).
- **Realistic picture**: daylight and bulbs now keep their real proportions, with a camera-like
  exposure (low by day, high at night). Bulbs are small glowing panels instead of points, which
  removed most of the white specks. A denoiser smooths the grain and fades out as passes come in.

### Doors you place, dragging on the plan (22 Nov, 10 am)

- **Doors**: a room has a list of doors, like its windows. The layers panel has a card per door
  (which wall, how far along, width), "Add a door" and "Remove". The floor a door swings over stays
  clear: furniture there shows as Blocked, and the room score's door checks use every door.
  `src/lib/room.js`: `defaultDoors`, `newDoor`, `doorOpening`, `doorInRoom`, `doorZone`, `coversDoor`.
- **Drag on the plan**: in the 2D view, press a window or door on its wall and drag to slide it
  along that wall (`grip` in the `Wall` component of `Room3D.jsx`, and `handleFloorMove` in `Scene`).
- The photo render draws doors where the app has them.

### Prices, standing where you click, brightness and save (22 Nov, 10:15 am)

- **Prices**: a piece can carry a price next to its shop link ("Add link or price" in the piece
  panel). The shop list shows each price and a total for the priced pieces. `ShopList.jsx`
  (`formatPrice`, the total), `PiecePanel.jsx` (the price field), `handleSetLink` in `Workspace.jsx`.
- **Inside view**: click the floor to stand there. You stay 40 cm off every wall and turn to face
  the middle of the room; the turn is eased. `handleFloorDown`, `handleUp` and `CameraRig` in `Room3D.jsx`.
- **Realistic picture**: a Brightness slider (applied when the picture is shown, so it does not
  restart) and a "Save picture" button. `PreviewPanel.jsx`, `PathTraced.jsx`.
- **Wording**: shorter tips in the room score and one plain instruction in "Mark a rectangle".

### Undo for windows and doors, drag handles, no overlap, paint names (22 Nov, 10:45 am)

- **Undo covers the room**: a history step now holds the pieces and the room (size, windows,
  doors). A drag or a slider counts as one step. Adding or removing a window or door shows a toast
  with Undo. `rememberPieces`, `changeRoom`, `handleUndo` and `handleRedo` in `Workspace.jsx`.
- **Handles on the plan**: each window and door has a dark dot in a white ring on its wall, so it
  is clear it can be dragged (`grip` in the `Wall` component of `Room3D.jsx`).
- **No overlap**: a window or door stops 5 cm from its neighbour on the same wall, and jumps to the
  far side when the pointer is nearer to it. If a wall has no free place, nothing changes and the
  panel says so. `keepClear` in `src/lib/room.js`, used by the panel and by the drag.
- **Paint names**: twelve named wall paints, and the name and colour code of the one in use.

### Doorways with an open door, a named picture, a calmer photo render (22 Nov, 11:15 am)

- **Doorways**: a door is now a real opening in its wall, with a frame, and the door stands open
  75 degrees on its hinge with a knob. In the Inside view and the realistic picture a short hall
  lies behind it. An unseen sheet in the doorway still casts a shadow, so the sun only comes in
  through windows. `Wall` in `Room3D.jsx` (`HALL_DEPTH`, `DOOR_OPEN`).
- **Saved picture**: the file is named after the room, for example `apt-studio-bedroom.png`.
- **Photo render** (`pipeline/render_room.py`): the door stands open the same way, with the doorway
  drawn as a dim panel (the walls there are flat sheets). A room with more glass is exposed one stop
  down for every doubling of glass beyond one ordinary window, so two big windows no longer wash
  the picture out. Samples: `pipeline/samples/render-two-windows.jpg`, `render-open-door.jpg`, and
  the room file they came from, `room-two-windows.json`.

### A door's hinge side, open or shut (22 Nov, 11:40 am)

- A door's card has two more choices: **Hinge** (left or right, as you face the door from inside
  the room) and **Door** (open or shut). A door keeps them as `hinge` and `shut`; an older door
  counts as hinged on the left and open. The plan's quarter circle starts at the hinge. A shut door
  lies in its doorway. `Wall` in `Room3D.jsx`, the door card in `SurfacesMenu.jsx`.
- The floor a door swings over is the same square for either hinge, so the fit and room score
  checks did not change.
- The photo render follows both choices (`openings_of` and the door part of `build_room`).

### Stronger glass that still passes AA, and a dark doorway in the 3D view (22 Nov, 2:30 pm)

- **Glass**: the controls that float over the room (undo and redo, zoom, the room score, the
  inside-view row, the selection bar) and the two switches in the bars (the view switch and the
  room tabs) are glass: 30% white over a blurred backdrop, a bright rim, a top highlight, a bottom
  shade and a drop shadow. It is the "Glass, stronger" version from the Figma file.
- **AA**: the backdrop is blurred, then squeezed towards light (`contrast(0.55) brightness(1.45)`),
  then covered with 30% white, so even over pure black the glass is a mid grey and ink text on it
  measures 5 to 1 or more. Every label on glass is ink; the chosen option is 82% ink with white
  text (11 to 1 or more). The whole rule is written above the glass block at the end of
  `src/styles/app.css`. With no backdrop blur in the browser, or with "reduce transparency" or
  "more contrast" set in the system, glass becomes solid white.
- **Checked**: `shoot38.py` puts black, navy, tomato and white behind the controls, reads the
  colour the browser paints and works out the contrast. Lowest reading: 4.99 to 1 (AA needs 4.5).
- **3D view**: a doorway is closed at the back by a flat dim sheet, so you see a dark doorway and
  not the bright ground beyond it. A real hall would stick out past the wall in that view.

### Whole-object outlines, motion and quieter colour (22 Nov, 3:30 pm)

- **Whole-object outlines** (`pipeline/pin2object.py`, `whole_outline`): the highlight on a
  moodboard image and on a found piece now covers the whole object, hidden parts included. The
  detector only sees what the camera sees, so a rug under a table had a bite out of it and a sofa
  under a blanket lost an arm. Now a rubber band (convex hull) goes round the visible part, and
  inside it everything else that was detected, plus what the matting model calls foreground, is
  counted as the object carrying on behind. A rug becomes the four-cornered shape round all its
  pieces. Thin things (lamps, plants) are left alone. `outline` is the whole object; `seen_outline`
  keeps what the camera saw; `filled_in` lists what was added. `photo2inventory.py` uses it too.
- **Pressed**: buttons, tabs, chips and tiles sink in while held (down 1 px, 97% size, an inner
  shadow). The rule is in the "pressed" block at the end of `src/styles/app.css`.
- **View switch**: one dark thumb slides from the old option to the new one with a small overshoot
  and stretches on the way (`ViewSwitch.jsx`, the Web Animations API). No motion if the system
  asks for less.
- **Colour ramps** (`src/styles/tokens.css`): tint, soft, shade, deep and tone for each colour,
  warm and cool greys. Fit tags use a tint with the deep colour for the word (all at least 4.7 to 1).
- **Room score**: the button shows only the number and is 48 by 48, the width of the zoom buttons
  above it. Its card shows one thing to do first with its tip and what it is worth; the other
  things to improve and the checks that pass are folded away, each line with an icon (`FengShuiCard.jsx`).

### Glass on panels, the toast and the phone tab bar (22 Nov, 3:45 pm)

- The panels that open over the room (lighting, floor and walls, the room score card) are glass.
  Grey text fails AA on glass, so inside a panel `--ink-muted` is set to ink and every label
  follows. Blocks inside a panel are a milkier 55% white. The app blurs behind a dialog; dialogs
  themselves stay solid white.
- The toast is dark glass (82% ink, white text). On a phone the tab bar is light glass with ink
  labels.
- All of it is in the three "glass" blocks at the end of `src/styles/app.css`, and falls back to
  solid colour when the system asks for less transparency or more contrast.
- `shoot38.py` measures the lighting panel as well: lowest reading 4.99 to 1.

### Flowing choice rows, an example room, six more models and furniture choices per picture (22 Nov, 4:10 pm)

- **Choice rows.** `Segmented.jsx` draws every small choice row in the lighting panel and the
  floor-and-walls panel (compass side, a light's wall, oak or your photo, paint or your photo,
  a window's or door's wall, hinge side, open or shut). One dark thumb slides from the old choice
  to the new one and stretches on the way. The sliding and the stretch live in
  `src/lib/useSlidingThumb.js`, a custom hook that `ViewSwitch.jsx` uses too, so the two do not
  repeat each other. The buttons keep their names and `aria-pressed`.
- **Example room.** The add-room dialog has "Or start from an example". "Open the example room"
  adds `Colour block living room` (4.6 by 3.8 by 2.6 m) as a new room: eleven catalog pieces placed
  after the sample photo `mood-2.jpg`, a window on the left wall, early evening light, warm lamps,
  and a painted wall (`public/example/colour-block-wall.jpg`, drawn for this and used through the
  existing "Your photo" wall option). It is in `src/data/exampleRoom.js`. It is a model of the
  photo's layout and colours. It is not the photo: the art, the shelves and the small things on
  them are not modelled.
- **Six more models made in Blender.** Dining chair, TV stand, wardrobe, side table, floor mirror
  and pouf, built in `pipeline/furniture_lib.py`, baked by `pipeline/bake_catalog.py` and listed in
  `src/data/catalog.js` with tile pictures. The catalog has 20 pieces now.
- **Furniture choices per picture.** Every piece of furniture found in a sample moodboard picture
  has its own outline (4 to 6 per picture, written by `pin2object.py --manifest` into `elements` in
  the pins manifest). Pressing one opens a card that lists the model made from that picture first
  and then the catalog pieces of that kind, each with an Add button. A note above the board says
  that simpler pictures work best.
- **Plan flicker and a faster Realistic picture.** The effects pass (`RoomEffects.jsx`) and the
  path tracer (`PathTraced.jsx`) are fetched only when a view needs them, so the plan opens
  without them. Changes in `Room3D.jsx` aim at the flickering outlines on the plan. This part was
  not verified before the session ended.
- **Glass without a drop shadow.** `--glass-edge` in `src/styles/app.css` ends in a 1 px hairline
  in place of the soft shadow that reached outside the glass.
- **Sample photo tags.** The tags and credits of four sample photos (`mood-2` to `mood-5`) were
  attached to the wrong files. They are paired by what each picture shows now.
- **Firebase.** The project `apt-studio-cb84e` exists: Email/Password sign-in is on, and the
  Firestore database has `firestore.rules` published. Pasting its config into
  `src/firebaseConfig.js` is the one step left, and the first real save and load has not been run.
- **Tests and handoff.** The headless test scripts are in `tests/headless/` (`shoot41.py` covers
  the furniture choices, `shoot42.py` the example room). `AGENTS.md` is the handoff for a coding
  agent.

### One panel at a time, and glass without outside shadows (22 Nov, 6:30 pm)

- **One panel at a time.** Lighting, Floor and walls, Download and the room score card used to
  open on top of each other. `Workspace.jsx` now keeps which one is open (`openPanel`), so opening
  one closes the one before, pressing its button again closes it, and Escape closes it. With a
  piece selected, the first Escape closes the panel and the second clears the selection.
- **No shadow outside the glass.** The 4:11 pm rule, finished. The view switch thumb, the
  segmented thumb and the toast keep only their inner highlight. Every glass surface that uses
  `--glass-edge` ends in a 1 px hairline. Pressed states were already inner shadows, so they stay.
  Dialogs and the account menu are solid white, not glass, and keep their soft shadow.
- **Contrast, measured.** Text on glass over a black and a white backdrop, measured in a headless
  browser before and after. Lowest reading 5.34 to 1 (glass groups over black). The toast reads
  11.39 to 1 over white and 19.57 to 1 over black, the same as before.

### The Realistic picture gets ready before you switch it on (22 Nov, 8:45 pm)

- **What took the time.** Timed in a headless browser with software graphics: after the click,
  reading the room took 0.16 s and preparing the tracer's program on the graphics card took about
  3.5 s, the biggest single wait. The rest was the normal picture's own frames, which are slow
  only in software graphics.
- **What changed.** `PathTraced.jsx` is now mounted the whole time you are in the inside view.
  One second after you step inside, it reads the room once and has the graphics card prepare the
  program in the background. Switching Realistic on then reads the room afresh (a fraction of a
  second, so models and pictures that finished loading are included) and starts tracing at once.
  The drawing loop moved into a small `TracedPicture` part that is there only while Realistic is on.
- **When it does not apply.** Preparing in the background needs the `KHR_parallel_shader_compile`
  feature, which Chrome has. Without it the app waits for the click as before, since preparing
  would freeze the page while you look around. `?prepare` in the address forces it for testing.
- **Checked.** With `?prepare` the first traced frame came 4.3 s after the click in software
  graphics (12.0 s before), and all of that was normal frames before the switch. The inside view
  before the click is pixel for pixel the same. After 16 passes the picture matches the old way
  (mean 168.9 against 169.6, half the areas lighter and half darker). Switching off, changing the
  room, switching on, and leaving and coming back with Realistic on all work. Not yet seen on a
  real graphics card.

### The example room looks more like its photo, and object2glb keeps furniture choices (22 Nov, 8:50 pm)

- **Arches on the back wall only.** A wall picture can now be kept to one wall: `onlyOn` in
  `surfaces.wall` names it, and the other walls take the wall colour. The example room sets
  `onlyOn: 'back'`, so the arches sit behind the sideboard as in `mood-2.jpg` and the other walls
  are cream. Choosing a new wall photo in Floor and walls covers every wall again.
- **A first inside view like the photo.** A room can carry `insideView` (where you stand and
  which way you look). The example room starts behind the sofa, looking at the sideboard and the
  arches. Opening another room now starts its inside view afresh, where before a spot clicked in
  one room was kept in the next.
- **`object2glb.py` keeps `elements`.** Rebuilding an image's model used to drop the furniture
  choices that `pin2object.py --manifest` adds to its manifest entry. `merge_manifest` now keeps
  them, so the order of the two scripts no longer matters. Tested without Blender on sample entries.
- **Checked.** The example room in 3D and Inside, then the bedroom's inside view back in its
  usual corner. The checks used a stand-in wall picture, because `public/example` is not on GitHub.
- **Still open from the handoff.** The sofa colour choice, the art and the shelves.

### Panels stay on a phone's screen, and checks with a real pointer (22 Nov, 9:00 pm)

- **Panels on a phone.** At phone width the Lighting, Floor and walls and Download panels opened
  off the left edge of the screen, because each was placed against the right edge of its button
  and the buttons wrap to the left on a phone. Under 900 px they now hang from the whole top bar:
  as wide as the bar, just under it, and short enough to stay above the tab bar (they scroll
  inside). A new block at the end of `src/styles/app.css`. Checked at 390 by 844.
- **Dragging with a real pointer.** In a headless browser with real mouse presses and moves, the
  bed on the plan followed the pointer, snapped flush to the back wall within 12 cm, stopped flush
  at the front wall when dragged past it, turned Blocked over the door swing, and one undo put
  the whole drag back. Nothing needed fixing.
- **Choice rows, measured.** The contrast of the segmented rows was reasoned before. Measured
  now over black and white backdrops: ink on the track 16.53 to 1 on both, white on the chosen
  thumb 11.92 to 1.

### Checks for the fit tags and the room score (22 Nov, 9:00 pm)

- **`tests/logic/check-logic.mjs`.** 31 small checks of `getFit` (`src/lib/room.js`) and
  `getFengShui` (`src/lib/fengshui.js`): overlaps, the 15 cm tight gap, a rug under furniture,
  the door swing, turned pieces, a bed under a window or in line with the door, a desk with the
  door behind you, open floor, and every piece of the example room fitting with a score of 100.
  Run it from the project folder with `node tests/logic/check-logic.mjs`. It loads the app's
  files through Vite, so nothing new is installed.
- **What they found.** No bugs. Two of the desk checks were first written the wrong way round: a
  desk turned 0 degrees against the back wall has you facing that wall, so a door in the front
  wall is behind you, which the app gets right.
- **The room score has eleven checks,** not nine as the handoff said: four for a bed, one for a
  desk, and six for every room (the rug one only when there is a rug). Each applies only when its
  pieces are in the room.

### Escape closes dialogs, and the demo path checked end to end (22 Nov, 9:05 pm)

- **Escape closes dialogs.** The shop list, the room dialogs, the floor plan picker, Pinterest and
  Your furniture now close with Escape, the same as their Cancel or Close button, even while the
  cursor is in one of their fields. `closeDialog` in `Workspace.jsx`. Tested on the shop list,
  Your furniture and Add a room.
- **Demo path, checked.** In a headless browser: a moodboard couch given a link and a price
  shows in the shop list with its total ($249.99 for one piece), Download gives a 229 kB PNG of the
  stage and a room file with the room, pieces, lighting, surfaces and camera. Nothing needed fixing.

### A new piece looks for room turned, too (22 Nov, 9:10 pm)

- **Where a new piece lands.** `findOpenSpot` in `src/lib/room.js` tried only the piece as it
  comes, and with no spot where it fit, it put the piece in the middle of the room, often on top
  of the bed. It now tries the piece turned 90 degrees as well, then a spot where it is only
  Tight, before falling back to the middle. It gives back the turn too, and `handleAddItem` and
  `handleAddExisting` in `Workspace.jsx` use it. Pieces that fit as they come land exactly
  where they did before.
- **Checked.** The 2.27 m couch from the first sample picture, added to the starter bedroom,
  used to land on the bed as Blocked. It now comes in turned 90 degrees beside the bed and Fits.
  Three new lines in `tests/logic/check-logic.mjs` cover it ({n} checks, all passing).

### Accessibility check with axe (22 Nov, 9:15 pm)

- **What ran.** The axe accessibility checker (axe-core 4, in a headless browser, not added to
  the project) on the main screen, the Lighting panel and the room dialog.
- **Fixed.** The moodboard divider is a separator you can move, so it now says where it is
  (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`). The room tabs pill held the + button inside
  its tab list, where only tabs belong; the tabs now have their own list (`room-tabs__list`) inside
  the pill, with the + button beside it. The tab row is pixel for pixel the same as before.
- **Left as is.** axe asks for a furniture tile's visible text to be in its name. The name is
  "Add Bed. 1 in the room.", which has the visible label; axe also counts the small number badge.
  The room dialog puts `role="dialog"` on a form, which axe rates minor. No contrast problems
  were reported.

### Glass that looks like the Figma glass (22 Nov, 10:10 pm)

- **What was wrong.** On the light stage the app's glass came out pure white, because its filter
  lifted everything behind it (`brightness(1.45)`) until light areas blew out. In Figma (the
  Stage control, node 216:4668) the same glass is a soft grey pill a little darker than the stage,
  with a white rim and a soft shadow under it.
- **What changed.** `--glass-filter` is now `blur(14px) contrast(0.45) brightness(1.05)
  saturate(1.8)`: the 14 px blur Figma uses, a pull toward middle grey that keeps ink text above
  AA over black, and saturation so the room's colours still show through. `--glass-edge` has
  Figma's soft shadow back, lighter (0.14 in place of 0.2). Every glass surface uses these two
  variables, so the controls, the view switch, the room tabs and the panels all changed together.
- **Measured.** Over black, ink text on glass reads 4.86 to 1 at the lowest (AA needs 4.5). Over
  white it reads 12.94 to 1, and the glass there is grey 212, against 215 in the Figma render.

### Checked on a real graphics card, and the files GitHub was missing (22 Nov, 10:30 pm)

- **A real graphics card at last.** The hosted test build was opened on a MacBook with an Apple
  M4. The plan, the 3D view, the inside view, the moodboard and the glass all draw as they should,
  and the zoom control matches the Stage control in Figma (node 216:4668).
- **The Realistic picture, timed there.** After you step inside, the program is ready in about
  0.8 s. Reading the room takes about 0.1 s. The first traced picture is on screen in the first
  frame after you switch Realistic on, and the picture gains about 12 passes a second. At 130
  passes it looked clean. On software graphics the same start took 4.3 s.
- **One thing to know when testing.** A browser tab that is hidden stops drawing frames, so the
  picture seems stuck at "Starting". That is the browser saving power. Bring the tab to the front
  and it continues.
- **Files the GitHub copy lacked.** `public/models/pins/manifest.json` with the furniture choices
  (`elements`), `pipeline/pin2object.py`, `bake_catalog.py` and `furniture_lib.py` from the 4 pm
  round, `public/example/colour-block-wall.jpg` (without it the example room's wall is black)
  and the twenty files of `tests/headless/`.
- **The hosted demo.** `src/demoFiles.json` now lists the model files of the new hosted build,
  because the first one can no longer be republished.

### The moodboard filter row and the furniture choice card (22 Nov, 10:45 pm)

- **Filter row.** On a short screen the All, Picked and In 3D chips shrank to a sliver once the
  note above the pins made the moodboard longer than the window. A row that can scroll sideways
  is allowed to shrink inside a column, so the row now has `flex: none` and keeps its 32 px.
- **Furniture choice card on a phone.** The card stopped 12 px above the bottom of the window,
  which on a phone is under the tab bar. It now stops 8 px above the tab bar when the tab bar is
  shown (`MoodboardPanel.jsx`).
- **Looked at on the MacBook.** The example room opens with its wall picture on the back wall
  only, and dragging the bed on the plan showed steady outlines.
- **Measured.** Ink text on the card reads 4.86 to 1 over black and 12.94 to 1 over white. Text
  inside a choice row reads 11.11 to 1 over black. AA needs 4.5.

### The layout from my Figma frame, lighter glass, and furniture you select first (23 Nov, 12:15 am)

- **Layout.** The top bar holds the logo, the home, the room tabs, Settings, Preferences and
  the account. The view switch, download, grid, lighting and floor and walls buttons stand on
  the room itself as glass. Moodboard and Shop share one section on the right that closes.
  Preferences has a choice called Tools that moves furniture, lighting and floor and walls into
  their own section on the left of the room (`ToolsPanel.jsx`, `SidePanel.jsx`, `TopMenus.jsx`).
- **Glass.** The pressed state is gone. The chosen pill flows from the old option to the new
  one in the view switch, the room tabs, the choice rows and the furniture groups
  (`useSlidingThumb.js`). The glass shadow went from a wide dark one to a 3 px one
  (`--glass-edge` in `app.css`), so it stays off the rest of the page. Sliders are glass
  (`Slider.jsx`).
- **Furniture on the stage.** A click selects a piece and a second drag moves it, so turning
  the room cannot drag a sofa by accident. Rotate and a red Remove float above the selected
  piece. Duplicate is removed. A tile can be dragged from the list and dropped on the floor.
- **The piece panel.** Width, depth, height and the distance from the left and back walls can
  be typed. Colour and finish (as made, matte, gloss, metal) can be changed. Each field has an
  icon. The tag reads Own in place of Already yours (`PiecePanel.jsx`).
- **Feet and inches.** Preferences switches every length between metres and feet
  (`lib/units.js`).
- **The room.** The 3D view turns all the way round, and the walls nearest the camera drop to
  a rim so the room stays visible. A double click on the floor, a wall, a window or a door
  opens its settings. Four arrows outside the plan drag a wall in or out. A window or a door
  dragged past a corner moves to the next wall (`Room3D.jsx`).
- **Moodboard.** The cards hug their photo and grow only on hover, in two wider columns.
  Furniture tiles tilt a few degrees on hover, each in its own direction.
- **Not supported.** Rooms are rectangles. L shaped rooms are not drawn yet.

### More furniture, and wall decor (23 Nov, 12:30 am)

- **Why.** I looked through the categories of IKEA and Planner 5D. The biggest gap was that
  nothing could hang on a wall. My dad asked for plants in more sizes, nightstands and a bed
  in other colours during a quick test.
- **Catalog.** About 55 pieces in ten groups (`data/catalog.js`). Sizes of an existing model
  reuse its file through `baseType` and are stretched. Fifteen pieces are built from simple
  shapes in `FurnitureModel.jsx`, such as a round table, a bench and a round rug.
- **Wall decor.** Art, a canvas, a gallery of frames, two mirrors, a shelf, a clock, a TV, a
  wall lamp and curtains. A wall piece snaps to the nearest wall (`snapToWall` in
  `lib/room.js`), has a height above the floor, and only collides with other wall pieces.
- **Tile pictures.** The pictures for the shape pieces are rendered from the app's own shapes
  by `pipeline/tiles.html`, `pipeline/tiles.jsx` and `pipeline/render_tiles.py`.
- **Known gap.** A wall piece can still be placed over a window.

### A welcome that asks first, tips beside the controls, and Realistic from the start (23 Nov, 12:50 am)

- **Welcome.** A first visit asks how to start: import a floor plan, answer three questions
  (kind of room, size, where the door and window are), open the example room, or skip to a
  ready bedroom. Scanning a room is listed as Soon because the app cannot do it yet
  (`Welcome.jsx`).
- **Tips.** Six small cards, each next to the control it explains, with a ring around that
  control. Settings can show them again (`Tips.jsx`).
- **Realistic.** The Inside view starts in Realistic. The first four passes are hidden so the
  grainy start is not shown, and a pill reads Sharpening with a percentage, then Sharp
  (`PathTraced.jsx`, `PreviewPanel.jsx`). This answers my own note in Figma that I could not
  tell how long to wait.
- **Lighting panel.** Daylight, time, month and lamp bulbs stay in view. Everything else is
  folded under Advanced.
- **Floor and walls panel.** Each window and door card shows its wall. The sliders for its
  place and size are folded under Size and position, because most people drag the window on
  the plan (`SurfacesPanel.jsx`).
- **Checks.** `tests/headless/shoot7.py` (smoke) and `tests/headless/shoot43.py` (welcome,
  tips, wall decor, feet, contrast) were run in headless Chromium with software graphics.
  Icons on the stage glass read 4.86 to 1 over black and 12.94 to 1 over white. Words on the
  tip card read 16.09 and 19.18. Words in the top bar read 18.68 or more.

### A wider room score (23 Nov, 1:00 am)

- **Why.** The score had nine checks, almost all about the bed. I asked for it to be more
  comprehensive after research, so it now reads a living room and a desk as carefully as a
  bedroom. A room is scored on up to 21 checks, and only the ones that apply to its furniture
  are counted.
- **What the research said.** The form school of feng shui is about where things stand, and
  its main idea is the commanding position: the bed, sofa and desk have a solid wall behind
  them and a view of the door, without standing straight in line with it. The compass school
  (which way the home faces, the elements, colours) needs facts the app does not have, so it
  is left out. Interior designers add distances that can be measured the same way.
- **New bed checks.** You can see the door from bed (the door is ahead of the pillow, not
  level with it or behind it). Pillows away from the door (at least 40% of the room's corner
  to corner length). No mirror facing the bed (only when the room has a mirror).
- **New sofa checks.** Backed by a wall (within 30 cm, and no window behind it). Not in front
  of a window. Can see the door. Coffee table within reach, 30 to 55 cm from the front edge.
- **New desk and table checks.** The desk looks into the room in place of a wall right in
  front of it. A dining table has 90 cm to the walls so chairs can slide out.
- **A clear walkway from the door.** The floor is cut into 10 cm squares. A square is open
  when a person 75 cm wide fits there. A flood fill from the door has to reach the bed, the
  sofa and the desk (`walkableTo` in `lib/fengshui.js`).
- **Where each check comes from.** Every check has `from`, either Feng shui or Design, and
  the card says which under the tip (`FengShuiCard.jsx`).
- **Left out on purpose.** Schools of feng shui disagree about a mirror facing a door, so the
  app does not score it.
- **The example room now scores 78.** Its sofa floats in the middle with its back to the
  door, as in the photo it copies, so two sofa checks fail. The score used to be 100 because
  nothing looked at the sofa.
- **Checks.** `node tests/logic/check-logic.mjs` has 21 new lines for these and all pass. The
  score takes about 1 ms for the example room and 9 ms for an 8 by 8 m room.
- **Sources read.**
  [Homes & Gardens on furniture placement](https://www.homesandgardens.com/interior-design/feng-shui-furniture-placement),
  [Homes & Gardens on bed placement](https://www.homesandgardens.com/interior-design/bedrooms/feng-shui-bed-placement),
  [Dummies on the commanding position](https://www.dummies.com/article/home-auto-hobbies/home-improvement-appliances/decorating/applying-feng-shui-principles-to-your-bed-199703),
  [Castlery on bedroom layout](https://www.castlery.com/uk/blog/feng-shui-for-bedroom),
  [Livingetc on sofa placement](https://www.livingetc.com/us/advice/feng-shui-sofa-placement),
  [Livingetc on a sofa in front of a window](https://www.livingetc.com/us/advice/feng-shui-sofa-in-front-of-window),
  [Ideal Home on sofa placement](https://idealhome.co.uk/living-room/where-to-place-a-sofa-for-feng-shui),
  [Greatist on desk placement](https://greatist.com/happiness/ultimate-beginners-guide-feng-shui),
  [Livingetc on a mirror facing a door](https://www.livingetc.com/advice/feng-shui-mirror-facing-door),
  [Houzz on how much space you need](https://www.houzz.com/magazine/how-much-space-you-need-and-what-to-do-if-you-dont-have-it-stsetivw-vs~95713633),
  [Apartment Therapy on living room measurements](https://www.apartmenttherapy.com/living-room-layouts-the-ideal-measurements-for-everything-in-the-room-206734),
  [Apartment Therapy on furniture spacing](https://www.apartmenttherapy.com/dimensions-to-follow-proper-furniture-spacing-basics-149156).

### Design system v5 in Figma, with liquid glass (23 Nov, 1:20 am)

- **A new copy.** v5 is a duplicate of v4, placed to its right on the Design System page. v3
  and v4 were not changed.
- **Foundations.** A variable collection "Apt Studio DS v5" holds the four glass fills
  (stage 30%, hover 45%, page 60%, chosen ink 82%) and the two motion durations, each with its
  CSS name as code syntax. Three effect styles hold the rim, the 3 px shadow and the blur.
- **A Liquid glass frame** shows the recipe, the old and new edge side by side, the flow of
  the chosen pill in three steps, and the rules, including no pressed state.
- **Components.** Button lost its 15 Pressed variants. The Slider is a glass slider. Stage
  control is glass. New components: Glass button, View switch, Piece actions and Room tabs.
- **One difference from the build.** The app also lowers the contrast of what is behind the
  glass. Figma has no such effect, so glass over a busy photo looks busier in Figma.
- **Not redrawn.** The Screens frame inside v5 still shows the v4 layout. My own frame of the
  new workspace is the reference for the screens.

### The logo in the middle of the top bar (23 Nov, 2:05 am)

- **What changed.** The Apt Studio mark moved from the left end of the top bar to its middle.
  The rooms stay on the left and the menus on the right.
- **How.** The mark is pinned to the middle of the bar (`.top-bar > .logo` in `app.css`), so
  it stays centred however wide the two sides are. Each side keeps to its own half. Under
  900 px the bar wraps onto more rows, so the mark goes back to the start of the first row.
- **Checked.** The middle of the mark and the middle of the bar are both at 720 px on a
  1440 px wide window.

### Fixes from my 2 am list (23 Nov, 3:15 am)

- **Home name.** New homes are called My home. A saved home still called Apt 4B, the old
  starting name, is renamed the same way (`completeHome` in `lib/storage.js`).
- **Pinterest.** The shared test link said it could not reach Pinterest. The cause is the page
  that hosts the test link: it blocks every request to another site. The same board loaded from
  an ordinary page in my browser, so the feed and the app's code are fine. The test link now says
  what is true, and connecting a board works when the app runs from my computer.
- **Account.** The login card has the logo and a cross that goes back to the room, and Escape
  does the same. Before, the only way back was the word Apt Studio at the top.
- **Less text.** Removed the helper lines under Preferences, Settings, the room dialog, the
  panels and the welcome. The score is called Feng Shui score, without "out of 100" and without
  the line that named the kind of guideline.
- **Icons for small actions.** Remove a window, a door or a fixed light, put a size back, skip
  the tour and remove a room were underlined words. They are round icon buttons now
  (`.icon-action`).
- **Words on the stage buttons.** Grid, Lighting, and Floor and walls show their names. When
  the room is narrower than 760 px the words go and the buttons are round again.
- **Roomier.** More padding and wider gaps in the menus, the piece panel, the tools section,
  the dialogs and the score card. Choice rows are 32 px tall with 14 px beside each word.
- **Glass, second pass.** The first glass squeezed what is behind it toward grey and had a
  bright ring all round. Apple describes Liquid Glass as a material that lets what is behind
  show through and catches light on its edge. The fill is now a soft sheen, the blur is lower,
  much less grey is mixed in, and the rim is bright on the top left and faint on the bottom
  right. A browser cannot bend what is behind glass, so there is no lens effect.
- **One hover and press.** Hover changes the fill and nothing grows. A press settles the
  control to 97% and eases back.
- **Furniture.** The whole tile leans on hover, by 4 degrees at most. The group row is a glass
  track with hand-drawn icons from my Figma file (`DrawnIcon.jsx`). Four pieces were all named
  Couch; they are told apart by colour now (`setPinItems` in `data/catalog.js`).
- **Moodboard.** The name under a picture follows the piece under the pointer.
- **Realistic.** The picture came on screen after 4 passes, still full of bright specks. It
  now waits for 24 passes with the normal picture on screen, and a new step removes single
  bright specks before the smoothing (`SPECK_SHADER` in `PathTraced.jsx`).
- **Door.** An open door swings away from the room, behind the wall, so it takes no space
  from the room. What is behind the doorway in the Inside view is one dim tone in place of a
  lit hall. The door frame no longer shares a plane with the wall, which is what flickers.
- **Checked in headless Chromium only.** The specks and the door flicker need a look on a
  real graphics card.

### Realistic without specks, a doorway that is not a black hole, more room for the room (23 Nov, 3:45 am)

- **Specks in Realistic.** The white spots were still there on my Mac after the 3 am round, even
  when the picture said Sharp. Two changes in `PathTraced.jsx` removed them. First, no traced
  path may be brighter than a limit (`speckLimit`, six times white at the current exposure), so a
  path that stumbles on a very bright spot cannot leave a white dot. The limit is added to the
  tracer's own shader with two text replacements. Second, the pass that takes specks out before
  the smoothing now compares each pixel with the middle value of its nine neighbours (the
  median), which a lone bright pixel cannot pull up the way it pulls up an average.
- **The doorway.** In Realistic the space behind an open door was pitch black, because it is a
  closed box that no light reaches. Its five sides are marked `recess` in `Room3D.jsx`, and the
  traced picture gives them a faint glow of their own so the doorway reads as a dim grey with
  the open door in it.
- **Small windows.** The section on the right took 560 px whatever the window, which left the
  room about 400 px on a 1024 px laptop. It may take up to 42% of the window now. On a short
  stage the zoom buttons were hidden behind the view switch, so there they move to the left
  edge, above undo and redo (the stage measures its own height with a container query).
- **Checked.** On my Mac in the test link: the example room and the bedroom at Sharp show no
  specks, the doorway is grey with the door in it, and the plus button is visible at 1024 px.
  `tests/headless/shoot7.py`, `shoot43.py` and `tests/logic/check-logic.mjs` pass.

### A Pinterest importer checked against the real feed (23 Nov, 3:50 am)

- **Checked against Pinterest itself.** From an ordinary page in my browser the feed answered
  with 49 pins for a public board, and the app's own importer code read them. The shared test
  link still cannot connect a board, because the page it runs on blocks other sites.
- **Sharper pictures.** The feed gives each pin in three widths. The importer took the 237 px
  one, which looked soft on the wider cards. It takes the 564 px one now, and falls back to the
  narrow one if the wide one fails to load.
- **More links understood.** `readBoardLink` in `lib/pinterest.js` accepts a board link with or
  without https, from any country's Pinterest, with a section after the board, and inside a
  longer message. A pin, a profile and a pin.it short link each get their own sentence saying
  what to paste instead. `tests/logic/check-logic.mjs` checks twelve shapes.
- **Clearer errors.** Waiting stops after 15 seconds. A missing board, too many requests and an
  answer that cannot be read each have their own message.
- **The board stays.** A connected board and its picks are kept in this browser, so a reload
  keeps them without an account (`loadBoardFromBrowser` and `saveBoardToBrowser` in
  `lib/storage.js`). The dialog has Back to the sample photos while a board is connected.
- **Honest labels.** The count reads "49 of 312 Pins" when Pinterest shares only part of a
  board. The furniture made from pictures comes from the sample photos, so with a Pinterest
  board connected its group is called From the sample photos.

### Logging in, tried end to end on a stand-in Firebase (23 Nov, 4:00 am)

- **Tried, not only written.** The whole account flow ran against the Firebase Auth emulator,
  a stand-in for Firebase that runs on the test machine, so nothing touched my real project
  and no account was made there. `tests/headless/shoot-account.py` signs up, logs out, logs in
  with a wrong password, asks for a reset link, logs in, reloads and tries an email that is
  taken. All seventeen checks pass.
- **Saving, checked without a browser.** `tests/logic/check-account.mjs` runs the app's own
  `lib/storage.js` against a stand-in Firestore kept in memory that refuses what the real one
  refuses (a value that is `undefined`, a list inside a list, a document over 1 MiB). A home
  with two rooms saves and loads back whole, a removed room is deleted, the moodboard sits next
  to the home, and a room with two 300 kB photos fits. The real Firestore has still not been
  run by me, because that needs an account in my project.
- **The login card.** Empty fields and a short password are caught on the card. The button says
  One moment while Firebase answers. An eye shows the password. After a wrong password the card
  offers Email me a reset link. Someone already signed in who opens the login page goes back to
  their room. More of Firebase's error codes have their own sentence. Pressing Enter on the
  card while accounts are off does nothing, where it used to show an error.
- **The account menu.** It says how saving is going: Getting your saved home, Saving your home,
  Your home is saved to this account, or that the account could not be reached and the changes
  are kept in this browser, with Try again. A red mark sits on the account button while saving
  has failed. Before, a failed save only wrote to the console. The menu closes on Escape and on
  a click elsewhere.
- **A switch for testing.** A build made with `VITE_EMULATOR=1` talks to the emulator in place
  of the real Firebase (`firebase.js`).

### The plan stays clear of the buttons, and the tools at the side fit (23 Nov, 4:10 am)

- **The plan and the buttons.** On a short stage the row of buttons along the bottom covered the
  arrow under the room and the width written there. The plan is now fitted into the part of the
  stage above that row, whatever the height of the stage (`buttonsShare` in `Room3D.jsx`).
  Since 4:30 am it also keeps clear of the download button and the view switch on the right
  edge (`sideShare`), which a wide room used to run under.
- **Tools at the side.** The three tab names and the cross did not fit, so the cross sat on top
  of Floor and walls. The section is 368 px wide, and on a small window the cross has a row of
  its own. The furniture tiles there touched each other and now have 8 px between them.
- **Narrow stage, narrow side section.** On a stage under 460 px wide the three middle buttons
  move up one row so they no longer sit on undo and redo, and the row over the realistic
  picture drops the word Brightness and the Save picture button (the download button in the
  corner saves the picture too). The line above the moodboard pictures
  stays on one line.
- **Seen on my Mac in the test link.** At 1440 by 900 the plan, the turn in 3D and dragging a
  tile onto the floor all work, and undo took the piece away again.
- **Figma.** The fourteen screens in "Screens to adjust" now match the build: the logo in the
  middle, My home, words on Grid, Lighting and Floor and walls, Feng Shui score, and Settings
  items without the lines under them. The Liquid glass frame in v5 has a new paragraph with the
  values the build uses since 3 am. Nothing in v3, v4 or the frames I drew myself was touched.

### Turning the room in 3D cannot move a door, and nothing floats (23 Nov, 4:25 am)

- **Found on my Mac.** While turning the bedroom in 3D in the test link, a drag that started
  on the foot of the door moved the door to another wall. Seen from the window side, the
  window sill and the round drag handles hung in mid-air above the lowered wall.
- **Fixed in `Room3D.jsx`.** Windows and doors are dragged on the plan only. In 3D a drag that
  starts on one turns the room like any other drag, and a double click still opens Floor and
  walls. The round handles are drawn on the plan only. The sill is left out on a lowered wall,
  where the pale mark on the rim already shows the window.
- **A little more air in 3D.** The room is fitted slightly smaller (0.96 in place of 0.9 of the
  wrapping ball), so the top corner of a wall no longer touches the edge of the stage.
- **Checked.** Dragging the door along its wall on the plan still works in the test browser.
  From the window side in 3D nothing floats.

### Connecting a board tried inside the app, and zoom buttons on phones (23 Nov, 4:50 am)

- **Connecting a board, inside the app.** `tests/headless/shoot-pinterest.py` runs the real
  dialog, importer and moodboard, with only Pinterest's two addresses answered by the test (the
  test machine cannot reach Pinterest). The answer has the same shape the real feed had this
  morning: 49 pins, three picture widths, a blank description, a description with a character
  code. It checks the sentence for a pin link, a profile link, a short link and plain words, a
  board that does not exist, a link pasted inside a message, the 49 pins, "49 of 312 Pins", two
  picks kept after a reload, and Back to the sample photos. All of it passes.
- **Phones.** The rule that moves the zoom buttons to the left on a short stage also fired on
  phones, where the stage is tall enough. On a phone at least 820 px tall they stay on the right.

### A smooth wall at Sharp, and no grainy picture on the way there (23 Nov, 5:05 am)

- **Seen on my Mac.** With the specks gone, a flat wall in the realistic picture still showed
  fine grain, from the moment the picture appeared (24 passes) until after the pill said Sharp.
- **Why.** The smoothing step eased off as fast as the grain shrinks but started too weak for
  it, and the picture was put on screen long before it was clean.
- **Fixed in `PathTraced.jsx`.** The allowance of the smoothing is half as large again (0.9 in
  place of 0.6, divided by the square root of the passes) and stops at 0.08. The traced picture
  now waits for 64 passes, the same number at which the pill says Sharp, and the normal picture
  stays on screen until then with the pill counting up.
- **Checked on my Mac.** In the example room by day the walls are smooth at Sharp and the edges
  of the lamp, the shelf and the books are crisp. With Daylight off the lamp-lit picture is
  clean too. The pane the assistant looks through runs slowly in the background, so how many
  seconds Sharp takes on my screen is for me to see.

### Feet in the room dialog, the floor plan and the sliders (23 Nov, 5:10 am)

- **The gap.** With Preferences set to Imperial, the room dialog, the floor plan dialog, the
  photo straightening dialog and the sliders under Floor and walls still showed metres.
- **Fixed.** `lib/units.js` has three more functions: `bigUnit` (m or ft), `toBig` (metres, or
  feet with one decimal, for a field) and `fromBig` (what was typed, back to metres). The room
  dialog, `PlanRooms.jsx` and `PhotoStraighten.jsx` use them for their fields, limits and
  messages. The sliders in `SurfacesPanel.jsx` write their value with `formatLength`, so a
  window reads 3 ft 11 in wide. Rooms are still saved in metres.
- **A limit that agrees with itself.** 1.5 m is 4.9 ft, and 4.9 ft is 1.49 m. A typed value is
  compared in the unit it was typed in, so the smallest size the message names is accepted, and
  it is saved as the 1.5 m it stands for.
- **Checked.** In Imperial the new room dialog opens with 15.1, 12.5 and 8.2 ft, saves 4.9 ft
  as a room, and the window sliders read in feet and inches. `tests/logic/check-logic.mjs` has
  seven new checks for the conversions.
- **Also.** On a narrow stage, where the middle buttons sit one row up, the plan is fitted
  above both rows.

### A print cannot hang over a window (23 Nov, 5:20 am)

- **The gap.** Something for the wall (a print, a mirror, a wall lamp) could sit on top of a
  window or across a doorway and still read Fits.
- **Fixed in `lib/room.js`.** `coversOpening` looks at the piece and at each window and doorway
  in its wall as rectangles on that wall (how far along, how high up). Where they overlap,
  `getFit` answers Blocked. A new wall piece is given a place clear of them, because
  `findOpenSpot` already looks for a place that fits.
- **Checked.** Five new checks in `tests/logic/check-logic.mjs`: over the window, beside it, on
  another wall, across a doorway, and where a new print lands.

### The shop list is a list, and the score card stays on the stage (23 Nov, 5:25 am)

- **Shop.** With no links yet, the Shop tab was two sentences, the second one naming every
  piece in a row with repeats ("Floor lamp, Floor lamp"). Every piece to buy is now a row with
  its picture and name. A row with a link or a price shows them as before. A row without has a
  small tag button that opens the piece, where a link or a price is added.
- **Score card.** On a short stage the card that opens from the score was taller than the space
  above it, and its heading was cut off. It is now never taller than the stage and scrolls
  inside if it has to.
- **Seen on my Mac** in the test link, and checked after the change in the test browser: the
  card's top is inside the stage, and the tag button opens the armchair's panel.

## Components

| Component | What it does |
|---|---|
| `App` | Holds the data (signed-in user, the home's rooms, moodboard, picks), listens for sign-in, saves and loads the moodboard, and defines the routes. |
| `Workspace` | The main page. Holds screen state (selection, 2D/3D, grid on/off, divider position, dialogs, undo) and lays out the top bar and the two panels. |
| `AuthPage` | Log in and create-account form. |
| `PreviewPanel` | Left panel: the stage and the furniture strip. |
| `Room3D` | The Three.js canvas. Contains `Scene`, `CameraRig`, `RoomShell`, `MeasureGrid` and `Piece`. |
| `FurnitureModel`, `GlbModel` | Shows a piece's 3D model file at its real size. The simple version built from boxes stands in while the file loads or if it fails. |
| `ViewSwitch` | The view switch: 2D, 3D and Inside. |
| `Segmented` | A row of choices with one thumb that slides to the chosen one (which wall, hinge side, oak or your photo). |
| `PathTraced`, `TracedPicture` | The realistic picture of the inside view: follows light as it bounces, and clears up pass by pass. `PathTraced` is there the whole time you are inside and gets the tracer ready; `TracedPicture` draws while Realistic is on. |
| `RoomEffects` | The extra pass over the 3D and inside pictures: soft shadow in corners and camera-like tone mapping. Fetched only when a view needs it. |
| `SelectionBar` | Name, size, fit tag, Rotate and Remove for the selected piece. |
| `FitTag` | The Fits / Tight / Blocked label. |
| `ElementStrip`, `ElementTile` | The search field, the group chips, the row of furniture tiles, and one tile. |
| `MoodboardPanel` | Right panel: the connected board's pins (or sample photos), which can be picked, with search, filters and Explore. Each piece of furniture found in a sample picture is a button that opens a card of furniture to choose from. |
| `PinterestImport` | Dialog that takes a board link and loads its pins. |
| `AccountButton` | A round icon: a link to log in for visitors, a small menu with email and "Log out" when signed in. |
| `RoomSetup` | The room dialog: kind, name and size. Also makes a new room, or opens the example room. |
| `RoomTabs` | The row under the top bar: the home's name, one tab per room, and + to add one. |
| `SurfacesMenu` | The floor, walls and windows button and its panel: oak or your photo, paint or your photo, and a card per window and per door. |
| `PhotoStraighten` | Dialog for a floor or wall photo: drag four corners onto a rectangle and type its size. |
| `PlanRooms` | Dialog that takes the room's size from a floor plan: pick a room, type one length. |
| `FoundFurniture` | Dialog listing the furniture found in a photo of your room, to keep or drop. |
| `FengShuiCard` | The room score as a ring on the stage, and the checks behind it. |
| `PiecePanel` | Right-hand panel for the selected piece: fit, actions, size, position, shop link. |
| `ShopList` | Dialog listing every piece in the room that has a shop link. |
| `DownloadMenu` | The download button and its two choices: a picture, or the room as a file. |
| `LightingMenu` | The lighting button and its panel: daylight (window direction, place, month, time), fixed lights and lamp bulbs (Kelvin, lumens, dimmer). |
| `NumberField` | A number input whose unit follows the digits. |
| `UndoToast` | Confirms the last change and offers Undo. |
| `TabBar` | Switches panels on a phone. |
| `Button`, `Icon` | Shared button and inline SVG icons. |

Plain functions live in `src/lib/`: `room.js` (clamping, overlap, fit, where a new piece goes),
`fengshui.js` (the room score), `pinterest.js` (board link parsing and loading pins) and
`storage.js` (Firestore load and save). `tests/logic/check-logic.mjs` checks the fit and the room
score. `useSlidingThumb.js` is a
custom hook shared by `ViewSwitch` and `Segmented`. The furniture list is in
`src/data/catalog.js` and the example room in `src/data/exampleRoom.js`.

## Packages

- [three](https://threejs.org/) draws the 3D room.
- [@react-three/fiber](https://r3f.docs.pmnd.rs/) lets Three.js objects be written as React components.
- [firebase](https://firebase.google.com/docs/web/setup): Authentication for accounts, Cloud Firestore for saved moodboards.
- [react-router-dom](https://reactrouter.com/) gives the app its three pages.
- [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) (with three-mesh-bvh and xatlas-web, which it needs) makes the realistic picture.
- [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing), postprocessing and n8ao add ambient occlusion and tone mapping.
- Pinterest board-widget feed supplies the pins (see above).
- [Vite](https://vite.dev/) runs and builds the project.

## Credits

- 3D pipeline: YOLOE (Ultralytics, AGPL-3.0) for finding objects, IS-Net via rembg (MIT) for cutouts, Blender (GPL) for building and baking models. These run only in `pipeline/`, not in the web app.


- Pins shown in the moodboard belong to their Pinterest owners and link back to the board.
- Moodboard sample photos: Unsplash (Steph Wilson, Fujiphilm, Kailun Zhang, Nathan Bird, Deborah Cortelazzi).
- Furniture tile images: rendered in Blender from models made for this project.
- Font: Host Grotesk (SIL Open Font License).
- AI use is documented in `ai-use.md`.
