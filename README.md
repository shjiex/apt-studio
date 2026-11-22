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
| `PathTraced` | The realistic picture of the inside view: follows light as it bounces, and clears up pass by pass. |
| `SelectionBar` | Name, size, fit tag, Rotate and Remove for the selected piece. |
| `FitTag` | The Fits / Tight / Blocked label. |
| `ElementStrip`, `ElementTile` | The search field, the group chips, the row of furniture tiles, and one tile. |
| `MoodboardPanel` | Right panel: the connected board's pins (or sample photos), which can be picked, with search, filters and Explore. |
| `PinterestImport` | Dialog that takes a board link and loads its pins. |
| `AccountButton` | A round icon: a link to log in for visitors, a small menu with email and "Log out" when signed in. |
| `RoomSetup` | The room dialog: kind, name and size. Also makes a new room. |
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

Plain functions live in `src/lib/`: `room.js` (clamping, overlap, fit), `pinterest.js` (board link
parsing and loading pins) and `storage.js` (Firestore load and save). The furniture list is in
`src/data/catalog.js`.

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
