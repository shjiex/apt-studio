"""make_sample_plan.py  -  draws the sample floor plan the app ships with.

Real estate plans belong to whoever drew them, so the app's sample is drawn here instead:
a one-bedroom flat with walls, doors (a leaf and its swing), windows (two thin lines),
a few fixtures and printed sizes. Because every size is known, it also checks plan2room.py.

usage: python3 make_sample_plan.py sample-plan.png
"""
import sys
import numpy as np
import cv2

PX = 60                      # pixels per metre
OUT_WALL, IN_WALL = 0.20, 0.15
LEFT, TOP = 60, 70           # where the inside of the flat starts on the picture
INK = (25, 25, 25)

# rooms: name, left, top, width, length (metres, inside the outer walls)
ROOMS = [
    ('Bedroom', 0.00, 0.00, 3.60, 3.00),
    ('Bathroom', 0.00, 3.15, 2.20, 3.05),
    ('Hall', 2.35, 3.15, 1.25, 3.05),
    ('Living room', 3.75, 0.00, 4.25, 6.20),
]
WIDE, TALL = 8.00, 6.20


def px(x, y):
    return int(round(LEFT + x * PX)), int(round(TOP + y * PX))


def wall(img, x0, y0, x1, y1):
    cv2.rectangle(img, px(x0, y0), px(x1, y1), INK, -1)


def opening(img, x0, y0, x1, y1):
    """Rub out a piece of wall."""
    cv2.rectangle(img, px(x0, y0), px(x1, y1), (255, 255, 255), -1)


def door(img, hinge, along, swing, size=0.85):
    """A door: the leaf standing open and the quarter circle it swings through."""
    hx, hy = hinge
    tip = (hx + swing[0] * size, hy + swing[1] * size)
    cv2.line(img, px(hx, hy), px(*tip), INK, 2, cv2.LINE_AA)
    start = np.degrees(np.arctan2(swing[1], swing[0])); end = np.degrees(np.arctan2(along[1], along[0]))
    if end - start > 180: end -= 360
    if start - end > 180: end += 360
    cv2.ellipse(img, px(hx, hy), (int(size * PX), int(size * PX)), 0, start, end, INK, 1, cv2.LINE_AA)


def window(img, x0, y0, x1, y1):
    """A window: the wall is rubbed out and two thin lines run along the gap."""
    opening(img, x0, y0, x1, y1)
    cv2.rectangle(img, px(x0, y0), px(x1, y1), INK, 1)
    if x1 - x0 > y1 - y0:
        mid = (y0 + y1) / 2; cv2.line(img, px(x0, mid), px(x1, mid), INK, 1)
    else:
        mid = (x0 + x1) / 2; cv2.line(img, px(mid, y0), px(mid, y1), INK, 1)


def draw():
    img = np.full((TOP * 2 + int(TALL * PX) + 40, LEFT * 2 + int(WIDE * PX), 3), 255, np.uint8)
    o = OUT_WALL
    wall(img, -o, -o, WIDE + o, 0); wall(img, -o, TALL, WIDE + o, TALL + o)          # top, bottom
    wall(img, -o, -o, 0, TALL + o); wall(img, WIDE, -o, WIDE + o, TALL + o)          # left, right
    wall(img, 3.60, 0, 3.75, TALL)                                                   # bedroom | living room
    wall(img, 0, 3.00, 3.60, 3.15)                                                   # bedroom / bathroom and hall
    wall(img, 2.20, 3.15, 2.35, TALL)                                                # bathroom | hall
    # doors
    opening(img, 2.55, 3.00, 3.40, 3.15); door(img, (2.55, 3.00), (1, 0), (0, -1))   # hall -> bedroom
    opening(img, 2.20, 3.50, 2.35, 4.35); door(img, (2.20, 3.50), (0, 1), (-1, 0))   # hall -> bathroom
    opening(img, 3.60, 4.70, 3.75, 5.55); door(img, (3.75, 4.70), (0, 1), (1, 0))    # hall -> living room
    opening(img, 2.55, TALL, 3.40, TALL + o); door(img, (2.55, TALL), (1, 0), (0, -1))   # front door
    # windows
    window(img, 1.80, -o, 3.00, 0); window(img, 4.60, -o, 6.40, 0)
    window(img, WIDE, 1.00, WIDE + o, 2.80); window(img, WIDE, 3.60, WIDE + o, 5.20)
    window(img, -o, 4.30, 0, 5.00)
    # fixtures: bath, basin, toilet, kitchen counter with a hob and a sink
    cv2.rectangle(img, px(0.08, 5.40), px(1.75, 6.12), INK, 1); cv2.ellipse(img, px(0.92, 5.76), (42, 15), 0, 0, 360, INK, 1, cv2.LINE_AA)
    cv2.rectangle(img, px(0.08, 3.30), px(0.60, 3.85), INK, 1); cv2.circle(img, px(0.34, 3.58), 10, INK, 1, cv2.LINE_AA)
    cv2.ellipse(img, px(1.45, 3.50), (11, 15), 0, 0, 360, INK, 1, cv2.LINE_AA)
    cv2.rectangle(img, px(5.20, 5.58), px(7.92, 6.12), INK, 1)
    for cx in (5.55, 5.95): cv2.circle(img, px(cx, 5.85), 8, INK, 1, cv2.LINE_AA)
    cv2.rectangle(img, px(6.90, 5.68), px(7.60, 6.04), INK, 1)
    # names and sizes
    for name, x, y, w, l in ROOMS:
        cx, cy = px(x + w / 2, y + l / 2)
        for i, text in enumerate((name, f'{w:.2f} x {l:.2f} m')):
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            cv2.putText(img, text, (cx - tw // 2, cy - 4 + i * 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (60, 60, 60), 1, cv2.LINE_AA)
    cv2.putText(img, 'Sample flat  -  drawn for Apt Studio, not a real listing', (LEFT - 12, TOP * 2 + int(TALL * PX) + 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (110, 110, 110), 1, cv2.LINE_AA)
    return img


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'sample-plan.png'
    cv2.imwrite(out, draw())
    print('wrote', out, [(n, w, l) for n, _, _, w, l in ROOMS])
