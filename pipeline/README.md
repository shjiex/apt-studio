# 3D pipeline

Python scripts that make the 3D content the web app shows. They run without a screen
("headless"). The web app does not need Python: it only reads the files these scripts write
into `public/`.

Status: written and tested on Linux only. Never run on macOS.

## Set up (once)

```
cd pipeline
python3 -m pip install -r requirements.txt
./get_models.sh
```

`bpy` is Blender as a Python package. It only installs on the Python version Blender was built
for; if `pip` cannot find it, try the Python version named on https://pypi.org/project/bpy/.

## The scripts

| Script | In | Out |
| --- | --- | --- |
| `pin2object.py` | a moodboard image, a folder of images, or a public Pinterest board | per image: the ONE target object (`target.json`), its cutout, colours and a texture swatch |
| `object2glb.py` | the folder `pin2object.py` wrote | a sized 3D model (`.glb`), a thumbnail, and `manifest.json` |
| `bake_catalog.py` | nothing (uses `furniture_lib.py`) | the eight catalog pieces as `.glb` files |
| `make_floor.py` | nothing | the wood floor images (colour, normal, roughness) |
| `furniture_lib.py` | | the Blender furniture the catalog and the templates are built from |
| `scan2room.py` | a walk-around video or a folder of frames, plus ONE known length | the room's width and length (`room.json`) and a top-view picture of the scan |
| `scan_testroom.py` | nothing | a rendered walk-around of a made-up room of known size, for checking `scan2room.py` |
| `photo2inventory.py` | a photo of your own room | every piece of furniture it sees (`public/inventory/room.json`), for the app's "Your furniture" dialog |
| `plan2room.py` | a floor plan picture, plus ONE known length | the rooms it finds, numbered on a picture, with their sizes (`<plan>.json`); with `--app`, what the app's room picker reads (`public/plan/`) |
| `make_sample_plan.py` | nothing | the sample floor plan the app ships with, drawn from known sizes |
| `render_room.py` | the room file the app downloads | one realistic picture of that room (`.png`) |

## Make models from a moodboard

```
python3 pin2object.py --images ../public/mood --out out/pins
python3 object2glb.py --all out/pins --out ../public/models/pins --preview
```

Or from a public Pinterest board (not tested: Pinterest could not be reached where this was built):

```
python3 pin2object.py --board <user>/<board> --out out/pins
```

The app reads `public/models/pins/manifest.json` when it opens. An image whose id matches an
entry gets a frame around its object and an "Add this ... in 3D" button.

## How one object is chosen

Every object in the image is found, then furniture is scored. A piece scores higher when it is
large, sharp, near the middle, fully inside the frame and not hidden behind other things.
The best one is the target; the next five are kept in `target.json` as `alternates`.
`ready_for_3d` is true only when the object is not cut off and less than 15% hidden.

## How the model is made, and its limits

- `photo-box`: cabinets, dressers, nightstands, shelves and rugs. The photo is straightened and
  put on the front of a box of the right size. Convincing when the piece is seen from the front
  and nothing is in the way. Skewed or holed when it is seen at an angle or partly hidden.
- `template`: everything else. A furniture template of that type, sized for that type and
  recoloured with the photo's colours and swatch. It is NOT the actual object, only one like it.
