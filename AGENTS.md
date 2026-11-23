# Apt Studio: handoff for a coding agent

Written 22 Nov 2026, about 4 pm PT, by the agent that built most of this with the owner. Read this file first, then `README.md` (a dated entry for every round of work, newest just above `## Components`), then `pipeline/README.md` if you touch the Python side. Where this file says something was never verified, treat it as unknown, not as working.

## 1. What this is

Apt Studio is a room and apartment planner that runs in the browser. A person gives it their room (typed sizes, a floor plan picture, or later a scan), connects a public Pinterest board as a moodboard, places furniture and sees at once whether each piece fits (Fits, Tight, Blocked). The same room is shown as a plan (2D), from outside (3D) and from where you would stand (Inside), with real sun by place, month and hour, lamps with dimmers, your own floor and wall photos, windows and doors you place, a room score with one suggestion at a time, and a shop list with links, prices and a total. The Inside view has a Realistic picture that is path traced in the browser.

The gap it aims at, from the competitor research: start from your own Pinterest board and check fit in your own measured room. Planner 5D and IKEA Kreativ are the owner's models for flow and interface.

## 2. Who it is for, and the deadlines

The owner is Josh Shih (GitHub `shjiex`), a student. The project serves three things at once.

| What | When | What it needs |
|---|---|---|
| Palantir Product Design Show & Tell | Monday 23 Nov 2026 (from his notes) | A video of 3 minutes at most (unlisted YouTube) plus a link (live demo, repository or clickable design), sent to designchallenge@palantir.com. The brief: build with AI and show how. An existing project is allowed if it is solely his and called out. |
| HCDE 438 final project (React) | Presentation in class 12/7 (3 minutes), PDF due 12/8, final cutoff 12/16 | The PDF needs progress, a screenshot, the component list, the packages and an AI acknowledgement. AI is allowed. It needs `ai-use.md` with the transcript, and **the student must be able to explain the code line by line**. |
| HCDE 417 design system | Ongoing | The Figma file described in section 8. |

## 3. Standing rules from the owner

These are his, several in his own words. They outrank any default of yours.

1. **No AI co-author, ever.** He said: "don't use Claude as co-author ever". Commit messages and pull requests carry no `Co-Authored-By` line and no tool attribution line of any kind, for any AI tool, Codex included. Commits are authored by him.
2. **Never edit the v3 design system section in Figma.** He said: "remember to never overwrite, duplicate and make a new iteration of the DS section". Work only in the v4 copy (node `212:3646`) or in a fresh duplicate.
3. **No bullets and no dot separators** (`•`, `·`) in the interface, in Figma, or in write-ups meant for him. Structure the information properly in place of a bullet. Replies to him are short prose with a bold lead-in per point. (This file is a reference for an agent, so it uses lists and tables.)
4. **Copy follows his writing skill** (`josh-interior-app-writing`). Explanatory text is written in complete, warm, conversational sentences ("We’ve estimated…", "You can always…"). Buttons and labels stay short. In new prose avoid em dashes, colons and semicolons. Avoid "carry" and "bring" as metaphors, "give that", "act", "single", and a vague "that work" or "that approach". No decorative metaphors, no lists of three for rhythm, no "not X but Y". Never claim something the app does not do. Use the same word for the same thing everywhere. His model sentence: "We’ve estimated the dimensions of your furniture based on average sizes. You can always edit them later." He rejected "Typical sizes. Edit them after adding."
5. **Code a student can explain.** Function components, hooks, plain CSS, plain JavaScript. No TypeScript, no CSS framework, no state library, no clever one-liners. Comments say what a line is for in everyday words, because he has to explain every line in class. Keep that voice when you add code.
6. **Spend nothing, sign up for nothing.** No paid credits (he said "confirm with me before spending the credits" and "Spend nothing" about Meshy), no accounts created, no third-party furniture models without his yes. Every catalog model is made by this repository's own Blender scripts.
7. **Text on glass must pass WCAG AA**, measured, not judged by eye. Section 7 has the rules.
8. **Every round gets written down.** Add an entry to `README.md` as `### Title (date, time)` just above `## Components`, and to `ai-use.md` with `, AI-generated` in the heading just above `## Chat transcript`.
9. **Two files stay out of git:** `src/firebaseConfig.js` (in `.gitignore`) and `.github/workflows/deploy.yml` until he says to turn GitHub Pages on. Never commit `pipeline/models` (about 242 MB of model weights).
10. He is doing the interface clean-up himself ("I'll declunk the UI", 22 Nov). Do not restyle or rearrange screens on your own. Ask, or follow his Figma comments.

## 4. Quick start and every build

Node 22 is what the Pages workflow uses.

```
npm install
npm run dev                      # http://localhost:5173
npm run build                    # production build into dist/
npx vite preview --port 4173 --strictPort    # serves dist/, the address the tests use
```

Two other builds exist.

```
VITE_DEMO=1 npx vite build --base=./ --outDir dist-demo     # the hosted demo (see section 11)
npx vite build --base=/apt-studio/ && cp dist/index.html dist/404.html    # GitHub Pages
```

