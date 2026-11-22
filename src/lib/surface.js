// What the floor and the walls of a room are made of. No React in this file.
// The floor is the built-in oak or a photo of your own floor. The walls are a
// paint colour or a photo (wallpaper, brick, tiles).

export const DEFAULT_SURFACES = {
  // kind: 'oak' or 'photo'. photo: the picture as a data URL. aspect: its width divided by
  // its height. span: how many metres of real floor the photo shows from left to right.
  floor: { kind: 'oak', photo: null, aspect: 1, span: 1.5 },
  // kind: 'paint' or 'photo'.
  wall: { kind: 'paint', color: '#F4F3EF', photo: null, aspect: 1, span: 1.5 },
};

export const WALL_PAINTS = [
  { name: 'Warm white', color: '#F4F3EF' },
  { name: 'Soft grey', color: '#D6D6D2' },
  { name: 'Sand', color: '#E4D8C4' },
  { name: 'Sage', color: '#C3CFBA' },
  { name: 'Dusty blue', color: '#BFCBD9' },
  { name: 'Clay', color: '#D6B29B' },
  { name: 'Charcoal', color: '#4A4A48' },
  { name: 'Cream', color: '#EFE6D2' },
  { name: 'Blush', color: '#E8CFC6' },
  { name: 'Terracotta', color: '#C4795B' },
  { name: 'Olive', color: '#8A9070' },
  { name: 'Navy', color: '#2F3E55' },
];

// Read a picture file the person chose. Returns a promise of an <img> element.
// Its address (image.src) is a temporary one; call URL.revokeObjectURL on it when done.
export function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('That file is not a picture this browser can read.'));
    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(file);
  });
}

// Turn a straightened picture (a canvas, see straighten.js) into one that can
// repeat across a floor or wall, by evening out its light.
// A photo is almost always brighter on one side (a window, a flash). Repeated
// across a floor, that shows up as stripes. We work out "how bright is it around
// here" from a few big areas, then divide every pixel by it, so every part of
// the picture ends up equally bright.
// Returns { photo, aspect }: the picture as a JPEG data URL, and its width divided by its height.
export function canvasToTile(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const pixels = ctx.getImageData(0, 0, width, height);

  // Cut the picture into a few big areas (3 across) and average each one. The areas
  // are far bigger than a tile or a board, so the averages follow the light, not the pattern.
  const across = 3;
  const down = Math.max(2, Math.round((across * height) / width));
  const sums = new Float64Array(across * down * 3);
  const counts = new Float64Array(across * down);
  for (let y = 0; y < height; y += 1) {
    const row = Math.min(Math.floor((y * down) / height), down - 1);
    for (let x = 0; x < width; x += 1) {
      const area = row * across + Math.min(Math.floor((x * across) / width), across - 1);
      const at = (y * width + x) * 4;
      sums[area * 3] += pixels.data[at];
      sums[area * 3 + 1] += pixels.data[at + 1];
      sums[area * 3 + 2] += pixels.data[at + 2];
      counts[area] += 1;
    }
  }
  // Put those averages in a tiny picture, one pixel per area, and stretch it back up
  // smoothly: that is "how bright is it around here" for every pixel.
  const small = document.createElement('canvas');
  small.width = across;
  small.height = down;
  const smallCtx = small.getContext('2d');
  const smallPixels = smallCtx.createImageData(across, down);
  for (let area = 0; area < across * down; area += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      smallPixels.data[area * 4 + channel] = sums[area * 3 + channel] / counts[area];
    }
    smallPixels.data[area * 4 + 3] = 255;
  }
  smallCtx.putImageData(smallPixels, 0, 0);
  const blurred = document.createElement('canvas');
  blurred.width = width;
  blurred.height = height;
  const blurredCtx = blurred.getContext('2d', { willReadFrequently: true });
  blurredCtx.imageSmoothingQuality = 'high';
  blurredCtx.drawImage(small, 0, 0, width, height);
  const light = blurredCtx.getImageData(0, 0, width, height).data;

  // The average colour of the whole picture, one number each for red, green and blue.
  const average = [0, 0, 0];
  for (let i = 0; i < light.length; i += 4) {
    average[0] += light[i];
    average[1] += light[i + 1];
    average[2] += light[i + 2];
  }
  const count = light.length / 4;
  average.forEach((sum, channel) => (average[channel] = sum / count));

  // pixel × (average ÷ brightness of its area). Uint8ClampedArray keeps the result in 0 to 255.
  for (let i = 0; i < pixels.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      pixels.data[i + channel] = (pixels.data[i + channel] * average[channel]) / Math.max(light[i + channel], 8);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return { photo: canvas.toDataURL('image/jpeg', 0.85), aspect: width / height };
}
