# AI use

This file is required by the HCDE 438 AI and LLM use policy. Keep it up to date at every milestone.

## Tool

Claude (Anthropic), used as a coding agent, directed and reviewed by me.

## Which portions were AI-generated

**Milestone 1 (2026-11-22):** all source files in this folder were written by Claude from my FP1 proposal,
my Figma design system (v3) and my direction:

- `src/App.jsx`, every file in `src/components/`, `src/lib/room.js`, `src/data/*.js`
- `src/styles/tokens.css`, `src/styles/app.css`
- `index.html`, `vite.config.js`, `package.json`, `README.md`, this file
- The furniture tile images in `public/furniture/` (rendered by Claude in Blender)

**Milestone 2 (2026-11-22):** written by Claude at my direction ("Pinterest integration and login so the moodboard is real"):

- New: `src/firebase.js`, `src/firebaseConfig.example.js`, `firestore.rules`, `src/lib/pinterest.js`, `src/lib/storage.js`,
  `src/pages/AuthPage.jsx`, `src/pages/Workspace.jsx`, `src/components/PinterestImport.jsx`, `src/components/AccountButton.jsx`
- Changed: `src/App.jsx` (now holds data, auth and routes), `src/components/MoodboardPanel.jsx`, `src/components/PreviewPanel.jsx`,
  `src/data/moodboard.js`, `src/styles/app.css`, `README.md`
- Claude chose the Pinterest approach (the public board-widget feed) after finding the official API could not be
  approved in time; I accepted it.

**Layout round (2026-11-22):** Claude changed these from my review notes (move the 2D/3D switch to the top, bring back a top bar,
draggable divider, account and board as two icons, no checkmark on picked pins, Pinterest-style moodboard, measurement grid
instead of the dimensions pill, remove the "in colour" legend): `src/pages/Workspace.jsx`, `src/components/Room3D.jsx` (MeasureGrid),
`PreviewPanel.jsx`, `MoodboardPanel.jsx`, `AccountButton.jsx`, `SelectionBar.jsx`, `Icon.jsx`, `RoomSetup.jsx`, `src/styles/app.css`.
The competitor list that came with it was researched by Claude.

**Interaction round (2026-11-22):** written by Claude at my direction ("full 2D and 3D interaction"), after it looked at Planner 5D
and IKEA Kreativ with me: unique piece ids with add and duplicate, wall snapping, wall-distance guides, multi-step undo and redo,
keyboard shortcuts, zoom, 3D orbit with a cutaway wall. Files: `src/lib/room.js`, `src/pages/Workspace.jsx`, `src/components/Room3D.jsx`,
`PreviewPanel.jsx`, `SelectionBar.jsx`, `ElementTile.jsx`, `ElementStrip.jsx`, `Icon.jsx`, `src/App.jsx`, `src/styles/app.css`.

### Realistic 3D round (22 Nov), AI-generated

- `pipeline/` (all files): finding one object per moodboard image, cutting it out, building a
  3D model from it, baking the catalog models, making the floor textures.
- `src/lib/models.js`, `src/components/GlbModel.jsx`: loading and sizing 3D model files.
- `src/components/FurnitureModel.jsx`: shows the model file, with the old box version as a stand-in.
- `src/components/Room3D.jsx`: soft surrounding light, sun position, wood floor textures.
- `src/data/catalog.js`: model file for each piece, and furniture made from moodboard images.
- `src/components/MoodboardPanel.jsx`, `src/components/PreviewPanel.jsx`, `src/pages/Workspace.jsx`,
  `src/styles/app.css`: the frame on each image, the "Add this ... in 3D" button, the extra tiles.
- `public/models/`, `public/textures/`: made by the pipeline scripts.

My direction for this round: build it headless first, one target object per moodboard image,
most realistic 3D possible, no paid credits.

### Feng shui, groups and shop links (22 Nov), AI-generated

- `src/lib/fengshui.js`, `src/components/FengShuiCard.jsx`: the feng shui checks, score and tips.
- `src/components/ElementStrip.jsx`: furniture groups above the tiles.
- `src/components/SelectionBar.jsx`, `src/components/ShopList.jsx`, `src/components/ElementTile.jsx`:
  shop link per piece, the shop list, the "Shop" mark on tiles.
