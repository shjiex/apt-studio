"""photo2inventory.py  -  a photo of your room in, a list of the furniture in it out.

Where pin2object.py picks ONE object from an inspiration image, this lists EVERY piece of
furniture it can see in a photo of the room you already have, so the app can put them in the
plan as "already yours".

What it can and cannot tell:
  - what each piece is (sofa, chair, rug ...) and how sure the finder is
  - a typical size for that kind of piece (NOT measured from the photo)
  - it can NOT tell where the piece stands in the room: the app adds it and you drag it into place

usage:  python3 photo2inventory.py room.jpg --out ../public/inventory
output: <out>/room.json and <out>/room_found.jpg (the photo with each piece framed and numbered)
"""
import argparse, json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pin2object import find_objects, whole_outline, FURNITURE


def overlap(a, b):
    """How much two boxes overlap, from 0 (not at all) to 1 (the same box)."""
    x1, y1, x2, y2 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0


def outline_of(mask, W, H):
    """The shape of a piece as a short list of corner points, each from 0 to 1 across the photo."""
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    biggest = max(contours, key=cv2.contourArea)
    simple = cv2.approxPolyDP(biggest, 0.006 * cv2.arcLength(biggest, True), True)[:, 0, :]
    return [[round(float(x) / W, 4), round(float(y) / H, 4)] for x, y in simple]


def list_furniture(image, min_confidence=0.4, min_area=0.008):
    W, H = image.size
    found = []
    objs = find_objects(image)
    for o in sorted(objs, key=lambda o: -o['conf']):
        if o['label'] not in FURNITURE or o['conf'] < min_confidence:
            continue
        if o['mask'].sum() / float(W * H) < min_area:
            continue
        kind, w, d, h, _ = FURNITURE[o['label']]
        # the finder sometimes reports the same piece twice (as "couch" and "loveseat"): keep the surer one
        if any(f['type'] == kind and overlap(f['_box'], o['box']) > 0.6 for f in found):
            continue
        x1, y1, x2, y2 = o['box']
        found.append(dict(label=o['label'], type=kind, confidence=round(o['conf'], 2),
                          sure=bool(o['conf'] >= 0.7),
                          box=[round(x1 / W, 4), round(y1 / H, 4), round(x2 / W, 4), round(y2 / H, 4)],
                          # the whole piece, hidden parts filled in: a rug under a table is still one whole rug
                          outline=whole_outline(o, objs, W, H, kind)[0] or outline_of(o['mask'], W, H),
                          seen_outline=outline_of(o['mask'], W, H),
                          size=dict(w=w, d=d, h=h), _box=o['box']))
    for n, f in enumerate(found, 1):
        f['number'] = n
    return found


def run(path, out):
    os.makedirs(out, exist_ok=True)
    image = Image.open(path).convert('RGB')
    found = list_furniture(image)
    picture = image.copy(); draw = ImageDraw.Draw(picture)
    for f in found:
        x1, y1, x2, y2 = f['_box']
        draw.rectangle([x1, y1, x2, y2], outline=(255, 255, 255), width=3)
        draw.rectangle([x1, y1, x1 + 22 + 7 * len(f['label']), y1 + 16], fill=(255, 255, 255))
        draw.text((x1 + 4, y1 + 2), f"{f['number']} {f['label']}", fill=(20, 20, 20))
    name = os.path.splitext(os.path.basename(path))[0]
    picture.save(os.path.join(out, 'room_found.jpg'), quality=88)
    image.save(os.path.join(out, 'room.jpg'), quality=88)
    result = dict(photo='room.jpg', source=os.path.basename(path), width=image.size[0], height=image.size[1],
                  pieces=[{k: v for k, v in f.items() if not k.startswith('_')} for f in found])
    json.dump(result, open(os.path.join(out, 'room.json'), 'w'), indent=1)
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('photo'); ap.add_argument('--out', default=os.path.join(HERE, '..', 'public', 'inventory'))
    a = ap.parse_args()
    r = run(a.photo, a.out)
    for p in r['pieces']:
        print(p['number'], p['label'].ljust(14), '->', p['type'].ljust(6), p['confidence'], 'sure' if p['sure'] else 'not sure')
