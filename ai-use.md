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

Not AI-generated: the project idea, the proposal, the wireframes and the design decisions in the Figma file
(colour rules, layout, components, wording), which I made and Claude followed.

## Chat transcript

TODO: paste the share link or exported transcript of the Claude conversation here.

## Modifications I made to the AI output

TODO: list every change you make by hand, with the file name. None yet.

## What I can explain

TODO: tick each file once you can explain it line by line.

- [ ] `src/App.jsx` (data, auth listener, routes)
- [ ] `src/pages/Workspace.jsx`, `src/pages/AuthPage.jsx`
- [ ] `src/firebase.js`, `src/lib/storage.js`, `src/lib/pinterest.js`
- [ ] `src/lib/room.js`
- [ ] `src/components/Room3D.jsx`
- [ ] `src/components/FurnitureModel.jsx`, `src/components/GlbModel.jsx`, `src/lib/models.js`
- [ ] `src/components/PreviewPanel.jsx`
- [ ] `src/components/RoomSetup.jsx` and `NumberField.jsx`
- [ ] the remaining components
- [ ] `src/styles/app.css`
