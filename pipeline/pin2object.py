"""pin2object.py  -  one moodboard image in, ONE target object out.

What it does, in order:
  1. Finds every object in the image (YOLOE, 4,585 everyday classes, runs on CPU).
  2. Keeps only furniture we can place in a room and scores each one:
     big, sharp, near the middle, fully inside the frame, not hidden by other things.
  3. Picks the best one as THE target (the rest are kept as "alternates").
  4. Cuts the target out with a clean edge (instance mask x matting model).
  5. Reads its materials from the photo: main colours and a tileable texture swatch.

usage:
  python3 pin2object.py <image> [--out out_dir] [--id name]
  python3 pin2object.py --images <folder> --out out_dir        # whole folder
  python3 pin2object.py --board <user>/<board> --out out_dir   # a public Pinterest board

output per image:  <out>/<id>/cutout.png, swatch.png, target.json
"""
import argparse, json, os, sys, glob, urllib.request
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get('APT_MODELS', os.path.join(HERE, 'models'))
os.environ.setdefault('U2NET_HOME', MODELS)

# detector label -> (app type, real size in metres: width, depth, height, pick weight)
FURNITURE = {
    'couch': ('sofa', 2.0, 0.9, 0.8, 1.0), 'loveseat': ('sofa', 1.5, 0.9, 0.8, 1.0),
    'futon': ('sofa', 1.9, 0.9, 0.8, 1.0),
    'armchair': ('chair', 0.8, 0.85, 0.85, 1.0), 'chair': ('chair', 0.5, 0.55, 0.9, 1.0),
    'office chair': ('chair', 0.62, 0.62, 1.0, 1.0), 'computer chair': ('chair', 0.62, 0.62, 1.0, 1.0),
    'swivel chair': ('chair', 0.62, 0.62, 1.0, 1.0), 'rocking chair': ('chair', 0.65, 0.85, 0.95, 1.0),
    'folding chair': ('chair', 0.45, 0.5, 0.8, 0.9), 'stool': ('chair', 0.4, 0.4, 0.5, 0.9),
    'bar stool': ('chair', 0.4, 0.4, 0.75, 0.9), 'bench': ('chair', 1.2, 0.4, 0.45, 0.9),
    'bed': ('bed', 1.6, 2.0, 0.9, 1.0), 'bunk bed': ('bed', 1.0, 2.0, 1.7, 1.0),
    'canopy bed': ('bed', 1.6, 2.0, 2.0, 1.0), 'daybed': ('bed', 0.9, 2.0, 0.8, 1.0),
    'day bed': ('bed', 0.9, 2.0, 0.8, 1.0), 'bed frame': ('bed', 1.6, 2.0, 0.9, 1.0),
    'office desk': ('desk', 1.4, 0.7, 0.75, 1.0), 'computer desk': ('desk', 1.2, 0.6, 0.75, 1.0),
    'writing desk': ('desk', 1.1, 0.55, 0.76, 1.0), 'table': ('desk', 1.2, 0.7, 0.75, 1.0),
    'kitchen table': ('desk', 1.5, 0.9, 0.75, 1.0), 'dinning table': ('desk', 1.6, 0.9, 0.75, 1.0),
    'round table': ('desk', 1.0, 1.0, 0.75, 1.0), 'glass table': ('desk', 1.1, 0.6, 0.45, 0.9),
    'cocktail table': ('desk', 1.1, 0.6, 0.42, 1.0), 'side table': ('desk', 0.5, 0.5, 0.55, 0.9),
    'nightstand': ('shelf', 0.5, 0.4, 0.55, 0.95), 'bureau': ('shelf', 1.0, 0.5, 1.0, 0.95),
    'dresser': ('shelf', 1.2, 0.5, 0.8, 1.0), 'cabinet': ('shelf', 0.9, 0.45, 0.9, 0.9),
    'side cabinet': ('shelf', 0.8, 0.4, 0.8, 0.9), 'tv cabinet': ('shelf', 1.6, 0.4, 0.5, 0.9),
    'file cabinet': ('shelf', 0.45, 0.6, 0.7, 0.8), 'wine cabinet': ('shelf', 0.8, 0.45, 1.6, 0.8),
    'bookshelf': ('shelf', 0.8, 0.3, 1.8, 1.0), 'bookcase': ('shelf', 0.8, 0.3, 1.8, 1.0),
    'shelf': ('shelf', 0.8, 0.28, 1.2, 0.8), 'armoire': ('shelf', 1.0, 0.6, 2.0, 0.9),
    'closet': ('shelf', 1.2, 0.6, 2.0, 0.6),
    'lamp': ('lamp', 0.35, 0.35, 0.6, 0.85), 'table lamp': ('lamp', 0.3, 0.3, 0.5, 0.85),
    'bedside lamp': ('lamp', 0.25, 0.25, 0.45, 0.85),
    'houseplant': ('plant', 0.5, 0.5, 1.0, 0.8), 'plant': ('plant', 0.5, 0.5, 1.0, 0.7),
    'carpet': ('rug', 2.0, 1.4, 0.02, 0.45), 'floor mat': ('rug', 1.2, 0.8, 0.02, 0.4),
    'mat': ('rug', 1.2, 0.8, 0.02, 0.35),
}

