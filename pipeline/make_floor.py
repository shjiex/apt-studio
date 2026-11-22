"""make_floor.py - paints a wood plank floor that repeats without visible seams.

Writes three images a 3D material needs:
  colour  (what the wood looks like), normal (tiny bumps and the grooves between planks),
  roughness (where it is shinier or duller).
One image covers 2.4 m x 2.4 m of floor.

usage: python3 make_floor.py <out dir> [name] [r g b]
"""
import sys, os
import numpy as np
from PIL import Image

N = 1024            # pixels
ROWS = 16           # planks across the image (0.15 m each)
PLANK_LEN = 512     # 1.2 m


def smooth_noise(rng, sx, sy):
    """Noise that wraps around at the edges (made in frequency space), stretched by sx, sy."""
    white = rng.standard_normal((N, N))
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
    filt = np.exp(-((fx * sx) ** 2 + (fy * sy) ** 2) * 2 * np.pi ** 2)
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * filt))
    return (out - out.mean()) / (out.std() + 1e-9)


def make(out, name='oak', base=(0.70, 0.54, 0.36), seed=3):
    rng = np.random.default_rng(seed)
    h = N // ROWS
    grain_long = smooth_noise(rng, 60, 2.2)     # long streaks along the plank
    grain_fine = smooth_noise(rng, 14, 0.9)
    waves = smooth_noise(rng, 90, 9)
    tone = np.zeros((N, N)); height = np.zeros((N, N)); grain = np.zeros((N, N))
    yy, xx = np.mgrid[0:N, 0:N]
    for r in range(ROWS):
        y0 = r * h
        shift = int(rng.integers(0, PLANK_LEN // 64)) * 64
        for k in range(N // PLANK_LEN):
            x0 = (shift + k * PLANK_LEN) % N
            cols = (np.arange(PLANK_LEN) + x0) % N
            # every plank gets its own slice of the grain, so neighbours never match
            dx, dy = int(rng.integers(0, N)), int(rng.integers(0, N))
            gy = (np.arange(h) + y0 + dy) % N
            gx = (np.arange(PLANK_LEN) + dx) % N
            g = 0.65 * grain_long[np.ix_(gy, gx)] + 0.35 * grain_fine[np.ix_(gy, gx)]
            rings = np.sin(6.0 * waves[np.ix_(gy, gx)] + 9.0 * (np.arange(h)[:, None] / h))
            g = 0.7 * g + 0.3 * rings
            grain[np.ix_(np.arange(y0, y0 + h), cols)] = g
            tone[np.ix_(np.arange(y0, y0 + h), cols)] = rng.normal(0, 0.06)
            # groove at the plank's edges
            edge = np.minimum(np.minimum(np.arange(h)[:, None], h - 1 - np.arange(h)[:, None]),
                              np.minimum(np.arange(PLANK_LEN)[None, :], PLANK_LEN - 1 - np.arange(PLANK_LEN)[None, :]))
            height[np.ix_(np.arange(y0, y0 + h), cols)] = np.clip(edge / 2.5, 0, 1)
    base = np.array(base)
    light = 1.0 + tone[..., None] + 0.085 * grain[..., None]
    colour = base[None, None, :] * light
    colour *= (0.74 + 0.26 * height[..., None])                      # dark line in the grooves
    colour[..., 2] *= 1 - 0.04 * grain                               # grain is slightly warmer
    colour = np.clip(colour, 0, 1)
    bump = height * 1.0 + 0.05 * grain
    gx = (np.roll(bump, -1, 1) - np.roll(bump, 1, 1)) * 1.6
    gy = (np.roll(bump, -1, 0) - np.roll(bump, 1, 0)) * 1.6
    nrm = np.dstack([-gx, gy, np.ones_like(gx)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    rough = np.clip(0.52 + 0.08 * grain + 0.25 * (1 - height), 0, 1)
    os.makedirs(out, exist_ok=True)
    Image.fromarray((colour * 255).astype(np.uint8)).save(os.path.join(out, f'floor-{name}-colour.jpg'), quality=88)
    Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save(os.path.join(out, f'floor-{name}-normal.jpg'), quality=92)
    Image.fromarray((rough * 255).astype(np.uint8)).save(os.path.join(out, f'floor-{name}-roughness.jpg'), quality=88)
    print('floor', name, [os.path.getsize(os.path.join(out, f'floor-{name}-{k}.jpg')) // 1024 for k in ('colour', 'normal', 'roughness')], 'KB')


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out/textures'
    name = sys.argv[2] if len(sys.argv) > 2 else 'oak'
    base = tuple(float(v) for v in sys.argv[3:6]) if len(sys.argv) > 5 else (0.70, 0.54, 0.36)
    make(out, name, base)
