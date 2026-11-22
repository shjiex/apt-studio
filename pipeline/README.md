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
- `generated`: if you put a `generated.glb` (from Meshy, Hunyuan3D, TripoSR or similar) in an
  image's folder, it is used instead and only rescaled. This is the route to a truly realistic
  model of the actual object. No such model was run for this project so far.

Sizes are typical sizes for the kind of furniture, not measured from the photo.

## Remake the catalog models or the floor

```
python3 bake_catalog.py all 1024 ../public/models/catalog
python3 make_floor.py ../public/textures oak
```

## Room scan (first pass)

```
python3 scan2room.py my_room.mp4 --out out/scan --width-m 3.6
```

A video has no real-world scale, so one length must be given: `--width-m` is the longer wall,
typed by the person. Without it the script assumes the phone was held 1.45 m above the floor,
which is a guess.

Checked once, on a rendered 36-frame walk-around of a 3.6 x 3.0 x 2.5 m room
(`scan_testroom.py`), with the longer wall typed as 3.6 m:

| | True | Scan | Error |
| --- | --- | --- | --- |
| Shorter wall | 3.00 m | 2.88 m | 4% short |
| Camera height | about 1.45 m | 1.28 m | 12% low |
| Ceiling height | 2.50 m | not found | the clip never shows the ceiling |

Limits:
- Not tried on a real phone video. The test clip is a clean render with pictures on three
  walls, which makes matching easy. Bare walls, blur and moving light will do worse.
- Assumes a rectangular room.
- Wall positions come from where the points stop, so a few stray points push the walls out.
  In the test this looks like the main source of error. Reading the walls from the lines of
  points on them is the next step.
- The app does not read `room.json` yet.
- No floor or wall textures are taken from the video yet.