_det = None
_mat = None


def detector():
    global _det
    if _det is None:
        from ultralytics import YOLOE
        _det = YOLOE(os.path.join(MODELS, 'yoloe-11l-seg-pf.pt'))
    return _det


def matting():
    global _mat
    if _mat is None:
        from rembg import new_session
        _mat = new_session('isnet-general-use')
    return _mat


def find_objects(img):
    """Run the detector. Returns a list of dicts with label, score, box and a full-size mask."""
    det = detector()
    res = det.predict(img, conf=0.25, verbose=False, retina_masks=True)[0]
    W, H = img.size
    out = []
    if res.masks is None:
        return out
    masks = res.masks.data.cpu().numpy() > 0.5
    for i, b in enumerate(res.boxes):
        label = det.names[int(b.cls)]
        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0]]
        m = masks[i]
        if m.shape != (H, W):
            m = np.array(Image.fromarray(m).resize((W, H), Image.NEAREST))
        out.append(dict(label=label, conf=float(b.conf), box=[x1, y1, x2, y2], mask=m))
    return out


def score_objects(objs, W, H):
    """Score furniture objects. Higher = better single target for a 3D model."""
    scored = []
    for o in objs:
        if o['label'] not in FURNITURE:
            continue
        x1, y1, x2, y2 = o['box']
        area = o['mask'].sum() / float(W * H)
        if area < 0.012:
            continue
        cx, cy = (x1 + x2) / 2 / W, (y1 + y2) / 2 / H
        central = 1 - min(1.0, np.hypot(cx - 0.5, cy - 0.55) / 0.7)
        # how many sides of the box touch the image border (a cropped object is a bad 3D source)
        edge = 3
        cut = sum([x1 < edge, y1 < edge, x2 > W - edge, y2 > H - edge])
        complete = [1.0, 0.6, 0.3, 0.15, 0.1][cut]
        # how much of this object's box is covered by OTHER things standing in front of it.
        # things that sit inside the object (books on a shelf) count as part of it instead.
        box_area = max(1.0, (x2 - x1) * (y2 - y1))
        xa, ya, xb, yb = int(x1), int(y1), int(x2) + 1, int(y2) + 1
        own = o['mask'][ya:yb, xa:xb]
        blocked = np.zeros_like(own)
        for p in objs:
            if p is o:
                continue
            px1, py1, px2, py2 = p['box']
            ix = max(0.0, min(x2, px2) - max(x1, px1)) * max(0.0, min(y2, py2) - max(y1, py1))
            if ix <= 0:
                continue
            p_area = max(1.0, (px2 - px1) * (py2 - py1))
            if ix / p_area > 0.85 and p_area < 0.5 * box_area:
                continue                      # sits inside: part of the object
            if p_area > 4 * box_area:
                continue                      # a huge thing behind (wall, floor, carpet)
            blocked |= p['mask'][ya:yb, xa:xb]
        occlusion = float((blocked & ~own).sum() / box_area)
        fill = o['mask'].sum() / box_area
        weight = FURNITURE[o['label']][4]
        s = (o['conf'] * np.sqrt(area) * (0.55 + 0.45 * central) * complete
             * (1 - min(0.85, occlusion * 1.8)) * weight)
        scored.append((float(s), dict(o, area=float(area), cut_sides=int(cut), fill=float(fill), occlusion=occlusion)))
    scored.sort(key=lambda t: -t[0])
    return scored