`VITE_DEMO` switches the router to `MemoryRouter` (the demo host has no address bar to use), makes `asset()` look paths up in `src/demoFiles.json`, and turns `createImageBitmap` off in `src/lib/models.js` so textures inside models load as plain images. The Pages build relies on `asset()` in `src/lib/paths.js` and on the router `basename`, both of which read `import.meta.env.BASE_URL`. Any new path to a file in `public/` must go through `asset()`.

Without `src/firebaseConfig.js` the app runs in visitor mode: everything works, logging in and saving to an account are off, and the home is kept in the browser.

## 5. Repository map

### `src/`

| File | What it holds |
|---|---|
| `main.jsx` | Mounts `App`, loads `tokens.css` then `app.css` |
| `App.jsx` | Router, the signed-in user, the home (name, rooms, open room), the moodboard and picked pins, loading and saving (browser and Firestore), `STARTER_HOME`, routes `/`, `/login`, `/signup` |
| `firebase.js` | Starts Firebase only if `firebaseConfig.js` exists and holds real values. Exports `auth`, `db`, `isFirebaseReady` |
| `firebaseConfig.example.js` | Template to copy to `firebaseConfig.js` |
| `demoFiles.json` | Demo build only: public path to hosted address, for files the demo host cannot serve beside the page |
| `pages/Workspace.jsx` | The main screen. Selection, view, undo history, dialogs, toast, all the handlers |
| `pages/AuthPage.jsx` | Log in and sign up with email and password |
| `components/Room3D.jsx` | The whole three.js scene: camera for the three views, walls with window and door openings, floor, measure grid, pieces, drag, lights (about 1,000 lines) |
| `components/PathTraced.jsx` | The Realistic picture: `WebGLPathTracer` from three-gpu-pathtracer inside the same canvas, with a denoise pass |
| `components/PreviewPanel.jsx` | The stage: `Room3D`, the floating controls (zoom, undo, brightness, passes, room score), the furniture strip, the selection bar |
| `components/FurnitureModel.jsx`, `GlbModel.jsx` | A piece's 3D model, with a box as stand-in while the `.glb` loads or if it fails |
| `components/ElementStrip.jsx`, `ElementTile.jsx` | Furniture groups, search and the tiles you add pieces from |
| `components/SelectionBar.jsx`, `PiecePanel.jsx` | Actions and fields for the selected piece (size, shop link, price) |
| `components/FitTag.jsx` | The Fits, Tight, Blocked tag |
| `components/FengShuiCard.jsx` | The room score button (number only, 48 by 48) and its card: one thing to do first, then two folds |
| `components/LightingMenu.jsx` | Lighting panel: place, month, hour, which way the back wall faces, lamp bulbs and dimmers, fixed lights |
| `components/SurfacesMenu.jsx` | Floor and walls panel: oak or your photo, paint or your photo, windows, doors (wall, size, hinge, open or shut) |
| `components/PhotoStraighten.jsx` | Four-corner straightening of an angled floor or wall photo |
| `components/Segmented.jsx` | A row of choices on one track with a dark thumb that slides between them |
| `components/ViewSwitch.jsx` | The 2D, 3D, Inside switch (same sliding thumb) |
| `components/MoodboardPanel.jsx` | The moodboard column: pins, the frame round the one target object, "Add this … in 3D", search |
| `components/PinterestImport.jsx` | Dialog to connect a public Pinterest board by its link |
| `components/FoundFurniture.jsx` | "Your furniture": pieces found in a photo of your own room, with outlines and a keep box per piece |
| `components/PlanRooms.jsx` | Take a room's size from a floor plan picture |
| `components/RoomSetup.jsx`, `RoomTabs.jsx` | The room dialog (name, kind, size) and the tabs for the rooms of a home |
| `components/ShopList.jsx` | The shop list: pieces with links, prices and a total |
| `components/DownloadMenu.jsx` | Download a picture (PNG) or the room file (JSON, read by `pipeline/render_room.py`) |
| `components/TabBar.jsx` | The tab bar on phones (under 900 px) |
| `components/UndoToast.jsx` | The toast |
| `components/AccountButton.jsx`, `Button.jsx`, `Icon.jsx`, `NumberField.jsx` | Small shared parts. `Icon.jsx` draws inline SVG icons by name |
| `data/catalog.js` | `CATALOG` (14 pieces with size in metres, tile picture and model), `CATEGORY_COLORS`, `TYPE_CATEGORY`, `setPinItems(manifest)`, `getItem(type)` |
| `data/moodboard.js` | `SAMPLE_MOODBOARD`: six sample photos |
| `lib/room.js` | Room maths, no React: `DEFAULT_ROOM`, walls (`WALL_NAMES`: back is the top of the plan, left, right, front), windows and doors (`newWindow`, `newDoor`, `openingOf`, `doorOpening`, `doorZone`, `keepClear`, `wallBlocks`), fit (`getFit`, `coversDoor`), placing (`clampToRoom`, `snapToRoom`, `findOpenSpot`, `getWallDistances`) |
| `lib/rooms.js` | `ROOM_KINDS` and `newRoom(details)` |
| `lib/light.js` | `DEFAULT_LIGHTING`, `PLACES`, `sunPosition(latitude, month, hour)`, `getSun`, `sunOnWindows`, bulbs and fixed lights, colour temperature |
| `lib/surface.js` | `DEFAULT_SURFACES`, 12 named `WALL_PAINTS`, `loadPhoto`, `canvasToTile` |
| `lib/straighten.js` | The perspective maths behind `PhotoStraighten` |
| `lib/fengshui.js` | `getFengShui(pieces, room)`: nine measured checks, a score out of 100, tips |
| `lib/storage.js` | Load and save the moodboard and the home, in the browser and in Firestore; `completeHome` fills in what an older save lacks |
| `lib/pinterest.js` | `parseBoardUrl`, `fetchBoard` (public board feed, no key) |
| `lib/models.js` | `loadModel(url)`: loads a `.glb` once and remembers it |
| `lib/paths.js` | `asset(path)` for anything in `public/` |
| `lib/useSlidingThumb.js` | The hook behind the sliding thumb in `ViewSwitch` and `Segmented` |
| `styles/tokens.css` | Design tokens: colours and their ramps, type, spacing, radii |
| `styles/app.css` | Every component style. The newest blocks are appended at the end, in order |