- `src/pages/Workspace.jsx`, `src/components/PreviewPanel.jsx`, `src/styles/app.css`: wiring and styles.
- `src/firebase.js`: runs without the keys file.
- `src/components/FoundFurniture.jsx`, `pipeline/photo2inventory.py`, `public/inventory/`: furniture you already own, read from a room photo.
- `pipeline/object2glb.py`: uses a generated model when one exists and matches its colour to the photo.
- One 3D model (`public/models/pins/mood-1.glb`) was generated with the public TRELLIS demo on
  Hugging Face from a cutout of a sample photo.

My direction for this round: image to 3D from a few photos plus dimensions, a shop link per piece
that can be an Amazon page, a feng shui score with recommendations, a better organised bottom strip,
and a first public repository.

### Photo render and floor plan (22 Nov, morning), AI-generated

- `src/components/DownloadMenu.jsx` and `handleDownloadRoom` in `src/pages/Workspace.jsx`: the room file download.
- `pipeline/render_room.py`: the Blender photo render of a room file. `pipeline/samples/`: its output.
- `src/components/PlanRooms.jsx`, the link in `src/components/RoomSetup.jsx`, `public/plan/`: room size from a floor plan.
- `pipeline/plan2room.py` (rewritten to close windows and doorways), `pipeline/make_sample_plan.py`.
- `pipeline/scan2room.py`: walls read from piles of points instead of where the points stop.

My direction for this round: software that takes a 2D floor plan and images and gives a
near-accurate, realistic render of an apartment room.

### Live demo, shapes and shadows (22 Nov, 6 am), AI-generated

- `src/App.jsx` (router choice for the demo build), `src/lib/paths.js`, `src/lib/models.js`, `src/demoFiles.json`: the hosted demo build.
- `src/components/Room3D.jsx`: contact shadow under each piece, light levels.
- `src/components/FoundFurniture.jsx`, `src/components/ShopList.jsx`, `src/components/Icon.jsx`, `src/styles/app.css`: outlines, "~" sizes, chips, site icons.
- `pipeline/photo2inventory.py`: writes each piece's outline.
- `src/components/PiecePanel.jsx`, `src/components/FengShuiCard.jsx`, `src/lib/fengshui.js`, `src/pages/Workspace.jsx`, `src/components/PreviewPanel.jsx`: the piece panel, the score ring, two more checks, the camera in the room file.
- `pipeline/render_room.py`: `--view app`, and the lights described in the app.
- `src/lib/light.js`, `src/components/LightingMenu.jsx`, light code in `src/components/Room3D.jsx`: lighting by Kelvin and lumens.
- `pipeline/furniture_lib.py`: six more pieces. `src/data/catalog.js`: their entries.
- `src/components/MoodboardPanel.jsx`: image-only cards with the hover state.