- `generated`: if a generated model exists for an image (`generated/<image id>.glb` here, or
  `generated.glb` in the image's folder), it is used instead. It is rescaled to a typical height
  for its kind and its colour is matched to the photo. This is the route to a model of the actual
  object. One has been made so far: `generated/mood-1.glb`, the blue sofa, from one cutout
  (`generated/inputs/mood-1.png`) with the public TRELLIS demo on Hugging Face. The side the photo
  does not show is invented by the model. That demo allows about one model a day without a
  Hugging Face login.

Sizes are typical sizes for the kind of furniture, not measured from the photo.

## Remake the catalog models or the floor

```
python3 bake_catalog.py all 1024 ../public/models/catalog
python3 make_floor.py ../public/textures oak
```

## Room scan

```
python3 scan2room.py my_room.mp4 --out out/scan --width-m 3.6
```

A video has no real-world scale, so one length must be given: `--width-m` is the longer wall,
typed by the person. Without it the script assumes the phone was held 1.45 m above the floor,
which is a guess.

How the walls are found: a wall shows up as a pile of points at one distance (seen from above, a
line of points). Furniture and stray points do not pile up like that. For each side the script
looks from the outside in for the first thin slice holding a clear pile and calls that the wall.
A blank wall gives no points, so no pile; then it falls back to where the points stop, and
`room.json` says how many walls were found each way.

Checked once, on a rendered 36-frame walk-around of a 3.6 x 3.0 x 2.5 m room
(`scan_testroom.py`), with the longer wall typed as 3.6 m:

| | True | First version (where the points stop) | Now (piles of points) |
| --- | --- | --- | --- |
| Shorter wall | 3.00 m | 2.88 m | 2.99 m |
| Camera height | about 1.45 m | 1.28 m | 1.36 m |
| Ceiling height | 2.50 m | not found | not found: the clip never shows the ceiling |

Three of the four walls were found as piles; the fourth was guessed from where the points stop.

Limits:
- One test, on a clean render with pictures on three walls, which makes matching easy. Not tried
  on a real phone video. Bare walls, blur and moving light will do worse.
- The result moves with the slice width: other widths gave 2.97 to 3.09 m on the same points.
  The 1 cm error above is partly luck; expect a few centimetres.
- Assumes a rectangular room.
- The app does not read `room.json` yet.
- No floor or wall textures are taken from the video yet.

## Floor plan to rooms

```
python3 plan2room.py plan.jpg --out out/plans                        # numbers the rooms it finds
python3 plan2room.py plan.jpg --out out/plans --room 2 --width-m 3.97   # room 2's longer side is 3.97 m
python3 plan2room.py plan.jpg --app ../public/plan                   # also write what the app reads
```

Plain image processing, no AI model:
1. Walls are the thick dark lines. Anything thinner than about half a wall (text, doors, fixtures) is dropped.
2. Openings are closed one row of pixels at a time. A gap between two stretches of wall is an
   opening only if a wall runs along that row on at least one side. A short gap (up to 4.5 walls
   long) is a doorway. A long gap counts only when thin lines run along it, which is how plans
   draw a window.
3. Each closed white area that does not touch the picture's edge is a room.
4. A picture has no scale, so one known length sets it.

In the app: the room chip, then "Take it from a floor plan instead". You pick a room on the plan and
type how wide it is; the app works out the length from the room's shape. The plan in `public/plan/`
is a sample drawn by `make_sample_plan.py`, not a real listing.

Checked two ways.

On the drawn sample, where every size is known: 4 of 4 rooms found, each side within 2 cm.

On three real apartment plans with the room sizes printed on them (demo images from
github.com/zlzeng/DeepFloorplan; not included here). Each plan was scaled from one room's printed
length, then the other rooms were compared with what is printed:

| Plan | Room | Printed | Found |
| --- | --- | --- | --- |
| A | Reception room | 7.09 x 5.08 m | 7.09 x 4.55 m |
| A | Bedroom | 3.66 x 2.59 m | 3.56 x 2.54 m |
| A | Bedroom | 4.42 x 3.73 m | 4.62 x 3.67 m |
| B | Kitchen | 2.55 x 2.23 m | 2.52 x 2.35 m |
| B | Bedroom 2 | 3.72 x 3.00 m | 3.73 x 3.11 m |
| C | Bedroom | 3.82 x 2.45 m | 3.99 x 2.40 m |
| C | Hall | 4.35 x 2.45 m | 4.45 x 2.40 m |
| C | Kitchen | 3.06 x 2.62 m | 2.93 x 2.87 m |

Rooms found: 5 on plan A, 7 on plan B, 6 on plan C. The first version found 2, 6 and 5.

Limits:
- Real plans are much harder than the sample. Sides are typically 5 to 25 cm off, and plan A's
  reception room is 53 cm short because its bay window is cut off straight.
- Still missed: rooms with an angled outside wall (plan C's reception room and one bedroom),
  most bathrooms, and plan A's largest bedroom, which runs together with the kitchen.
- Two rooms joined by a wide opening count as one (plan B's dining and reception rooms).
- A room's size is its bounding rectangle, so built-in cupboards and odd corners throw it off.
- The app's room is always a rectangle, with its own door and window. Doors and windows are not
  read from the plan.

## Furniture you already own, from a room photo

```
python3 photo2inventory.py my-room.jpg --out ../public/inventory
```

Lists every piece of furniture the finder sees, with how sure it is. Tried on three of the sample
room photos: it found 9, 8 and 6 pieces. The main pieces (sofa, rug, chairs, table) were right.
Mistakes seen: a distant kitchen wall cabinet listed as storage, and a table base listed as a bench.
Pieces under 0.7 confidence are marked "not sure" and start switched off in the app.

It does not know where a piece stands in the room or how big it really is: the app uses its own
catalog piece of that kind, in grey, and you drag it into place.

## Photo render of the room

```
python3 render_room.py apt-studio-room.json --out render.png                 # from the doorway
python3 render_room.py apt-studio-room.json --out top.png --view top         # door | corner | window | top
python3 render_room.py apt-studio-room.json --out quick.png --width 540 --samples 24
python3 render_room.py apt-studio-room.json --out mine.png --view app          # the view that was on screen in the app
```

The app's live view has to stay fast, so it cuts corners on light. This is the slow, careful
version, done outside the app: in the app press the download button, then "Room file". The script
rebuilds that room in Blender with the same 3D models and the same floor, and renders it with
Cycles, which follows light the way a camera does (soft shadows, light bouncing off the floor
and walls). Samples are in `samples/`.

Time on the Linux machine this was built on (2 processor cores, no graphics card): about 6 minutes for a view from inside the room and 2.5 minutes for the top view, at 1280 x 853 with 64 samples. A 540-pixel preview with 24 samples took 25 seconds.
A laptop with a graphics card should be much faster; that has not been tried.

Limits:
- It is as real as the models are. The catalog pieces are simple models, so the picture reads as
  a clean 3D render, not as a photograph.
- The window is a bright pane, not a view outside. Walls are one plain colour.
- `--view app` uses the camera saved in the room file: turn the room in the app's 3D view, download the
  room file, and the render is taken from that angle. Walls between the camera and the room are left
  out of the picture (they still block light). Pieces marked as already yours are shown in their real
  colours, not grey.
- The other views put the camera in one of four fixed places.
- Lighting: if the room file has the lighting you described in the app, the render uses it. The sun
  is a narrow beam the size of the window pointing the way the sunlight travels for that hour and
  window direction; fixed lights and each lamp's bulb are point lights with their Kelvin colour and
  their lumens (converted to Blender's watts of light: lumens / 683 x 4 x pi). With daylight off the
  window is dark.
- Doors: if the room has `doors` (which wall, how far along, width), each is drawn there with its frame and handle; an older room file gets the one door at the front of the left wall.
- Windows: if the room has `windows` (which wall, how far along, width, bottom, top), each one gets its pane, frame, sky light and, when the sun stands on that side, its sun beam. An older room file gets the one back-wall window. Sample: `samples/render-two-windows.jpg`.
- Doors: each door stands open 75 degrees on its hinge, as in the app; the doorway is a dim panel on the wall, because the walls here are flat sheets. Sample: `samples/render-open-door.jpg`. A door hinged on the right (`hinge: 'right'`) or shut (`shut: true`) in the room file is drawn that way.
- Exposure: a room with more than one ordinary window's worth of glass (1.3 square metres) is exposed one stop down for every doubling, the way a camera would. The room file for the two samples is `samples/room-two-windows.json`.
- Floor and walls: if the room file has `surfaces`, the render uses them. A floor photo repeats
  mirrored at the size you gave in the app. Walls take the paint colour, or the wall photo laid on by
  position in the room so all four walls show it at the same real size. The photos travel inside the
  room file as data URLs and are written to the temp folder while rendering.
  What is right: where light falls, how warm or cool it is, how bright one bulb is next to another.
  What is not modelled: the season and your latitude (the sun follows one simple day), the shape of
  each fitting's beam, lampshades (a lamp's bulb shines in all directions), real wall paint, and your
  eye's adjustment, so overall brightness is approximate.
- It is a separate step run from a terminal. The app has no "render" button yet.
