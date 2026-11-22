// Straightens a photo that was taken at an angle. No React in this file.
//
// You mark four corners of a rectangle on the photo (a block of tiles, a rug).
// Seen at an angle that rectangle looks like a lopsided four-sided shape. This
// file works out the mapping between the flat rectangle and that shape, then
// builds a new picture by asking, for every pixel of the flat rectangle,
// "where is this spot in the photo?" and copying the colour found there.

// Solve a set of linear equations by elimination, the way it is done by hand:
// use one row to remove an unknown from the rows below it, then work back up.
// `rows` is a list of rows; each row is its coefficients followed by its right-hand side.
function solveEquations(rows) {
  const count = rows.length;
  for (let column = 0; column < count; column += 1) {
    // Put the row with the biggest number in this column on top (keeps the arithmetic steady).
    let best = column;
    for (let row = column + 1; row < count; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[best][column])) best = row;
    }
    [rows[column], rows[best]] = [rows[best], rows[column]];
    // Remove this unknown from every row below.
    for (let row = column + 1; row < count; row += 1) {
      const factor = rows[row][column] / rows[column][column];
      for (let k = column; k <= count; k += 1) rows[row][k] -= factor * rows[column][k];
    }
  }
  // Work back up from the last row, filling in each unknown.
  const answer = new Array(count).fill(0);
  for (let row = count - 1; row >= 0; row -= 1) {
    let sum = rows[row][count];
    for (let k = row + 1; k < count; k += 1) sum -= rows[row][k] * answer[k];
    answer[row] = sum / rows[row][row];
  }
  return answer;
}

// The mapping from a flat point (u, v) to a photo point (x, y) has eight numbers:
//   x = (a·u + b·v + c) / (g·u + h·v + 1)
//   y = (d·u + e·v + f) / (g·u + h·v + 1)
// The division is what makes far things smaller, as a camera does.
// Each corner pair (u, v) -> (x, y) gives two equations, so four corners give
// the eight equations needed. Returns [a, b, c, d, e, f, g, h].
export function findMapping(flatCorners, photoCorners) {
  const rows = [];
  flatCorners.forEach(([u, v], index) => {
    const [x, y] = photoCorners[index];
    rows.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    rows.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  });
  return solveEquations(rows);
}

const LONG_SIDE = 768; // the longest side of the straightened picture, in pixels

// Make the straightened picture.
// image: the photo. corners: the four marked corners as fractions of the photo
// (0 to 1), in the order top left, top right, bottom right, bottom left.
// shape: the real rectangle's width divided by its depth.
// Returns a canvas holding the flat rectangle.
export function straightenPhoto(image, corners, shape) {
  const width = shape >= 1 ? LONG_SIDE : Math.round(LONG_SIDE * shape);
  const height = shape >= 1 ? Math.round(LONG_SIDE / shape) : LONG_SIDE;

  // Read the photo's pixels (made smaller first if it is very large).
  const shrink = Math.min(1, 1600 / Math.max(image.width, image.height));
  const source = document.createElement('canvas');
  source.width = Math.round(image.width * shrink);
  source.height = Math.round(image.height * shrink);
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0, source.width, source.height);
  const from = sourceCtx.getImageData(0, 0, source.width, source.height).data;

  const flat = [[0, 0], [width, 0], [width, height], [0, height]];
  const marked = corners.map(([x, y]) => [x * (source.width - 1), y * (source.height - 1)]);
  const [a, b, c, d, e, f, g, h] = findMapping(flat, marked);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(width, height);

  for (let v = 0; v < height; v += 1) {
    for (let u = 0; u < width; u += 1) {
      // Where this flat pixel is in the photo.
      const depth = g * u + h * v + 1;
      const x = Math.min(Math.max((a * u + b * v + c) / depth, 0), source.width - 1.001);
      const y = Math.min(Math.max((d * u + e * v + f) / depth, 0), source.height - 1.001);
      // It usually falls between four photo pixels. Blend them by how close each one is.
      const left = Math.floor(x);
      const top = Math.floor(y);
      const alongX = x - left;
      const alongY = y - top;
      const at = (top * source.width + left) * 4;
      const below = at + source.width * 4;
      const target = (v * width + u) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const upper = from[at + channel] * (1 - alongX) + from[at + 4 + channel] * alongX;
        const lower = from[below + channel] * (1 - alongX) + from[below + 4 + channel] * alongX;
        out.data[target + channel] = upper * (1 - alongY) + lower * alongY;
      }
      out.data[target + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