### `public/`

| Path | What it holds |
|---|---|
| `fonts/HostGrotesk-Variable.woff2` | The one typeface |
| `furniture/*.png` | 14 tile pictures, one per catalog piece |
| `models/catalog/*.glb` | 14 catalog models, baked by `pipeline/bake_catalog.py` |
| `models/pins/manifest.json`, `mood-N.glb`, `mood-N.png` | Six models made from the sample moodboard photos. Each entry keeps `link`, and `source.outline` (whole object), `source.seen_outline`, `source.filled_in` |
| `mood/mood-1.jpg` to `mood-6.jpg` | The sample moodboard photos (Unsplash) |
| `inventory/room.jpg`, `room.json`, `room_found.jpg` | Sample for "Your furniture" |
| `plan/plan.jpg`, `plan.json` | Sample floor plan (the project's own drawing, no scale on purpose) |
| `textures/floor-oak-*.jpg` | Oak floor: colour, normal, roughness |

### `pipeline/` (Python, not needed to run the web app)

See section 9. `pipeline/models/` holds downloaded weights and must never be committed. `pipeline/generated/` holds models dropped in from outside (one: `mood-1.glb`). `pipeline/samples/` holds sample renders and room files. `pipeline/out/` is a work folder.

### Other

`firestore.rules`, `index.html`, `vite.config.js` (React plugin only), `ai-use.md`, `tests/headless/` (section 10).

## 6. How the app works

**State.** `App.jsx` owns what must outlive a screen: the user, the home name, `rooms`, `activeRoomId`, the moodboard and `pickedIds`. `updateActiveRoom(part, change)` changes one part of the open room. `Workspace.jsx` owns what belongs to the session: `selectedId`, `view` (`'2d'`, `'3d'`, `'inside'`), `realistic`, `passes`, `brightness`, which dialog is open, `tab` (phone), `showGrid`, `zoom`, `moodboardWidth`, the undo history and the toast.

**A room** is `{ id, name, kind, size: { width, length, height, windows, doors }, pieces, lighting, surfaces: { floor, wall } }`. Lengths are metres. **A piece** is `{ id, type, x, z, rotation, existing, size, model, link, price, … }`, with `x` and `z` measured from the middle of the room. `existing: true` marks furniture the person already owns (drawn grey).

**Undo.** A history step is `{ pieces, room }`, so undo covers furniture and also windows, doors and room changes. `rememberPieces` records a furniture step. `changeRoom(nextRoom, text)` records one step per burst of changes (0.8 s) and can show a toast. `handleUndo` and `handleRedo` restore both parts.

**Windows and doors** live in `room.size.windows` and `room.size.doors`. A door has `wall`, a position along the wall, `hinge` (`'left'` or `'right'`) and `shut`. `keepClear(entry, list, room)` returns the nearest free place on the wall with a 5 cm gap, or `null`, so openings never overlap. `doorZone` is the square a door swings through and is the same for either hinge. In the scene a wall is built from blocks around its openings (`wallBlocks`). Doors stand open at 75 degrees, with a short hall behind them in the Inside view.

**The three views** are one canvas. `CameraRig` in `Room3D.jsx` moves between a top-down orthographic camera (2D, where pieces and openings are dragged), an orbit camera (3D, where the back wall and one side wall stand full height and the other two are drawn low so you can see in) and a standing camera (Inside: drag to look, click the floor to stand there, kept 40 cm off the walls and turned to face the middle of the room).

**Lighting.** `getSun(lighting)` works out the sun's direction from the place's latitude, the month and the hour, and `lighting.windowFaces` says which compass side the back wall faces. Lamps in the catalog have a bulb (lumens, colour temperature) and a dimmer. Fixed lights can be added to a wall or the ceiling.

**The Realistic picture.** In the Inside view, Realistic switches `PathTraced.jsx` on. It hands the scene to `WebGLPathTracer` (5 bounces, low-resolution preview first, one traced pixel per screen point), then a denoise pass whose strength falls as passes add up. The stage shows the pass count, a Brightness slider (exposure) and Save picture, which downloads `apt-studio-<room>.png`. **It has only ever run on software graphics in tests. Nobody has seen it on a real graphics card.** The owner says it takes too long to load (section 12).

**Fit and score.** `getFit(piece, pieces, room)` returns fits, tight or blocked from overlaps, wall clearance and door swing. `getFengShui` runs nine measured checks and returns a score and tips. The card shows one thing to do first, then "N more to improve" and "N already good".

**Catalog and pin items.** `CATALOG` has 14 pieces. `Workspace.jsx` reads `public/models/pins/manifest.json` and calls `setPinItems`, which adds the furniture made from moodboard photos. Only the six sample photos have models. As far as the code shows, pins from a board the person connects get no 3D model unless the pipeline is run on them and the manifest rebuilt. There is no server.

**Saving.** The home is written to `localStorage` under `apt-studio-home` on every change, so a reload keeps it without an account. When signed in, the moodboard and the home go to Firestore: `users/<uid>` holds `moodboard` and `home: { name, activeRoomId, roomIds }`, and each room is its own document at `users/<uid>/rooms/<roomId>` (a document may hold 1 MB at most and a room can carry photos). `saveHome` writes only the rooms that changed and deletes removed ones. `firestore.rules` lets each person read and write only their own documents.

**Pinterest.** `fetchBoard` reads `https://widgets.pinterest.com/v3/pidgets/boards/<user>/<board>/pins/`, the feed behind Pinterest's own board embed. No key, public boards only, 50 pins at most, 237 px wide images. It was checked live once that the feed answers and allows cross-site requests. The app's test used a stand-in response, so real Pinterest images inside the app are unverified.

## 7. Design system in code

**Tokens** (`styles/tokens.css`). Host Grotesk throughout. After `--danger` come generated ramps: for each pop colour `--pop-X-tint`, `-soft`, `-shade`, `-deep`, `-tone`, plus `--grey-warm`, `--grey-cool`, `--ink-warm`, `--ink-cool`. Fit tags use `--fits-bg` `#e4f5eb` with `--fits-ink` `#186338`, `--tight-bg` `#fff6c4` with `--tight-ink` `#7b6d22`, `--blocked-bg` `#ffeae6` with `--blocked-ink` `#93321e`. Each pair reads at least 4.7 to 1. He asked for the "Fits" chip to "shout less", which is why these are tints with deep ink.

**Glass** (the "glass" blocks at the end of `styles/app.css`).

```css
--glass-fill: rgba(255, 255, 255, 0.3);
--glass-filter: blur(28px) saturate(1.4) contrast(0.55) brightness(1.45);
--glass-edge: inset 0 0 0 1px rgba(255,255,255,0.8), inset 0 2px 2px rgba(255,255,255,0.95),
  inset 0 -3px 6px rgba(15,15,14,0.16), 0 8px 24px rgba(15,15,14,0.2);
--glass-hover: rgba(255, 255, 255, 0.45);
--glass-chosen: rgba(15, 15, 14, 0.82);
```

Why ink text passes over any backdrop: the backdrop is blurred, squeezed towards light (the contrast and brightness in the filter), then covered with 30% white. The rules that follow from the measurements:

- Only ink text sits on glass. Grey text never does. Glass panels set `--ink-muted: var(--ink)` so every grey label inside turns ink.
- A chosen option is `--glass-chosen` (82% ink) with white text.
- Blocks inside a glass panel are 55% white. Dialogs stay solid white, and `.scrim` blurs the app behind them.
- Solid white fallbacks apply under `@supports not (backdrop-filter: blur(1px))`, `prefers-reduced-transparency: reduce` and `prefers-contrast: more`.
- `tests/headless/shoot38.py` and `shoot40.py` measure it over black and over white. Lowest reading so far: 4.99 to 1 (lighting panel over black). Toast: 11.39 over white, 19.57 over black. Rerun them after any change to these blocks.

Glass is on: the stage controls (history, zoom, brightness, passes), the selection bar, the room score disc, the view switch, the room tabs, the three panels that open over the room (they share `.feng__card`), the toast (dark glass) and the phone tab bar. Not yet on: the selection bar's own buttons, the piece panel, moodboard pins.

**Pressed state.** Buttons, tabs, chips, tiles and the score sink when pressed: `transform: translateY(1px) scale(0.97)`, an inner shadow, 90 ms.

**Sliding thumb.** `useSlidingThumb(chosen)` measures the chosen button (`offsetLeft`, `offsetWidth`), so one thumb element slides there with a small overshoot (`cubic-bezier(0.3, 1.3, 0.4, 1)`), and stretches it on the way with the Web Animations API. Both are skipped under `prefers-reduced-motion`. `ViewSwitch` and `Segmented` use it. `Segmented` draws the eight choice rows in the lighting and surfaces panels. Its buttons keep their visible names and `aria-pressed`, which the tests rely on.

## 8. Figma

File `kdBjJp4CO9OP6tNTuBMMde` ("HCDE 417 - Apt Studio"), page `58:216`.

| Node | What |
|---|---|
| `83:1116` | **v3 - Venmo neutral.** 287 components in 22 sets. Never edit. |
| `212:3646` | **v4 - glass, motion and quieter colour (22 Nov).** The copy to work in. Button set `212:4678` (distinct Hover, Disabled at 50%, 15 Pressed variants), Suggestion card `212:5140`, Layout rail item `212:5282`, Check card `212:5489`. Unchanged from v3: Segmented control `212:4898`, Toggle `212:4984`, Chip `212:4853`. |
| `204:3052` | **Screens for comments** (row `204:3054`), seven 1440 by 942 auto-layout desktop screens: Plan `204:3083`, 3D view `204:3506`, Inside view `204:3765`, Lighting open `204:4167`, Layers open `204:4554`, Shop list `204:4945`, Room dialog `204:5205`. |
| `180:2966` | App as built (pieces of the real screens, component set `Room tab` `191:3083`) |
| `175:2964` | Liquid Glass iterations ("Glass, stronger" `175:3037`, view switch `175:3045`) |
| `135:1569`, `146:1950`, `143:1844` | Earlier app screens, the vision screens, the product map |

The 3D and Inside comment screens use a room **photograph** as a stand-in for the stage, because uploading the app's own pictures to Figma was blocked. The owner called the 3D screen (`204:3504` / `204:3506`) "beautiful" and asked why the app does not look like it and for it to be "an example room available for users to use". The honest answer is that it is a photo, not a render of the app. See section 12.

Variables live in collection `VariableCollectionId:83:215` (white `83:222`, grey `83:223`, grey-strong `83:224`, ground `83:221`, scrim `83:227`, ink `83:228`, ink-muted `83:229`, status-blocked `83:245`, status-fits `83:249`, status-tight `83:250`). Collection `Apt Studio DS v4` adds `color/fits-bg`, `fits-ink`, `tight-bg`, `tight-ink`, `blocked-bg`, `blocked-ink`. Effect styles: `Apt Studio DS v3/glass-strong`, `shadow-overlay`, `selected-inner`.

Lessons that cost time: `setBoundVariableForPaint` drops opacity (assign, copy the fills, set opacity, assign again). Recolour icons only by changing the colour of paints they already have, because some vectors carry a hidden heavy stroke. A TEXT component property is shared across variants, so setting one label changes them all. Cloning a section keeps its instances pointing at the original main components, so instances inside v4 still point at v3. Comments he leaves on the canvas can be read through the API but nothing announces them, so check at the start of each round.

Not done in v4: Segmented control with the flowing glass thumb, glass variants of Stage control and Toggle, a room score component, the price variant of Shop row, colour ramps as variables beyond the six fit ones, and a written design system doc for glass and v4. "Maybe later" on the suggestion card is grey on grey and reads weakly.

## 9. The Python pipeline

Set up once: `cd pipeline && python3 -m pip install -r requirements.txt && ./get_models.sh`. `bpy` is Blender as a Python package and installs only on the Python version Blender was built for. `get_models.sh` downloads about 250 MB into `pipeline/models/` (never commit it). Everything ran on Linux with two cores and no graphics card. **None of it has been run on macOS.**

| Script | What it does | What was measured |
|---|---|---|
| `pin2object.py` | One moodboard image to the ONE target furniture object: YOLOE prompt-free detection, a score for size, centre, cut-off sides and occlusion, a cutout (mask times IS-Net matte), colours, a swatch. `whole_outline()` extends the outline over parts hidden behind other things (a rug under a table, a sofa under a blanket). | About 5 s per image on CPU. Whole outlines checked by eye on six images only. No test image has a rug under a table. `--board user/board` is written and untested. |
| `object2glb.py` | The target to a sized `.glb`: `photo-box` (the straightened photo on a box, for boxy pieces and rugs), `template` (a Blender template recoloured from the photo), or a model dropped into `pipeline/generated/<image id>.glb`. Writes the pins manifest. | Photo-box convinces only for front-on, unobstructed boxy pieces. Templates are look-alikes, not the actual object. |
| `furniture_lib.py`, `bake_catalog.py` | The Blender furniture, and baking it to `.glb` with colour and normal maps for `public/models/catalog/`. | 14 pieces in the catalog today. |
| `make_floor.py` | The seamless oak floor textures. | |
| `photo2inventory.py` | A photo of your own room to a list of every piece in it, for "Your furniture". | 9, 8 and 6 pieces on three photos. Seen mistakes: a distant wall cabinet as storage, a table base as a bench. |
| `plan2room.py`, `make_sample_plan.py` | A floor plan picture plus one known length to rooms and sizes. `--app` writes what `PlanRooms.jsx` reads. | 5, 7 and 6 rooms found on three real plans, sides mostly within 5 to 15 cm. Misses rooms with an angled outside wall and most bathrooms. |
| `scan2room.py`, `scan_testroom.py` | A walk-around video to the room's width and length (COLMAP, floor plane, walls). | One rendered test clip: 2.99 m against 3.00 m true. Never tried on a real phone video. The app does not read its output. |
| `render_room.py` | The room file the app downloads to a Cycles render (`--view door|corner|window|top`). Handles two windows, doors open or shut, hinge side. | About 5 to 6 minutes at 1280 by 853 and 64 samples on two cores. Reads as a clean render, not a photograph. |

Image to 3D of the actual object is the missing piece. One model (`mood-1`, the blue sofa) came from the free TRELLIS demo on Hugging Face through the owner's browser. The free quota allows roughly one model a day without a login. More needs a Hugging Face token or Meshy credits, and he has not approved credits.

## 10. Testing

`tests/headless/` has 17 Playwright scripts and a README that says what each covers and what trips them up. Run the ones that touch what you changed, and always `shoot7.py` (smoke), `shoot38.py` and `shoot40.py` (glass contrast) after CSS changes. They prove the app does not break. They do not prove it looks right on a real graphics card.

There are no unit tests and no linter set up.

## 11. Where the work lives, and how it ships

| Place | State |
|---|---|
| GitHub `shjiex/apt-studio`, branch `main` | Public. Matched the working copy at 3:55 pm on 22 Nov except the two files left out on purpose. All commits are authored by the owner. One old commit, `156342a`, has a "Co-Authored-By: Claude" line. Removing it means rewriting history or recreating the repository, which he has to do or approve. He said earlier "Recreate the GitHub once we're done". |
| The owner's Mac, `~/Downloads/apt-studio-app` | A plain copy of the project, **not a git repository**. Nothing has been run there by an agent. If you work from a clone, tell him which folder is now the real one. |
| Live demo | https://claude.ai/artifact/DPj3EsDyGrpUp7ruxxXU8j ("Apt Studio test build"), built with the demo build on 22 Nov at 10:30 pm. Private to the owner until he shares it. Checked from inside its page on his MacBook (Apple M4): models, textures, the moodboard, the Realistic picture and the example room with its wall picture load, and dragging a piece on the plan showed no flicker in stills. The furniture choice card was not opened there. The first demo, `7gDCij3ZaSGudnoFy2FWi4`, could not be found any more. |
| GitHub Pages | Prepared, **not turned on**. The workflow below is not in the repository. To turn it on, with his yes: add it as `.github/workflows/deploy.yml`, then set Settings > Pages > Source to "GitHub Actions". The site would be https://shjiex.github.io/apt-studio/. |

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx vite build --base=/apt-studio/
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

A Pages build made this way has no `src/firebaseConfig.js`, so it runs in visitor mode. Accounts on the hosted site would need that file written at build time (for example from a repository secret) and `shjiex.github.io` added under Authentication > Settings > Authorized domains.

### Firebase (the project exists since 22 Nov, one step is left)

The Firebase project was created in the owner's Google account on 22 Nov at about 4 pm PT, in the console, by the earlier agent at his request.

| What | State |
|---|---|
| Project | `Apt Studio`, id `apt-studio-cb84e`, Spark (free) plan. Gemini in Firebase and Google Analytics are switched off. |
| Web app | `Apt Studio web`, registered. Firebase Hosting is not set up. |
| Authentication | Email/Password is on. No other provider. |
| Firestore | The `(default)` database, location `nam5`, production mode. The rules in `firestore.rules` are published. Backups are off (they need the paid plan). |
| Config in the code | **Not pasted yet.** `src/firebaseConfig.js` still holds `PASTE_HERE`, so the app runs in visitor mode. The agent's browser tool refused to read the key out of the console page, so this step is the owner's. |

What is left, in order:

1. Open https://console.firebase.google.com/project/apt-studio-cb84e/settings/general, scroll to "Your apps", copy the `firebaseConfig` object, and paste its values into `src/firebaseConfig.js` (copy `src/firebaseConfig.example.js` first if the file is missing). The file is gitignored on purpose.
2. Run the app, sign up, change the room, reload, sign in on another browser, and check `users/<uid>` and `users/<uid>/rooms/*` in the console. Logging in and saving are written and wired, but auth was only ever tested against the Firebase Auth emulator and **Firestore save and load has never been run at all**. Expect to fix things the first time. Watch for a room with large floor or wall photos passing the 1 MB document limit.
3. For accounts on a hosted build, the config has to be present at build time and the host (for example `shjiex.github.io`) has to be added under Authentication > Settings > Authorized domains. `localhost` is allowed already. A Firebase web config is not a secret (the rules protect the data), so committing it is a fair choice for a class project. It is the owner's call.

### Pinterest

The public board feed needs nothing set up. Pinterest's official API (v5) needs a developer app that Pinterest reviews, OAuth, and a server to keep the app secret. None of that exists here, and private boards cannot be read without it.

## 12. Known problems and things never verified

Reported by the owner on 22 Nov, 3:46 and 3:51 pm, in his words:

- "the 2d render is a little buggy as some outline keep flickering". Most likely flat shapes at nearly the same height fighting for depth in the top-down view (`Room3D.jsx`: piece outlines, fit colours, swing arcs, guides, the grid).
- "adjust the realistic version so it doesn't take as long to load" (`PathTraced.jsx`; the cost is compiling the tracer's shader and building its scene, both before the first pass shows).
- "each element in the moodboard image should have different options to choose which furniture, but note that simpler images work best" (`MoodboardPanel.jsx`, the pins manifest, `pin2object.py` already keeps five alternates per image).
- "set up Firebase and Pinterest integration".
- "add more blender models" (`furniture_lib.py`, `bake_catalog.py`, `catalog.js`).
- "this screen is beautiful [Figma 204:3504] why doesn't the current artifact look like that? this should be an example room available for users to use". That screen's stage is a photograph. He wants an example room people can open that looks that good.
- "I'll declunk the UI". He is cleaning up the interface himself.

Never verified by anyone:

- The Realistic picture and the glass on a real graphics card.
- The hosted demo from inside its page.
- Firestore save and load. Real Pinterest images in the app.
- `npm install` and `npm run dev` on his Mac. The pipeline on macOS.
- Whole-object outlines beyond six images, and the rug-under-a-table case.
- A real phone scan. The app does not read scan output.
- Dragging with a real pointer was exercised in tests for openings on the plan, less so for snapping furniture.

Known weak spots: pin models are look-alikes except `mood-1`. The clean-UI-animation research he asked for was not done; the motion was built from judgement. No screen for a selected piece or for a phone in the Figma comment set. `claude/design-system-v3.md` (a project note outside this repository) covers v3 only.

## 13. To do, in order

| # | What | Files |
|---|---|---|
| 1 | Read "What landed on 22 Nov" at the end of this file. Run `shoot7.py`, `shoot41.py` and `shoot42.py`. | |
| 2 | Stop the flicker in the 2D view | `src/components/Room3D.jsx` |
| 3 | Make the Realistic picture start faster, and show something while it prepares | `src/components/PathTraced.jsx`, `PreviewPanel.jsx` |
| 4 | The example room exists. Make it look closer to the photo: a wall picture on one wall only, art and shelves, a sofa colour choice, a first camera position in the Inside view that matches the photo | `src/data/exampleRoom.js`, `Room3D.jsx` (`WallSkin`), `src/lib/surface.js` |
| 5 | Furniture choices per element exist for the six sample pictures. Next: the same for pins from a connected board (needs detection in the browser or a server), the phone layout, and a contrast measurement of the card | `MoodboardPanel.jsx`, `public/models/pins/manifest.json`, `pipeline/pin2object.py`, `object2glb.py` |
| 6 | Six pieces were added (20 now). More if he asks, and a reflective mirror | `pipeline/furniture_lib.py`, `bake_catalog.py`, `public/models/catalog/`, `public/furniture/`, `src/data/catalog.js` |
| 7 | Firebase: he pastes the config (section 11), then run the first real sign-up, save and load and fix what breaks | `src/firebaseConfig.js`, `src/lib/storage.js`, `src/App.jsx`, `firestore.rules` |
| 8 | GitHub Pages, once he says yes | `.github/workflows/deploy.yml` |
| 9 | Glass on the selection bar's buttons and the piece panel, hover and pressed states on moodboard pins, measured | `src/styles/app.css`, `tests/headless/shoot38.py` |
| 10 | Clean history without commit `156342a`, if he still wants it | repository |
| 11 | The 3-minute video for Palantir (his `claude/video-brief.md` note has the plan) | |
| 12 | Later: the app reading scan output, floor plan doors and windows, image to 3D for a person's own pins (needs a server or his token) | `pipeline/`, `PlanRooms.jsx` |

## 14. Workstreams that can run in parallel

Each stream owns its files. Three files are shared and collide easily: `src/styles/app.css` (append a new block at the end, never reorder), `src/pages/Workspace.jsx` and `README.md`. One session at a time should hold those, or merge by hand.

| Stream | Owns |
|---|---|
| A. Scene and rendering (flicker, Realistic start-up, doors, lights in the scene) | `components/Room3D.jsx`, `PathTraced.jsx`, `FurnitureModel.jsx`, `GlbModel.jsx`, `lib/models.js` |
| B. Catalog and Blender models | `pipeline/furniture_lib.py`, `bake_catalog.py`, `make_floor.py`, `public/models/catalog/`, `public/furniture/`, `src/data/catalog.js` |
| C. Moodboard, Pinterest and pin models | `components/MoodboardPanel.jsx`, `PinterestImport.jsx`, `lib/pinterest.js`, `data/moodboard.js`, `pipeline/pin2object.py`, `object2glb.py`, `public/models/pins/`, `public/mood/` |
| D. Accounts and saving | `firebase.js`, `lib/storage.js`, `pages/AuthPage.jsx`, `components/AccountButton.jsx`, `firestore.rules`, the load and save parts of `App.jsx` |
| E. Rooms and the example room | `lib/rooms.js`, `lib/room.js`, `components/RoomSetup.jsx`, `RoomTabs.jsx`, `PlanRooms.jsx`, `STARTER_HOME` in `App.jsx` |
| F. Panels and controls | `components/LightingMenu.jsx`, `SurfacesMenu.jsx`, `FengShuiCard.jsx`, `Segmented.jsx`, `ViewSwitch.jsx`, `lib/useSlidingThumb.js`, `lib/light.js`, `lib/surface.js`, `lib/fengshui.js` |
| G. Room input from pictures and scans | `pipeline/plan2room.py`, `scan2room.py`, `photo2inventory.py`, `components/FoundFurniture.jsx`, `public/inventory/`, `public/plan/` |
| H. Docs and delivery | `AGENTS.md`, `README.md`, `ai-use.md`, `tests/headless/`, `.github/` |

The owner is working on the interface in Figma at the same time. Before changing how a screen looks, read his newest comments on the file.

## What landed on 22 Nov at about 4 pm PT

This replaces the earlier "in flight" list. All of it is in the working copy, and the newest `README.md` entry describes it for people.

| What | Where | Checked how | Still open |
|---|---|---|---|
| Choice rows with one sliding, stretching thumb | `src/components/Segmented.jsx`, `src/lib/useSlidingThumb.js` (also used by `ViewSwitch.jsx`), eight rows in `LightingMenu.jsx` and `SurfacesMenu.jsx`, the "segmented choices" block at the end of `app.css` | `shoot7`, `23`, `32`, `33`, `36`, `37`, `39` pass | Contrast of the track was reasoned, not measured |
| Example room | `src/data/exampleRoom.js`, the block in `RoomSetup.jsx`, `src/styles/example-room.css`, `handleAddExampleRoom` in `App.jsx`, `handleUseExample` in `Workspace.jsx`, the wall picture `public/example/colour-block-wall.jpg` | `shoot42.py` (pass the port as its argument) | It is a model of the layout of sample photo `mood-2.jpg`, not a look-alike of the photo. The sofa is green, the art and shelves are not modelled, and the arches are on all four walls because one wall picture covers every wall |
| Six more Blender models: dining chair, TV stand, wardrobe, side table, floor mirror, pouf | `pipeline/furniture_lib.py`, `pipeline/bake_catalog.py`, `public/models/catalog/`, `public/furniture/`, `src/data/catalog.js` (20 pieces now) | Bounds match the catalog within 5 mm, contact sheet looked at, each added once in a headless run | The mirror glass is a pale sheet, not a reflection, and the mirror sits in the "Rugs and plants" group |
| Furniture choices per moodboard element | `src/components/MoodboardPanel.jsx`, `src/styles/moodboard-options.css`, `elements` in `public/models/pins/manifest.json`, `pipeline/pin2object.py --manifest` | `shoot41.py` (its address is fixed at port 4176, change it) | `object2glb.py` drops `elements` when it rewrites the manifest, so run `pin2object.py --manifest` after it. Pins from a connected board get no outlines. The phone layout and the card's contrast were not checked |
| Plan flicker and Realistic start-up | `src/components/Room3D.jsx`, `PathTraced.jsx`, the new `RoomEffects.jsx` | Flicker: the plan camera sits about 80 m up with near at 0.1 m, so depth resolved only about 5 mm while the floor marks are 2 to 6 mm apart. Near now starts just above the room in the plan (still 0.1 m in 3D and Inside), and the selection mark and the door swing no longer write depth. Realistic: the tracer (211 kB) and the effects pass (273 kB) are separate chunks fetched ahead, so the first bundle went from 2,397 kB to 1,917 kB. In software GL the first full pass came about 4.5 s after the tracer mounts, against an estimated 7.8 s before. The picture is unchanged (mean 177.2 against 177.9 at 24 passes). Copies of `shoot27` and `shoot35` ran clean | **The flicker fix is unproven.** Software GL showed 0 differing pixels before and after, so the flicker was never reproduced; look at the plan on a real graphics card. The 5 to 8 s between the click and the tracer mounting dominates the wait and was not cut. Not done: a BVH worker (the build takes 0.3 s) and a 3-bounce start (it darkened the early passes). The adaptive tile count was not verified |
| Sample photo tags and credits | `src/data/moodboard.js`: the tags and credits of `mood-2` to `mood-5` were attached to the wrong files and were re-paired by what each picture shows | By eye | The credits moved with their tags. Check them against the Unsplash pages before publishing anywhere that matters |
| Firebase project | See "Firebase" in section 11 | In the console | The config is not pasted, and the first real save and load has not been run |
| Hosted demo | The six new model files were uploaded to the demo and listed in `src/demoFiles.json` | The republish may not have finished before the plan ran out, so the live demo may still be the 3:45 pm build | Never checked from inside the hosted page |

Not started: Pinterest beyond the public board feed (the official API needs a developer app that Pinterest reviews, OAuth and a server). The owner said he is cleaning up the interface himself ("I'll declunk the UI"), so leave layout and visual clean-up to him unless he asks.

## Last instruction from the owner (22 Nov, 4:11 pm)

"the liquid glass should avoid shadows beyond its borders, or minimize it, because it's too much now". Treat this as a standing rule for glass. Done so far: the drop shadow in `--glass-edge` (`src/styles/app.css`) is replaced by a 1 px hairline, and the Segmented thumb lost its outer shadow. Not audited: `src/styles/moodboard-options.css`, `src/styles/example-room.css`, the toast, the dialogs and the pressed states. Check each for a `box-shadow` that reaches outside the element, and re-run `shoot38.py` and `shoot40.py`, because the hairline was not measured.

## Which copy is complete

The owner's Mac folder `~/Downloads/apt-studio-app` received every changed source, model and picture file of the last round at about 4:15 pm on 22 Nov, written file by file. The 20 files of `tests/headless/` did not go over one by one: they are inside `apt-studio-update-1615.tar` in that folder, together with a second copy of everything else from the round. Run `tar -xf apt-studio-update-1615.tar` in the project folder to get them, then delete the archive.

GitHub got the same round folder by folder through the website and the plan ran out part way. Uploaded for certain: `AGENTS.md`, `README.md`, `ai-use.md`, `src/styles`, `src/data`, `src/components`. Possibly missing: `src/App.jsx`, `src/demoFiles.json`, `src/lib/useSlidingThumb.js`, `src/pages/Workspace.jsx`, `public/example`, `public/furniture` (six new pictures), `public/models/catalog` (six new models), `public/models/pins/manifest.json`, `pipeline/` (three scripts) and `tests/headless/`. Until those are there the GitHub copy does not build. Compare with the Mac folder and upload what is missing, with commit messages that carry no AI attribution.
