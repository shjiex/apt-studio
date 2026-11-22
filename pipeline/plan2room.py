"""plan2room.py  -  a floor plan picture in, the rooms and their sizes out.

How it works (plain image processing, no AI model):
  1. Walls are the thick dark lines. Thin dark things (text, doors, fixtures) are removed by
     "opening": anything thinner than about half a wall disappears.
  2. Door and window openings are bridged, so every room becomes a closed shape.
  3. Each closed white area that does not touch the picture's edge is a room.
  4. A picture has no scale. One known length sets it:
        --room N --width-m 7.09     "room number N is 7.09 m across its longer side"
     Without it, sizes are reported in pixels only.

usage:
  python3 plan2room.py plan.jpg --out out_dir                      # find rooms, write a numbered picture
  python3 plan2room.py plan.jpg --out out_dir --room 3 --width-m 7.09
  python3 plan2room.py plan.jpg --app ../public/plan              # also write what the app's room picker reads
output: <out>/plan_rooms.png (rooms numbered), <out>/plan.json
"""
import argparse, json, os
import numpy as np
import cv2


def wall_thickness(dark):
    """Typical wall thickness in pixels: the usual length of the longer dark runs along rows and columns."""
    runs = []
    for img in (dark, dark.T):
        for line in img[:: max(1, img.shape[0] // 200)]:
            edges = np.flatnonzero(np.diff(np.concatenate([[0], line, [0]])))
            lengths = edges[1::2] - edges[::2]
            runs.extend(lengths[(lengths >= 4) & (lengths <= 60)].tolist())
    if not runs:
        return 6
    return int(np.median(runs))


def bridge(walls, lines, t, across):
    """Close the openings in walls that run one way (across=True: left-right walls).

    Read one row of pixels at a time. Between two stretches of wall there is a gap.
    The gap is an opening in a wall only if a wall runs ALONG this row on at least one side
    (a stretch at least two walls long). Otherwise the row is simply crossing a room.
    A short gap is a doorway. A long gap only counts when thin lines run along it,
    which is how plans draw a window.
    """
    if not across:
        return bridge(walls.T.copy(), lines.T.copy(), t, True).T
    near_line = cv2.dilate(lines, np.ones((max(3, t), 1), np.uint8))     # a line within half a wall of this row
    keep = np.zeros_like(walls)
    for y in range(walls.shape[0]):
        row = walls[y]
        if not row.any():
            continue
        edges = np.flatnonzero(np.diff(np.concatenate([[0], row, [0]])))
        starts, ends = edges[::2], edges[1::2]                           # each stretch of wall is [start, end)
        for i in range(len(starts) - 1):
            gap_from, gap_to = ends[i], starts[i + 1]
            gap = gap_to - gap_from
            left_long = ends[i] - starts[i] >= 2 * t
            right_long = ends[i + 1] - starts[i + 1] >= 2 * t
            if not (left_long or right_long):
                continue
            if gap <= 4.5 * t:
                keep[y, gap_from:gap_to] = 1                             # a doorway
            elif gap <= 22 * t and near_line[y, gap_from:gap_to].mean() >= 0.6:
                keep[y, gap_from:gap_to] = 1                             # a window
    return keep


def find_rooms(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    dark = (gray < 110).astype(np.uint8)
    t = wall_thickness(dark)
    # 1. keep only thick strokes: these are the walls
    k = max(3, int(round(t * 0.6)))
    walls = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))   # round, so slanted walls survive too
    # thin straight lines (window panes are drawn this way); lighter grey counts too
    faint = (gray < 170).astype(np.uint8)
    reach = max(10, 2 * t)
    lines = cv2.morphologyEx(faint, cv2.MORPH_OPEN, np.ones((1, reach), np.uint8)) | \
            cv2.morphologyEx(faint, cv2.MORPH_OPEN, np.ones((reach, 1), np.uint8))
    # 2. close doorways and windows, in walls running across and in walls running down
    bridged = walls | bridge(walls, lines, t, True) | bridge(walls, lines, t, False)
    # 3. closed white areas are rooms
    free = (1 - bridged).astype(np.uint8)
    count, labels, stats, centres = cv2.connectedComponentsWithStats(free, connectivity=4)
    H, W = gray.shape
    rooms = []
    for i in range(1, count):
        x, y, w, h, area = stats[i]
        touches_edge = x == 0 or y == 0 or x + w == W or y + h == H
        if touches_edge or area < (t * 5) ** 2:
            continue
        mask = (labels == i).astype(np.uint8)
        contour = max(cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
        outline = cv2.approxPolyDP(contour, 0.01 * cv2.arcLength(contour, True), True)[:, 0, :]
        rooms.append(dict(box=[int(x), int(y), int(w), int(h)], area_px=int(area),
                          centre=[float(centres[i][0]), float(centres[i][1])],
                          fill=round(float(area) / float(w * h), 2),       # 1.0 = a perfect rectangle
                          outline=outline.tolist()))
    rooms.sort(key=lambda r: -r['area_px'])
    for n, r in enumerate(rooms, 1):
        r['number'] = n
    return rooms, dict(wall_px=t, walls=walls, bridged=bridged, lines=lines)


def run(path, out, room=None, width_m=None, app=None):
    os.makedirs(out, exist_ok=True)
    image = cv2.imread(path)
    rooms, info = find_rooms(image)
    scale = None
    if room and width_m:
        ref = next(r for r in rooms if r['number'] == room)
        scale = width_m / max(ref['box'][2], ref['box'][3])            # metres per pixel
    for r in rooms:
        w, h = r['box'][2], r['box'][3]
        if scale:
            r['size_m'] = [round(max(w, h) * scale, 2), round(min(w, h) * scale, 2)]
            r['area_m2'] = round(r['area_px'] * scale * scale, 1)
    picture = image.copy()
    rng = np.random.default_rng(1)
    for r in rooms:
        colour = tuple(int(v) for v in rng.integers(90, 230, 3))
        overlay = picture.copy()
        cv2.fillPoly(overlay, [np.array(r['outline'], np.int32)], colour)
        picture = cv2.addWeighted(overlay, 0.45, picture, 0.55, 0)
        x, y, w, h = r['box']
        cv2.rectangle(picture, (x, y), (x + w, y + h), (40, 40, 220), 1)
        label = str(r['number']) + (f": {r['size_m'][0]} x {r['size_m'][1]}" if scale else '')
        cx, cy = int(r['centre'][0]), int(r['centre'][1])
        cv2.putText(picture, label, (cx - 28, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 3, cv2.LINE_AA)
        cv2.putText(picture, label, (cx - 28, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (20, 20, 20), 1, cv2.LINE_AA)
    name = os.path.splitext(os.path.basename(path))[0]
    cv2.imwrite(os.path.join(out, name + '_rooms.png'), picture)
    result = dict(source=os.path.basename(path), wall_thickness_px=info['wall_px'],
                  metres_per_pixel=scale, rooms=[{k: v for k, v in r.items() if k != 'outline'} for r in rooms])
    json.dump(result, open(os.path.join(out, name + '.json'), 'w'), indent=1)
    if app:
        # for the app: the plan picture, and each room's outline as fractions of the picture (0 to 1)
        os.makedirs(app, exist_ok=True)
        H, W = image.shape[:2]
        cv2.imwrite(os.path.join(app, 'plan.jpg'), image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        for_app = dict(picture='plan.jpg', source=os.path.basename(path), width=W, height=H, metres_per_pixel=scale,
                       rooms=[dict(number=r['number'], across_px=r['box'][2], down_px=r['box'][3],
                                   centre=[round(r['centre'][0] / W, 4), round(r['centre'][1] / H, 4)],
                                   outline=[[round(x / W, 4), round(y / H, 4)] for x, y in r['outline']]) for r in rooms])
        json.dump(for_app, open(os.path.join(app, 'plan.json'), 'w'), indent=1)
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('plan'); ap.add_argument('--out', default='out/plans')
    ap.add_argument('--room', type=int); ap.add_argument('--width-m', type=float); ap.add_argument('--app')
    a = ap.parse_args()
    r = run(a.plan, a.out, a.room, a.width_m, a.app)
    print('wall', r['wall_thickness_px'], 'px; rooms', len(r['rooms']))
    for room in r['rooms']:
        print(room['number'], room['box'], room.get('size_m'), 'fill', room['fill'])
