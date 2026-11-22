"""scan2room.py  -  a walk-around video (or a folder of frames) in, the room's size out.

How it works:
  1. Structure from motion (COLMAP): matches points between frames and works out where the camera
     was for each frame and where those points are in 3D.
  2. Finds the floor: the big flat surface under the camera.
  3. Turns the room so its walls line up with the axes (assumes a rectangular room).
  4. Reads the wall positions from where the points stop.
  5. Sets the real-world scale. A video alone has NO scale, so one known length is needed:
       --width-m 3.6        the person types one wall length (most reliable), or
       --camera-height 1.45 assume the phone was held this high above the floor (a guess).

usage:
  python3 scan2room.py <frames_dir | video.mp4> --out out_dir --width-m 3.6
"""
import argparse, json, os, shutil, sys
import numpy as np


def get_frames(src, work, max_frames=60):
    """Copy frames into work/images. A video is sampled evenly down to max_frames."""
    images = os.path.join(work, 'images')
    shutil.rmtree(images, ignore_errors=True); os.makedirs(images)
    if os.path.isdir(src):
        names = sorted(n for n in os.listdir(src) if n.lower().endswith(('.jpg', '.jpeg', '.png')))
        step = max(1, len(names) // max_frames)
        for n in names[::step]:
            shutil.copy(os.path.join(src, n), os.path.join(images, n))
    else:
        import cv2
        cap = cv2.VideoCapture(src)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); step = max(1, total // max_frames); i = 0; kept = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % step == 0:
                h, w = frame.shape[:2]; s = 960 / max(h, w)
                if s < 1:
                    frame = cv2.resize(frame, (int(w * s), int(h * s)))
                cv2.imwrite(os.path.join(images, f'frame_{kept:03d}.jpg'), frame); kept += 1
            i += 1
    return images


def reconstruct(images, work):
    """Run COLMAP. Returns 3D points (N,3), their colours, and camera centres + down directions."""
    import pycolmap
    db = os.path.join(work, 'database.db')
    if os.path.exists(db):
        os.remove(db)
    sparse = os.path.join(work, 'sparse'); shutil.rmtree(sparse, ignore_errors=True); os.makedirs(sparse)
    reader = pycolmap.ImageReaderOptions()
    reader.camera_model = 'SIMPLE_RADIAL'          # one lens setting shared by every frame
    pycolmap.extract_features(db, images, camera_mode=pycolmap.CameraMode.SINGLE, reader_options=reader)
    pycolmap.match_exhaustive(db)
    maps = pycolmap.incremental_mapping(db, images, sparse)
    if not maps:
        raise SystemExit('Could not reconstruct: not enough matching points between frames.')
    rec = max(maps.values(), key=lambda r: r.num_reg_images())
    pts = np.array([p.xyz for p in rec.points3D.values()])
    cols = np.array([p.color for p in rec.points3D.values()])
    err = np.array([p.error for p in rec.points3D.values()])
    track = np.array([p.track.length() for p in rec.points3D.values()])
    keep = (err < 2.0) & (track >= 3)
    centres, downs, names = [], [], []
    for im in rec.images.values():
        pose = im.cam_from_world() if callable(im.cam_from_world) else im.cam_from_world
        R = pose.rotation.matrix(); t = pose.translation
        centres.append(-R.T @ t); downs.append(R.T @ np.array([0.0, 1.0, 0.0])); names.append(im.name)
    info = dict(frames_total=len(os.listdir(images)), frames_placed=rec.num_reg_images(), points=int(keep.sum()))
    return pts[keep], cols[keep], np.array(centres), np.array(downs), info


def fit_floor(pts, centres, downs, rng):
    """RANSAC for the plane that is below the cameras and faces up."""
    up = -downs.mean(axis=0); up /= np.linalg.norm(up)
    spread = np.linalg.norm(centres - centres.mean(0), axis=1).mean()
    tol = 0.03 * max(spread, 1e-6)
    best = (0, None, None)
    below = pts[(pts - centres.mean(0)) @ up < 0]
    if len(below) < 50:
        below = pts
    for _ in range(3000):
        s = below[rng.choice(len(below), 3, replace=False)]
        n = np.cross(s[1] - s[0], s[2] - s[0]); ln = np.linalg.norm(n)
        if ln < 1e-9:
            continue
        n /= ln
        if n @ up < 0:
            n = -n
        if n @ up < 0.94:                      # floor must face up (within ~20 degrees)
            continue
        d = -n @ s[0]
        if ((centres @ n + d) <= 0).any():     # every camera is above the floor
            continue
        inl = np.abs(below @ n + d) < tol
        if inl.sum() > best[0]:
            best = (int(inl.sum()), n, d)
    if best[1] is None:
        raise SystemExit('No floor found.')
    n, d = best[1], best[2]
    inl = np.abs(pts @ n + d) < tol            # refine on the inliers
    c = pts[inl].mean(0); _, _, vt = np.linalg.svd(pts[inl] - c); n2 = vt[2]
    if n2 @ n < 0:
        n2 = -n2
    return n2, -n2 @ c, int(inl.sum())


def to_room_frame(pts, centres, n, d):
    """Rotate and shift so the floor is z = 0 and up is +z."""
    z = n; x = np.cross([0, 1, 0], z)
    if np.linalg.norm(x) < 1e-6:
        x = np.cross([1, 0, 0], z)
    x /= np.linalg.norm(x); y = np.cross(z, x)
    R = np.stack([x, y, z])
    origin = -d * n
    return (pts - origin) @ R.T, (centres - origin) @ R.T


def align_walls(p, c):
    """Turn around the up axis until the points' bounding rectangle is smallest: walls are then axis-aligned."""
    xy = p[:, :2]
    best = None
    for deg in np.arange(0, 90, 0.5):
        a = np.radians(deg); R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
        q = xy @ R.T
        lo, hi = np.percentile(q, 0.5, axis=0), np.percentile(q, 99.5, axis=0)
        area = np.prod(hi - lo)
        if best is None or area < best[0]:
            best = (area, deg, R)
    _, deg, R = best
    p2 = p.copy(); p2[:, :2] = p[:, :2] @ R.T
    c2 = c.copy(); c2[:, :2] = c[:, :2] @ R.T
    return p2, c2, float(deg)


def wall_positions(p):
    """Where the points stop on each side. Uses the densest far edge rather than the single furthest point."""
    out = {}
    for axis, name in ((0, 'x'), (1, 'y')):
        v = p[:, axis]
        out[name] = (float(np.percentile(v, 0.5)), float(np.percentile(v, 99.5)))
    return out


def run(src, out, width_m=None, camera_height=None, seed=0):
    os.makedirs(out, exist_ok=True)
    work = os.path.join(out, 'work'); os.makedirs(work, exist_ok=True)
    images = get_frames(src, work)
    pts, cols, centres, downs, info = reconstruct(images, work)
    rng = np.random.default_rng(seed)
    n, d, floor_pts = fit_floor(pts, centres, downs, rng)
    p, c = to_room_frame(pts, centres, n, d)
    p, c, turn = align_walls(p, c)
    walls = wall_positions(p)
    size_x = walls['x'][1] - walls['x'][0]; size_y = walls['y'][1] - walls['y'][0]
    long_side, short_side = max(size_x, size_y), min(size_x, size_y)
    cam_h = float(np.median(c[:, 2]))
    top = float(np.percentile(p[:, 2], 99.5))
    if width_m:
        scale = width_m / long_side; source = f'typed wall length {width_m} m (longer side)'
    else:
        ch = camera_height or 1.45
        scale = ch / cam_h; source = f'assumed camera height {ch} m (a guess, not measured)'
    result = dict(
        width=round(long_side * scale, 2), length=round(short_side * scale, 2),
        highest_point_seen=round(top * scale, 2),
        height=None, height_note='The ceiling is only known if the video shows it. highest_point_seen is a lower bound.',
        camera_height=round(cam_h * scale, 2), scale_source=source,
        floor_points=floor_pts, wall_turn_degrees=turn, **info)
    json.dump(result, open(os.path.join(out, 'room.json'), 'w'), indent=1)
    np.save(os.path.join(out, 'points.npy'), np.hstack([p * scale, cols]))
    plot(p * scale, c * scale, {k: (v[0] * scale, v[1] * scale) for k, v in walls.items()}, os.path.join(out, 'scan_top_view.png'))
    return result


def plot(p, c, walls, path):
    """Top view picture: every 3D point, the camera path, and the fitted room rectangle."""
    from PIL import Image, ImageDraw
    S = 900; pad = 0.6
    x0, x1 = walls['x'][0] - pad, walls['x'][1] + pad; y0, y1 = walls['y'][0] - pad, walls['y'][1] + pad
    k = S / max(x1 - x0, y1 - y0)
    im = Image.new('RGB', (int((x1 - x0) * k), int((y1 - y0) * k)), (250, 249, 246)); dr = ImageDraw.Draw(im)
    to = lambda x, y: ((x - x0) * k, (y1 - y) * k)
    for q in p:
        col = (40, 150, 90) if q[2] < 0.05 else (60, 60, 60) if q[2] < 1.0 else (200, 90, 40)
        u, v = to(q[0], q[1]); dr.point((u, v), fill=col)
    a, b = to(walls['x'][0], walls['y'][1]), to(walls['x'][1], walls['y'][0])
    dr.rectangle([a, b], outline=(220, 40, 40), width=3)
    for q in c:
        u, v = to(q[0], q[1]); dr.ellipse([u - 3, v - 3, u + 3, v + 3], fill=(40, 80, 220))
    im.save(path)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('--out', default='out/scan')
    ap.add_argument('--width-m', type=float); ap.add_argument('--camera-height', type=float)
    a = ap.parse_args()
    r = run(a.src, a.out, a.width_m, a.camera_height)
    print(json.dumps(r, indent=1))
