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

## Components

| Component | What it does |
|---|---|
| `App` | Holds the data (signed-in user, room, pieces, moodboard, picks), listens for sign-in, saves and loads the moodboard, and defines the routes. |
| `Workspace` | The main page. Holds screen state (selection, 2D/3D, grid on/off, divider position, dialogs, undo) and lays out the top bar and the two panels. |
| `AuthPage` | Log in and create-account form. |
| `PreviewPanel` | Left panel: the stage and the furniture strip. |
| `Room3D` | The Three.js canvas. Contains `Scene`, `CameraRig`, `RoomShell`, `MeasureGrid` and `Piece`. |
| `FurnitureModel` | Builds each piece of furniture from boxes and cylinders at its real size. |
| `ViewSwitch` | The 2D / 3D switch. |
| `SelectionBar` | Name, size, fit tag, Rotate and Remove for the selected piece. |
| `FitTag` | The Fits / Tight / Blocked label. |
| `ElementStrip`, `ElementTile` | The row of furniture tiles and one tile. |
| `MoodboardPanel` | Right panel: the connected board's pins (or sample photos), which can be picked. |
| `PinterestImport` | Dialog that takes a board link and loads its pins. |
| `AccountButton` | A round icon: a link to log in for visitors, a small menu with email and "Log out" when signed in. |
| `RoomSetup` | Dialog with three number fields for the room's size. |
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
- Pinterest board-widget feed supplies the pins (see above).
- [Vite](https://vite.dev/) runs and builds the project.

## Credits

- 3D pipeline: YOLOE (Ultralytics, AGPL-3.0) for finding objects, IS-Net via rembg (MIT) for cutouts, Blender (GPL) for building and baking models. These run only in `pipeline/`, not in the web app.


- Pins shown in the moodboard belong to their Pinterest owners and link back to the board.
- Moodboard sample photos: Unsplash (Steph Wilson, Fujiphilm, Kailun Zhang, Nathan Bird, Deborah Cortelazzi).
- Furniture tile images: rendered in Blender from models made for this project.
- Font: Host Grotesk (SIL Open Font License).
- AI use is documented in `ai-use.md`.