My direction for this round came from my comments on the Figma screens (outlines instead of
rectangles, "~" for sizes, chips, an open icon and the shop's icon) and from asking for a build I
could test in the browser.

Not AI-generated: the project idea, the proposal, the wireframes and the design decisions in the Figma file
(colour rules, layout, components, wording), which I made and Claude followed.

### Rooms, search and your own floor (22 Nov, 7 am), AI-generated

- `src/lib/rooms.js` (room kinds, a new room) and `src/lib/surface.js` (floor and wall choices,
  turning a photo into a repeating picture with its light evened out).
- `src/components/RoomTabs.jsx` and `src/components/SurfacesMenu.jsx`, both new.
- `src/components/RoomSetup.jsx` rewritten: kind, name, size, add and remove.
- `src/App.jsx`: the rooms list, the open room, add / rename / remove, one function that changes a
  part of the open room. `src/pages/Workspace.jsx`: reads the open room, the room tabs, the surfaces
  menu, the room file now carries name, kind and surfaces.
- `src/components/ElementStrip.jsx`: the search field. `src/components/Icon.jsx`: room, home, search
  and layers icons.
- `src/components/Room3D.jsx`: floor from a photo, wall paint or wall photo, the canvas fills the
  stage. `pipeline/render_room.py`: the same floor and walls in the photo render.
- `src/styles/app.css`: room bar, room dialog choices, search field, surfaces panel, phone top bar.

My direction for this round: rooms as tabs with icons and a way to add rooms, and a search for the
furniture, both from my comments on the Figma screen; floor and wall textures from my own photos.

### Angled photos, saving and board search (22 Nov, 8 am), AI-generated

- `src/lib/straighten.js` (solving the eight equations, straightening a photo) and
  `src/components/PhotoStraighten.jsx` (the corner dialog), both new.
- `src/lib/surface.js`: reading a photo, evening out its light from big areas.
  `src/components/SurfacesMenu.jsx`: opens the corner dialog after a photo is chosen.
- `src/lib/storage.js`: the home in the browser and in Firestore. `firestore.rules`: rooms under a user.
  `src/App.jsx`: reads the saved home, saves it after changes, loads the account's home on sign-in.
  `src/pages/Workspace.jsx`: waits for the moodboard model list before drawing a saved room.
- `src/components/MoodboardPanel.jsx` and `src/data/moodboard.js`: search, filters, Explore, tags.
- `src/styles/app.css`: the corner dialog and the moodboard tools.

My direction for this round: accurate textures from my own photos, and the search bar and explore
option I asked for in my comment on the moodboard header in Figma.

### Real sun, dimmers and start over (22 Nov, 8:10 am), AI-generated

- `src/lib/light.js`: `PLACES`, `sunPosition` (declination, hour angle, elevation, azimuth, sunrise
  and sunset), `formatHour`, `getSun` rewritten to use it, `lightOutput` (lumens after the dimmer).
- `src/components/LightingMenu.jsx`: city, latitude, month, half-hour time, sunrise and sunset line, dimmer slider.
- `src/components/RoomTabs.jsx`, `src/App.jsx`, `src/pages/Workspace.jsx`: Start over.
- `src/components/Room3D.jsx`: dimmed bulbs, plain caps on wall tops when the walls wear a photo.
- `src/styles/app.css`: city list, month buttons, start over.

My direction for this round: lighting that is as accurate as possible for where I live, not a generic sun.

### Inside view, realistic picture, no dot separators (22 Nov, 8:40 am), AI-generated

- `src/components/PathTraced.jsx`, new: the path-traced picture (uses the `three-gpu-pathtracer` package).
- `src/components/Room3D.jsx`: the inside camera and look-around, full walls, ceiling, skirting,
  window frame and sky for the inside view, ambient occlusion and tone mapping, real colours for
  furniture you own outside the plan, helper shapes marked so the traced picture can skip them.
- `src/components/ViewSwitch.jsx`, `src/components/PreviewPanel.jsx`, `src/pages/Workspace.jsx`,
  `src/components/Icon.jsx`: the Inside option, the Realistic button and its pass count.
- `src/lib/room.js`: `getWindow`.
- `src/components/MoodboardPanel.jsx`, `LightingMenu.jsx`, `SelectionBar.jsx`, `FengShuiCard.jsx`,
  `src/styles/app.css`: dot separators and list markers replaced by layout.
- `package.json`: `three-gpu-pathtracer`, `three-mesh-bvh`, `xatlas-web`, `@react-three/postprocessing`,
  `postprocessing`, `n8ao`.

My direction for this round: the 3D space should look as real as possible while staying usable in a
reasonable time, not like a render; and no bullet or dot separators in the interface, as in my
Figma comments.

### Windows you place, motion, a calmer realistic picture (22 Nov, 9:30 am), AI-generated

- `src/lib/room.js`: `defaultWindows`, `newWindow`, `wallFrame`, `openingOf`, `windowInRoom`, `wallBlocks`.
  `src/lib/rooms.js`, `src/lib/storage.js`: a room's windows, also for older saves.
- `src/components/Room3D.jsx`: the `Wall` component (walls built around their windows), the piece
  settle-in animation. `src/components/SurfacesMenu.jsx`: the window cards.
- `src/lib/fengshui.js`, `src/lib/light.js`, `src/components/LightingMenu.jsx`: checks and the sun tag for any window.
- `src/components/PathTraced.jsx`: a sky light per window, real light proportions and exposure,
  bulbs as panels, the denoiser.
- `src/styles/app.css`: the motion block. `pipeline/render_room.py`: windows on any wall.

My direction for this round: let people add windows, and do not forget animations.

### Doors you place, dragging on the plan (22 Nov, 10 am), AI-generated

- `src/lib/room.js`: the door helpers and `coversDoor`. `src/lib/fengshui.js`: door checks for any door.
- `src/components/Room3D.jsx`: doors in the `Wall` component, the grips and the slide-along-the-wall drag.
- `src/components/SurfacesMenu.jsx`: door cards. `src/lib/rooms.js`, `src/lib/storage.js`,
  `src/pages/Workspace.jsx`, `src/components/PreviewPanel.jsx`: doors in a room, saved and passed down.
- `pipeline/render_room.py`: doors on any wall.

My direction for this round: let people add windows "etc.", which I took to include doors.

### Prices, standing where you click, brightness and save (22 Nov, 10:15 am), AI-generated

- `src/components/ShopList.jsx`, `src/components/PiecePanel.jsx`, `src/pages/Workspace.jsx`: a price per piece and the total.
- `src/components/Room3D.jsx`: click the floor to stand there, the eased turn towards the middle of the room.
- `src/components/PathTraced.jsx`, `src/components/PreviewPanel.jsx`: brightness and "Save picture".
- `src/lib/fengshui.js`, `src/components/FengShuiCard.jsx`, `src/components/PhotoStraighten.jsx`: shorter wording.
- `src/styles/app.css`: price rows, the total, the brightness pill, controls that wrap on a phone.

This round was the assistant's own queue from the earlier requests (realism, usability, the shop list); I gave no new direction.

### Undo for windows and doors, drag handles, no overlap, paint names (22 Nov, 10:45 am), AI-generated

- `src/pages/Workspace.jsx`: history steps that hold the room as well as the pieces, `changeRoom`.
- `src/lib/room.js`: `keepClear`. `src/components/Room3D.jsx`: the visible handle, the drag that keeps clear.
- `src/components/SurfacesMenu.jsx`, `src/lib/surface.js`, `src/styles/app.css`: add and remove with a toast, the no-room note, paint names.

This round was the assistant's own queue; I gave no new direction.

### Doorways with an open door, a named picture, a calmer photo render (22 Nov, 11:15 am), AI-generated

- `src/components/Room3D.jsx`: the doorway, its frame, the open door, the hall behind it, the unseen shadow sheet.
- `src/pages/Workspace.jsx`: the saved picture's file name.
- `pipeline/render_room.py`: the open door, exposure by the area of glass. `pipeline/samples/`: two new renders and their room file.

This round was the assistant's own queue; I gave no new direction.

### A door's hinge side, open or shut (22 Nov, 11:40 am), AI-generated

- `src/components/Room3D.jsx`: the door turned about either edge, open or shut, and the quarter circle on the plan.
- `src/components/SurfacesMenu.jsx`: the Hinge and Door choices on a door's card.
- `pipeline/render_room.py`: the same two choices in the photo render.

This round was the assistant's own queue; I gave no new direction.

### Stronger glass that still passes AA, and a dark doorway in the 3D view (22 Nov, 2:30 pm), AI-generated

- `src/styles/app.css`: the glass block at the end of the file (variables, fallbacks, which controls are glass, the score ring).
- `src/components/Room3D.jsx`: the dim sheet behind a doorway outside the Inside view.

My direction for this round: "Use stronger glass but ensure AA accessibility." The contrast method (lighten the backdrop so the worst case still passes) was the assistant's; I should be able to explain the arithmetic in the comment.

### Whole-object outlines, motion and quieter colour (22 Nov, 3:30 pm), AI-generated

- `pipeline/pin2object.py` (`whole_outline`), `pipeline/photo2inventory.py`, `public/models/pins/manifest.json`, `public/inventory/room.json`.
- `src/components/ViewSwitch.jsx`, `src/components/FengShuiCard.jsx`, `src/styles/app.css` (pressed, thumb, fit tags, score card), `src/styles/tokens.css` (colour ramps).

My direction: outlines should cover the whole predicted object even when a table stands on a rug or a blanket lies on a couch; buttons should sink in; the segmented control should flow like Liquid Glass; "Fits" should shout less; the score should be just the number, the size of its neighbours; the check card should lead with one priority and nest the rest, with an icon on every line.

### Glass on panels, the toast and the phone tab bar (22 Nov, 3:45 pm), AI-generated

- `src/styles/app.css`: the "glass panels" block and the "toast and tab bar" block.

My direction: "keep going with scheduled tasks to polish the rest of everything with the liquid glass as well". Making grey labels ink inside glass panels was the assistant's way of keeping AA.

### Flowing choice rows, an example room, six more models and furniture choices per picture (22 Nov, 4:10 pm), AI-generated

- `src/components/Segmented.jsx`, `src/lib/useSlidingThumb.js`, and the eight choice rows in `LightingMenu.jsx` and `SurfacesMenu.jsx`; `ViewSwitch.jsx` rewritten to use the hook.
- `src/data/exampleRoom.js`, the example block in `RoomSetup.jsx`, `src/styles/example-room.css`, `handleAddExampleRoom` in `App.jsx`, `handleUseExample` in `Workspace.jsx`, and the wall picture `public/example/colour-block-wall.jpg` (drawn by a script).
- Six Blender models and their catalog entries: `pipeline/furniture_lib.py`, `pipeline/bake_catalog.py`, `public/models/catalog/`, `public/furniture/`, `src/data/catalog.js`.
- Furniture choices per picture: `MoodboardPanel.jsx`, `src/styles/moodboard-options.css`, `pipeline/pin2object.py`, `public/models/pins/manifest.json`.
- `Room3D.jsx`, `PathTraced.jsx` and the new `RoomEffects.jsx` (plan flicker and a faster start for the Realistic picture).
- `src/data/moodboard.js` (tags and credits re-paired), `AGENTS.md`, `tests/headless/`.
- The Firebase project was created in the Firebase console by the assistant through my browser, at my request. No code came from that.

My direction: "set up Firebase and Pinterest integration, I'll declunk the UI. Also prepare and update a comprehensive handoff document for Codex. add more blender models. adjust the realistic version so it doesn't take as long to load. the 2d render is a little buggy as some outline keep flickering. each element in the moodboard image should have different options to choose which furniture, but note that simpler images work best." and, about the Figma screen with the photo, "this should be an example room available for users to use". The assistant split the work across parallel sessions. Choosing the TV stand as the sideboard and painting the arches as a wall picture were the assistant's choices.

### One panel at a time, and glass without outside shadows (22 Nov, 6:30 pm), AI-generated

- `src/pages/Workspace.jsx` (`openPanel`, `togglePanel`, Escape), `src/components/PreviewPanel.jsx`, `LightingMenu.jsx`, `SurfacesMenu.jsx`, `DownloadMenu.jsx` and `FengShuiCard.jsx` (their open state now comes from Workspace).
- `src/styles/app.css`: the outer shadows of the view switch thumb, the segmented thumb and the toast.

My direction: "the liquid glass should avoid shadows beyond its borders, or minimize it, because it's too much now", and "continue where I left off". Closing the other panels when one opens was the assistant's fix for panels overlapping during the demo.

### The Realistic picture gets ready before you switch it on (22 Nov, 8:45 pm), AI-generated

- `src/components/PathTraced.jsx` (split into `PathTraced`, which gets the tracer ready, and `TracedPicture`, which draws while Realistic is on; `getReady`; `?prepare` for testing) and the mount in `src/components/Room3D.jsx`.

My direction: "adjust the realistic version so it doesn't take as long to load" (from earlier) and "Keep working on it nonstop autonomously". Preparing the program while you look around, and reading the room again on the click so late-loading models are included, were the assistant's choices after timing each step.

### The example room looks more like its photo, and object2glb keeps furniture choices (22 Nov, 8:50 pm), AI-generated

- `src/data/exampleRoom.js` (`onlyOn`, `insideView`), `src/components/Room3D.jsx` (the wall picture per wall, `FIRST_LOOK`, the inside view starting afresh per room), `PreviewPanel.jsx` and `Workspace.jsx` (passing the room's id and start view), `SurfacesMenu.jsx` (a new photo covers every wall).
- `pipeline/object2glb.py` (`KEPT_FIELDS`, `merge_manifest`).

My direction: "this should be an example room available for users to use" and "Keep working on it nonstop autonomously". The handoff's to-do list named the wall picture on one wall and the first camera position. Where to stand was the assistant's choice, read from the photo.

### Panels stay on a phone's screen, and checks with a real pointer (22 Nov, 9:00 pm), AI-generated

- `src/styles/app.css`: the "panels from the top bar, on a phone" block at the end.

My direction: "Keep working on it nonstop autonomously". The assistant found the off-screen panels while checking the phone layout, and ran the pointer and contrast checks the handoff listed as not done.

### Checks for the fit tags and the room score (22 Nov, 9:00 pm), AI-generated

- `tests/logic/check-logic.mjs` (new).

My direction: "Keep working on it nonstop autonomously". The handoff noted there were no unit tests. Which cases to check was the assistant's choice.

### Escape closes dialogs, and the demo path checked end to end (22 Nov, 9:05 pm), AI-generated

- `src/pages/Workspace.jsx`: `closeDialog` and the Escape line at the top of the keyboard shortcuts.

My direction: "Keep working on it nonstop autonomously". The assistant noticed the shop list did not close with Escape while checking the demo path.

### A new piece looks for room turned, too (22 Nov, 9:10 pm), AI-generated

- `src/lib/room.js` (`findOpenSpot`, `firstSpotWhere`), `src/pages/Workspace.jsx` (the two places a new piece is made), `tests/logic/check-logic.mjs`.

My direction: "Keep working on it nonstop autonomously". The assistant found the couch landing on the bed while preparing the demo path.

### Accessibility check with axe (22 Nov, 9:15 pm), AI-generated

- `src/pages/Workspace.jsx` (the divider's values), `src/components/RoomTabs.jsx` (the tab list inside the pill), `src/styles/app.css` (the `room-tabs__list` block at the end).

My direction: "Keep working on it nonstop autonomously". Running axe, and which findings to fix, were the assistant's choices.

### Glass that looks like the Figma glass (22 Nov, 10:10 pm), AI-generated

- `src/styles/app.css`: `--glass-filter` and `--glass-edge` in the glass block.

My direction: "it doesn't look like the liquid glass loads right, it should look like" the Stage control in Figma (node 216:4668). The filter values were the assistant's, picked by matching the Figma render's grey and measuring AA over black and white.

### Checked on a real graphics card, and the files GitHub was missing (22 Nov, 10:30 pm), AI-generated

- `src/demoFiles.json`: the model addresses of the new hosted build.
- `README.md`: the timings from the MacBook.

My direction: "complete what was left off". The assistant opened the hosted build on my MacBook, timed the Realistic picture there, and copied over the files my GitHub upload had missed. No app code changed in this round.

### The moodboard filter row and the furniture choice card (22 Nov, 10:45 pm), AI-generated

- `src/styles/app.css`: the "moodboard filter row keeps its height" block at the end.
- `src/components/MoodboardPanel.jsx`: the layout effect that keeps the card on screen now stops above the tab bar.

My direction: finish the handoff list (the card's contrast and its phone layout were open items). The assistant found the shrinking filter row in a screenshot and fixed it.

### The layout from my Figma frame, lighter glass, and furniture you select first (23 Nov, 12:15 am), AI-generated

- New: `Logo.jsx`, `SidePanel.jsx`, `ToolsPanel.jsx`, `TopMenus.jsx`, `Slider.jsx`, `lib/units.js`.
- Rewritten: `RoomTabs.jsx`, `PiecePanel.jsx`, `ViewSwitch.jsx`, `LightingPanel.jsx` (was LightingMenu), `SurfacesPanel.jsx` (was SurfacesMenu), `ShopList.jsx`.
- Changed: `Room3D.jsx` (select before drag, buttons over the piece, full turn, size arrows, double click), `PreviewPanel.jsx`, `Workspace.jsx`, `MoodboardPanel.jsx`, `ElementStrip.jsx`, `ElementTile.jsx`, `useSlidingThumb.js`, `Icon.jsx`, `app.css`.
- Removed: `SelectionBar.jsx` and the duplicate action.

My direction: I redrew the workspace in Figma and listed the changes in one long message. I asked for no pressed state, a flowing transition, a lighter glass shadow, glass sliders, select before drag, rotate and a red remove above the piece, imperial units, typed sizes and positions, Own as the tag, a full turn in 3D, and a second layout with the tools on the left. The assistant read the Figma frame and my two annotations and wrote the code.

### More furniture, and wall decor (23 Nov, 12:30 am), AI-generated

- `src/data/catalog.js`, `src/lib/room.js`, `src/lib/fengshui.js`, `src/components/FurnitureModel.jsx`, `src/components/GlbModel.jsx`.
- New: `pipeline/tiles.html`, `pipeline/tiles.jsx`, `pipeline/render_tiles.py` and 15 pictures in `public/furniture/`.

My direction: look through the IKEA and Planner 5D categories I had open, and add wall decor first. My dad's test asked for more plant sizes, nightstands and bed colours. The assistant read both sites in my browser, chose the pieces and built the shape pieces. Houzz's Generic Products list sits behind Houzz Pro and was not reached.

### A welcome that asks first, tips beside the controls, and Realistic from the start (23 Nov, 12:50 am), AI-generated

- New: `src/components/Welcome.jsx`, `src/components/Tips.jsx`, `tests/headless/shoot43.py`.
- Changed: `src/App.jsx`, `src/pages/Workspace.jsx`, `src/components/PathTraced.jsx`, `src/components/PreviewPanel.jsx`, `src/styles/app.css`, `tests/headless/shoot7.py`.

My direction: the start should ask questions before it assumes a room, with import first and a skip to a generic room. Tips should be small popups next to the features. My Figma note said the Inside view should already try to be realistic and should tell me how long to wait. The assistant wrote the welcome, the tips and the Sharpening pill.

### A wider room score (23 Nov, 1:00 am), AI-generated

- `src/lib/fengshui.js`: the helpers `backOf`, `doorBehind`, `doorDistance`, `inFrontOf` and `walkableTo`, the new checks in `checkBed`, `checkSofa`, `checkDesk`, `checkDining` and `checkRoom`, and `from` on every check.
- `src/components/FengShuiCard.jsx`: the source line under a tip, and `useMemo` around the score.
- `tests/logic/check-logic.mjs`: 21 new lines.
- `src/pages/Workspace.jsx`: the welcome is skipped when a saved home is already in the browser.

My direction: "fengshui should also be more comprehensive after you conduct deep research". The assistant searched the web, read the sources listed in the README, chose which guidelines can be measured from what the app knows, and wrote the checks. The thresholds (30 cm behind a sofa, 40% of the corner to corner length, 75 cm for a walkway) are its choices from the ranges in those sources, and I can change them at the top of each check.

### Design system v5 in Figma, with liquid glass (23 Nov, 1:20 am), AI-generated

- Figma only, no app code: the v5 frame, the "Apt Studio DS v5" variables, three effect styles, the Liquid glass frame, and the Glass button, View switch, Piece actions and Room tabs components.
- `AGENTS.md`: the node ids of v5.

My direction: "create a new design system version with liquid glass", with a flowing transition, no pressed state and a lighter shadow, and never to overwrite an earlier version. The assistant duplicated v4 and built the glass parts with the Figma plugin API from the numbers in `app.css`.

### The logo in the middle of the top bar (23 Nov, 2:05 am), AI-generated

- `src/pages/Workspace.jsx`: the `Logo` sits between the two halves of the top bar.
- `src/styles/app.css`: the "logo in the middle of the top bar" block at the end.

My direction: a comment on the logo in the hosted build, "move this to the center". The assistant made the change and measured it.

### Fixes from my 2 am list (23 Nov, 3:15 am), AI-generated

- New: `src/components/DrawnIcon.jsx` (the stroke data is copied from my drawn icons in Figma).
- Changed: `App.jsx`, `lib/storage.js`, `lib/pinterest.js`, `pages/AuthPage.jsx`, `TopMenus.jsx`, `FengShuiCard.jsx`, `Tips.jsx`, `Welcome.jsx`, `RoomSetup.jsx`, `FoundFurniture.jsx`, `PlanRooms.jsx`, `ShopList.jsx`, `SurfacesPanel.jsx`, `LightingPanel.jsx`, `PhotoStraighten.jsx`, `PinterestImport.jsx`, `PiecePanel.jsx`, `PreviewPanel.jsx`, `ElementStrip.jsx`, `MoodboardPanel.jsx`, `data/catalog.js`, `PathTraced.jsx`, `Room3D.jsx`, `lib/fengshui.js`, `lib/room.js`, and the "round of 23 Nov, 3 am" blocks at the end of `app.css`.

My direction: a list of seventeen points I scheduled for 2:51 am, in my own words in the chat. The assistant read my Figma comments first, reproduced the Pinterest error in the test link and found its cause, read Apple's and other write-ups on Liquid Glass before changing the glass, and made the changes. The choices that are its own: 24 passes before Realistic shows, the colour names for the couches, and the door opening outward as its reading of "open behind it".

### Realistic without specks, a doorway that is not a black hole, more room for the room (23 Nov, 3:45 am), AI-generated

- Changed: `PathTraced.jsx`, `Room3D.jsx`, `styles/app.css`.

My direction: "realistic mode really doesn't work, i see spots everywhere", and at 3:23 am "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant looked at the test link in the browser on my Mac, saw that specks were still there at Sharp, and tried the brightness limit and the median pass until both rooms were clean there. It also saw the black doorway and the hidden plus button on my Mac and fixed them. The choices that are its own: the limit of six times white, the 1.8 times median threshold, the glow of the recess (two divided by the exposure), 42% for the right section and 420 px as the height where the zoom buttons move.

### A Pinterest importer checked against the real feed (23 Nov, 3:50 am), AI-generated

- Changed: `lib/pinterest.js`, `lib/storage.js`, `App.jsx`, `pages/Workspace.jsx`, `PinterestImport.jsx`, `MoodboardPanel.jsx`, `ElementStrip.jsx`, `ToolsPanel.jsx`, `PreviewPanel.jsx`, `tests/logic/check-logic.mjs`.

My direction: "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant ran the importer's code against Pinterest's feed from a page in my browser, read which fields and picture widths come back, and changed the importer to match. The choices that are its own: the 564 px picture, the 15 second wait, the wording of each message, keeping the board in the browser, and renaming the furniture group while a Pinterest board is connected.

### Logging in, tried end to end on a stand-in Firebase (23 Nov, 4:00 am), AI-generated

- New: `tests/headless/shoot-account.py`, `tests/logic/check-account.mjs`, `tests/logic/fake-firestore.js`, `tests/logic/fake-firebase.js`.
- Changed: `pages/AuthPage.jsx`, `components/AccountButton.jsx`, `App.jsx`, `pages/Workspace.jsx`, `firebase.js`, `styles/app.css`.

My direction: "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant could not use my real Firebase project without my yes, so it installed Firebase's emulator on its own machine and ran the account flow there, and wrote a stand-in Firestore for the saving code. The choices that are its own: what the login card checks before asking Firebase, the wording of every message, the reset link appearing only after a wrong password, the states in the account menu and the red mark.

### The plan stays clear of the buttons, and the tools at the side fit (23 Nov, 4:10 am), AI-generated

- Changed: `Room3D.jsx`, `styles/app.css`. In Figma: text and layout changes inside the row "Screens to adjust" and one added paragraph in the v5 Liquid glass frame.

My direction: "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant looked at the test link on my Mac at two window sizes and at the tools-at-the-side layout in its own test browser, and fixed what overlapped. The choices that are its own: 72 px as the height kept free for the buttons, 368 px for the tools section, and 460 px as the stage width where the middle buttons move up.

### Turning the room in 3D cannot move a door, and nothing floats (23 Nov, 4:25 am), AI-generated

- Changed: `Room3D.jsx`.

My direction: "the door is glitchy" and "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant turned the room on my Mac, moved the door by accident, put it back with undo, and then changed the code so it cannot happen. The choice that is its own: windows and doors are dragged on the plan only. If I want them draggable in 3D again, the two lines are in `grip()` in `Room3D.jsx`.

### Connecting a board tried inside the app, and zoom buttons on phones (23 Nov, 4:50 am), AI-generated

- New: `tests/headless/shoot-pinterest.py`. Changed: `styles/app.css`.

My direction: "Keep working on it until 7:50 am. Mostly the Pinterest access, 3D environment, Firebase and login". The assistant read the real feed once more from my browser to copy its shape into the test, then ran the app's own flow against that. The choice that is its own: 820 px as the phone height where the zoom buttons stay on the right.

### A smooth wall at Sharp, and no grainy picture on the way there (23 Nov, 5:05 am), AI-generated

- Changed: `PathTraced.jsx`.

My direction: "realistic mode really doesn't work, i see spots everywhere". The assistant compared the realistic picture on my Mac at several stages, before and after each change. The choices that are its own: 0.9 and the floor of 0.08 for the smoothing, and showing the traced picture only once it is Sharp (64 passes) in place of at 24.

## Chat transcript

TODO: paste the share link or exported transcript of the Claude conversation here.

## Modifications I made to the AI output

TODO: list every change you make by hand, with the file name. None yet.

## What I can explain

TODO: tick each file once you can explain it line by line.

- [ ] `src/App.jsx` (data, auth listener, routes)
- [ ] `src/pages/Workspace.jsx`, `src/pages/AuthPage.jsx`
- [ ] `src/firebase.js`, `src/lib/storage.js`, `src/lib/pinterest.js`
- [ ] `src/lib/room.js`, `src/lib/fengshui.js`
- [ ] `src/components/Room3D.jsx`
- [ ] `src/components/FurnitureModel.jsx`, `src/components/GlbModel.jsx`, `src/lib/models.js`
- [ ] `src/components/PreviewPanel.jsx`
- [ ] `src/components/RoomSetup.jsx` and `NumberField.jsx`
- [ ] the remaining components
- [ ] `src/styles/app.css`
