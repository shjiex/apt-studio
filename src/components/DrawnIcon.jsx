// The hand-drawn furniture icons from the Figma file (the components named
// Drawn/<name> in the "Stickers and drawn icons" frame). Each one is a few pencil
// strokes on a 96 by 96 square. They are used for the furniture groups, where a
// drawn sofa or bed says more than a plain symbol.
//
// Each entry is the list of strokes (SVG path data) of one icon, copied from Figma.
const STROKES = {
  sofa: [
    'M14 46C14 38 20 34 26 36C28 28 36 26 48 26C60 26 68 28 70 36C76 34 82 38 82 46C82 54 80 60 80 66C60 68 36 68 16 66C16 60 14 54 14 46Z',
    'M26 50C40 48 56 48 70 50',
    'M26 36C26 42 26 46 26 50',
    'M70 36C70 42 70 46 70 50',
    'M22 67L21 76',
    'M74 67L75 76',
  ],
  bed: [
    'M14 26C14 42 14 56 15 70',
    'M15 50C36 48 62 48 84 50C84 56 84 60 83 64C62 63 38 63 15 65',
    'M20 49C20 42 24 39 32 40C38 40 41 44 40 49',
    'M83 44C84 54 84 64 84 74',
    'M15 70V76',
    'M48 49C47 54 48 59 48 63',
  ],
  table: ['M18 36C18 28 78 28 78 36C78 44 18 44 18 36Z', 'M30 42C28 56 26 70 24 82', 'M66 42C68 56 70 70 72 82', 'M48 44C48 58 48 70 48 80'],
  desk: [
    'M12 34C30 32 62 33 85 35',
    'M18 35C18 52 17 68 18 82',
    'M79 36C80 52 79 68 80 82',
    'M56 36C56 44 56 50 57 56C64 57 72 56 80 56',
    'M65 46C67 45.5 70 46 72 46',
  ],
  shelf: [
    'M26 12C25 36 26 62 26 84',
    'M70 12C71 36 70 62 71 84',
    'M26 14C40 13 56 13 70 14',
    'M26 36C40 35 56 36 70 36',
    'M26 58C40 57 56 58 70 58',
    'M26 82C40 81 56 82 70 82',
    'M34 36V22',
    'M40 36V20',
    'M46 36L49 23',
    'M50 58C50 52 50 48 51 46C56 46 60 46 64 46C64 50 64 54 64 58',
  ],
  'floor-lamp': ['M38 10C44 9 52 9 58 10L66 36C54 38 42 38 30 36L38 10Z', 'M48 37C49 54 48 70 49 84', 'M32 86C42 84 54 84 64 86'],
  plant: [
    'M32 58C44 56 54 56 66 58L62 84C52 86 46 86 36 84L32 58Z',
    'M48 57C48 46 47 36 48 24',
    'M48 40C38 38 30 30 28 20C38 20 46 28 48 40Z',
    'M48 34C58 32 66 24 68 14C58 14 50 22 48 34Z',
    'M48 50C40 50 34 46 30 40',
  ],
  rug: [
    'M14 30C36 28 62 28 84 30C85 42 84 56 84 68C62 70 36 70 14 68C13 56 14 42 14 30Z',
    'M22 37C40 36 58 36 76 37C76 46 76 54 76 61C58 62 40 62 22 61V37Z',
    'M14 34L9 33',
    'M14 44H8',
    'M14 54L8 55',
    'M14 64L9 65',
    'M84 34L89 33',
    'M84 44H90',
    'M84 54L90 55',
    'M84 64L89 65',
  ],
  frame: [
    'M18 20C38 18 60 18 80 20C81 38 80 58 80 76C60 78 38 78 18 76C17 58 18 38 18 20Z',
    'M24 68C32 56 38 48 42 44C48 52 52 58 56 62C60 56 64 52 68 48C72 54 74 62 76 68',
    'M60 32C63 30 66 32 66 35C66 38 63 40 60 38C57 36 57 33 60 32Z',
    'M48 19V12',
  ],
};

// Is there a drawn icon with this name?
export function hasDrawnIcon(name) {
  return Boolean(STROKES[name]);
}

// One drawn icon. `size` is its width and height in pixels. In Figma the pencil line
// is 3 units wide on the 96 unit square; at 18 px that would be half a pixel, so the
// line is drawn 6 units wide here and comes out a little over one pixel.
function DrawnIcon({ name, size = 18 }) {
  return (
    <svg
      className="icon icon--drawn"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {STROKES[name].map((stroke) => (
        <path key={stroke} d={stroke} />
      ))}
    </svg>
  );
}

export default DrawnIcon;