def cut_out(img, obj, pad=0.06):
    """Clean cutout of one object: matting model for the edge, instance mask to drop the neighbours."""
    from rembg import remove
    W, H = img.size
    x1, y1, x2, y2 = obj['box']
    px, py = (x2 - x1) * pad, (y2 - y1) * pad
    cx1, cy1 = int(max(0, x1 - px)), int(max(0, y1 - py))
    cx2, cy2 = int(min(W, x2 + px)), int(min(H, y2 + py))
    crop = img.crop((cx1, cy1, cx2, cy2)).convert('RGB')
    inst = Image.fromarray((obj['mask'][cy1:cy2, cx1:cx2] * 255).astype(np.uint8))
    matte = remove(crop, session=matting(), only_mask=True)
    grow = max(3, int(0.012 * max(crop.size)) | 1)
    near = np.asarray(inst.filter(ImageFilter.MaxFilter(grow * 2 + 1)).filter(ImageFilter.GaussianBlur(grow / 2)), dtype=np.float32) / 255
    a_matte = np.asarray(matte, dtype=np.float32) / 255
    a_inst = np.asarray(inst.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
    inside = a_inst > 0.5
    agree = (a_matte[inside] > 0.5).mean() if inside.any() else 0.0
    # if the matting model looked at something else, trust the instance mask instead
    alpha = a_matte * near if agree > 0.6 else a_inst
    # never lose the solid inside of the object
    core = np.asarray(inst.filter(ImageFilter.MinFilter(grow * 2 + 1)), dtype=np.float32) / 255
    alpha = np.maximum(alpha, core * 0.98) if agree > 0.6 else alpha
    rgba = np.dstack([np.asarray(crop), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA'), [cx1, cy1, cx2, cy2], float(agree)


def to_hex(c):
    return '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in c)


def read_materials(cutout):
    """Main colours (k-means in Lab) and a tileable swatch from the calmest solid patch."""
    from skimage import color as skc
    from scipy.cluster.vq import kmeans2
    arr = np.asarray(cutout)
    rgb, a = arr[..., :3].astype(np.float32), arr[..., 3]
    solid = a > 230
    px = rgb[solid]
    if len(px) < 200:
        return dict(colors=[], swatch=None)
    if len(px) > 40000:
        px = px[np.random.RandomState(0).choice(len(px), 40000, replace=False)]
    lab = skc.rgb2lab(px[None] / 255.0)[0]
    k = 4
    cent, lab_idx = kmeans2(lab, k, minit='++', seed=1)
    counts = np.bincount(lab_idx, minlength=k).astype(float)
    order = np.argsort(-counts)
    colors = []
    for i in order:
        if counts[i] / counts.sum() < 0.06:
            continue
        c = skc.lab2rgb(cent[i][None, None])[0, 0] * 255
        colors.append(dict(hex=to_hex(c), share=round(counts[i] / counts.sum(), 3), lightness=round(float(cent[i][0]), 1)))
    # swatch: slide a window over the object, keep the fully-solid window with the least edges
    Hc, Wc = a.shape
    size = max(24, int(min(Hc, Wc) * 0.22))
    gray = rgb.mean(axis=2)
    gy, gx = np.gradient(gray)
    edges = np.hypot(gx, gy)
    integ = lambda m: np.pad(m, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    Is, Ie, Ig = integ(solid.astype(np.float64)), integ(edges), integ(gray.astype(np.float64))
    win = lambda I, y, x: I[y + size, x + size] - I[y, x + size] - I[y + size, x] + I[y, x]
    best, where = None, None
    step = max(4, size // 6)
    for y in range(0, Hc - size, step):
        for x in range(0, Wc - size, step):
            if win(Is, y, x) < size * size * 0.995:
                continue
            e = win(Ie, y, x) / (size * size)
            # prefer the dominant colour: stay close to the main cluster's lightness
            mean_gray = win(Ig, y, x) / (size * size)
            cost = e + 0.02 * abs(mean_gray - (colors[0]['lightness'] * 2.55 if colors else mean_gray))
            if best is None or cost < best:
                best, where = cost, (x, y)
    swatch = None
    if where:
        x, y = where
        sw = Image.fromarray(arr[y:y + size, x:x + size, :3]).resize((256, 256), Image.LANCZOS)
        swatch = make_tileable(sw)
    return dict(colors=colors, swatch=swatch, swatch_box=[*where, size] if where else None)


def make_tileable(im):
    """Flatten slow lighting changes, then mirror-tile so the edges always match."""
    arr = np.asarray(im).astype(np.float32)
    low = np.asarray(im.filter(ImageFilter.GaussianBlur(40))).astype(np.float32)
    flat = np.clip(arr - low + low.mean(axis=(0, 1)), 0, 255).astype(np.uint8)
    t = Image.fromarray(flat)
    out = Image.new('RGB', (512, 512))
    out.paste(t, (0, 0)); out.paste(t.transpose(Image.FLIP_LEFT_RIGHT), (256, 0))
    out.paste(t.transpose(Image.FLIP_TOP_BOTTOM), (0, 256)); out.paste(t.transpose(Image.ROTATE_180), (256, 256))
    return out


def process(path_or_img, out_dir, pin_id, meta=None):
    img = path_or_img if isinstance(path_or_img, Image.Image) else Image.open(path_or_img)
    img = img.convert('RGB')
    W, H = img.size
    objs = find_objects(img)
    scored = score_objects(objs, W, H)
    d = os.path.join(out_dir, pin_id)
    os.makedirs(d, exist_ok=True)
    result = dict(id=pin_id, image=dict(width=W, height=H), target=None, alternates=[], **(meta or {}))
    if not scored:
        result['reason'] = 'no placeable furniture found'
        json.dump(result, open(os.path.join(d, 'target.json'), 'w'), indent=1)
        return result

    def describe(s, o):
        t, w, dp, h, _ = FURNITURE[o['label']]
        x1, y1, x2, y2 = o['box']
        return dict(label=o['label'], type=t, score=round(s, 4), confidence=round(o['conf'], 3),
                    box=[round(x1 / W, 4), round(y1 / H, 4), round(x2 / W, 4), round(y2 / H, 4)],
                    size_m=dict(w=w, d=dp, h=h), cut_sides=o['cut_sides'], occlusion=round(o['occlusion'], 3), area=round(o['area'], 4))

    s, o = scored[0]
    cutout, crop_box, agree = cut_out(img, o)
    cutout.save(os.path.join(d, 'cutout.png'))
    mats = read_materials(cutout)
    if mats.get('swatch') is not None:
        mats['swatch'].save(os.path.join(d, 'swatch.png'))
    tgt = describe(s, o)
    tgt.update(cutout='cutout.png', crop_box=crop_box, matte_agreement=round(agree, 3),
               colors=mats['colors'], swatch='swatch.png' if mats.get('swatch') is not None else None,
               ready_for_3d=bool(o['cut_sides'] == 0 and o['occlusion'] < 0.15))
    result['target'] = tgt
    result['alternates'] = [describe(s2, o2) for s2, o2 in scored[1:6]]
    json.dump(result, open(os.path.join(d, 'target.json'), 'w'), indent=1)
    return result


def fetch_board(board):
    """Public Pinterest board -> list of (id, image url, description, link). Same feed the app uses."""
    user, name = board.strip('/').split('/')[-2:]
    url = f'https://widgets.pinterest.com/v3/pidgets/boards/{user}/{name}/pins/'
    data = json.load(urllib.request.urlopen(url, timeout=30))
    pins = data['data']['pins']
    return [(p['id'], p['images']['564x']['url'], p.get('description', ''), p.get('link')) for p in pins]


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('image', nargs='?')
    ap.add_argument('--images'); ap.add_argument('--board')
    ap.add_argument('--out', default=os.path.join(HERE, 'out', 'pins'))
    ap.add_argument('--id')
    a = ap.parse_args()
    jobs = []
    if a.board:
        import io
        for pid, url, desc, link in fetch_board(a.board):
            im = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read()))
            jobs.append((im, pid, dict(source=url, description=desc, link=link)))
    elif a.images:
        for f in sorted(glob.glob(os.path.join(a.images, '*'))):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                jobs.append((f, os.path.splitext(os.path.basename(f))[0][:40], dict(source=os.path.basename(f))))
    elif a.image:
        jobs.append((a.image, a.id or os.path.splitext(os.path.basename(a.image))[0][:40], dict(source=os.path.basename(a.image))))
    else:
        ap.error('give an image, --images or --board')
    index = []
    for src, pid, meta in jobs:
        r = process(src, a.out, pid, meta)
        t = r['target']
        print(pid[:38].ljust(40), (t['label'] + ' -> ' + t['type'] + ('  ready' if t['ready_for_3d'] else '  partial')) if t else 'none')
        index.append(r)
    json.dump(index, open(os.path.join(a.out, 'targets.json'), 'w'), indent=1)
