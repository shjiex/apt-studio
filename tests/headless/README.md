# Headless tests

These are the checks that were run after every round of work. Each one is a short Python script that opens the built app in headless Chromium (Playwright), clicks through one area and prints what it found. They are not a test suite with a runner. Read the printed lines, and look for `console errors: []` or the script's own pass lines.

## Run them

```
pip install playwright
playwright install chromium
npx vite build
npx vite preview --port 4173 --strictPort    # leave this running in another terminal
python3 tests/headless/shoot7.py
```

Every script opens `http://localhost:4173/`. Rebuild (`npx vite build`) after each code change, because the preview server serves the `dist` folder.

Chromium is started with software graphics, so the 3D scene works on a machine with no graphics card:

```
--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist
```

## Which scripts match the app today

The workspace was laid out again on 23 Nov. `shoot7.py` and `shoot43.py` were written or rewritten for that layout and pass. The scripts numbered 16 to 42 were written for the layout before it. Several of them look for controls that have moved or changed name (the selection bar, the Lighting and Floor and walls menu buttons, the furniture search field), and none of them skips the welcome questions, so expect them to stop early until their selectors are updated. To skip the welcome in a script, add this before `goto`:

```
await pg.add_init_script("localStorage.setItem('apt-studio-welcomed','yes'); localStorage.setItem('apt-studio-toured','yes');")
```

## What each script covers

| Script | Covers |
|---|---|
| `shoot7.py` | Smoke test: the app loads, tiles are there, a piece is added, the login page opens, no console errors |
| `shoot16.py` | The panel for the selected piece (size, link, actions) |
| `shoot22.py` | Rooms of a home (add, rename, remove, tabs) and furniture search |
| `shoot23.py` | Floor and walls panel: oak or your photo, paint or your photo |
| `shoot24.py` | Straightening an angled floor or wall photo by its four corners |
| `shoot25.py` | Searching the moodboard, and the home surviving a reload |
| `shoot26.py` | Real sun by place, month and hour, lamp dimmers, start over |
| `shoot27.py` | The 3D view and the Inside view |
| `shoot32.py` | Windows you place (add, move, wall, size) |
| `shoot33.py` | Doors you place, and dragging openings on the plan |
| `shoot34.py` | Prices on pieces and the total in the shop list |
| `shoot35.py` | Inside view: click the floor to stand there |
| `shoot36.py` | Undo and redo of window and door changes, openings kept from overlapping, paint names |
| `shoot37.py` | Doorways, hinge side, door open or shut |
| `shoot38.py` | Contrast of text on glass, measured over black and over white backdrops, including the lighting panel (must stay at or above 4.5 to 1) |
| `shoot39.py` | Room score button size, the score card, the view switch thumb, the pressed state |
| `shoot40.py` | Contrast on the dark glass toast and on the phone tab bar |
| `shoot43.py` | The welcome questions, the tour of tips, wall decor on a wall, feet and inches, and contrast on the new glass |

## Things that will trip you up

Every script writes its screenshots to an absolute path under `/home/claude/shots/`, the folder they were written in. On another machine, change that path (one or two lines per script, search for `/home/claude`) or create the folder.

The 2D and 3D tabs are found with `exact=True`, because "3D" also appears in other button names. The button that opens the floor and walls panel is named "Floor, walls, windows and doors".

Range inputs (sliders) are set with the native value setter followed by an `input` event. Filling them the usual Playwright way does not reach React.

The choice rows in the panels (which wall, hinge, open or shut, oak or photo, compass side) are buttons with `aria-pressed`, found by their visible name. Keep those names and `aria-pressed` when changing `src/components/Segmented.jsx`, or scripts 23, 32, 33, 36 and 37 stop finding them.

In the 3D and Inside views software graphics are slow. CSS transitions and element screenshots can stall or time out there. Measure animated things on the plan (2D), and take pictures with `page.screenshot(clip=...)` in place of an element screenshot.

A second page in the same browser context did not render the scene. Open a new context for a second page.

When a contrast script injects a backdrop behind the glass, it must leave out the element being measured, or it repaints that element too. When sampling the room score disc, sample 9 px in from the edge, because the outer ring is ink.

Run the scripts one at a time in the foreground. The longer ones take a minute or two each on two cores.

These tests say nothing about how the Realistic picture or the glass look on a real graphics card. Nobody has checked that yet.
