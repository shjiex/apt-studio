// Lighting the person describes: daylight through the window, lights fixed to the room, and lamp bulbs.
// Two numbers describe a light the way a bulb's box does:
//   Kelvin (K)  how warm or cool the light looks. 2700 K is a warm bulb, 4000 K neutral, 6500 K daylight.
//   lumens (lm) how much light it gives. About 800 lm is an old 60 W bulb.

export const DEFAULT_LIGHTING = {
  daylight: true,
  windowFaces: 'south', // the compass direction the back wall (the top of the plan) looks toward
  latitude: 47.6, // where the home is, in degrees north of the equator (Seattle)
  month: new Date().getMonth() + 1, // 1 to 12; starts on this month
  hour: 14, // time of day in sun time: 12 is when the sun is highest
  fixed: [], // lights fixed to the room: ceiling lights, wall lights, strips
  lamps: { on: true, kelvin: 2700, lumens: 450, dim: 100 }, // the bulb a lamp has until you change it
  lampBulbs: {}, // a lamp's own bulb, by the lamp piece's id
};

// A new fixed light of one kind, with typical numbers for that kind.
export function newFixedLight(kind) {
  const lumens = { ceiling: 1200, wall: 500, strip: 900 }[kind];
  return { id: `light-${Date.now()}`, kind, on: true, kelvin: 3000, lumens, dim: 100, spot: 4, wall: 'back', along: 0.5 };
}

// The bulb in one lamp: its own if it has one, otherwise the shared lamp bulb.
export function bulbOf(piece, lighting) {
  return { ...lighting.lamps, ...(lighting.lampBulbs[piece.id] || {}) };
}

// Where a fixed light's bulbs are, as a list of [x, y, z] points.
// A ceiling light is one bulb at its spot. A wall light is one bulb 1.8 m up.
// A strip runs along the top of a wall and is drawn as four small bulbs.
export function fixedLightPoints(light, room) {
  if (light.kind === 'ceiling') {
    const { x, z } = spotPosition(light.spot, room);
    return [[x, room.height - 0.12, z]];
  }
  const height = light.kind === 'strip' ? room.height - 0.1 : 1.8;
  // t runs from 0 to 1 along the wall: left to right, or back to front on a side wall
  const at = (t) => {
    if (light.wall === 'back') return [(t - 0.5) * room.width, height, -room.length / 2 + 0.1];
    if (light.wall === 'front') return [(t - 0.5) * room.width, height, room.length / 2 - 0.1];
    if (light.wall === 'left') return [-room.width / 2 + 0.1, height, (t - 0.5) * room.length];
    return [room.width / 2 - 0.1, height, (t - 0.5) * room.length];
  };
  return light.kind === 'strip' ? [0.2, 0.4, 0.6, 0.8].map(at) : [at(light.along)];
}

// Places to pick from, with their latitude: how far north (+) or south (-) of the equator, in degrees.
export const PLACES = [
  { name: 'Seattle', latitude: 47.6 },
  { name: 'San Francisco', latitude: 37.8 },
  { name: 'Los Angeles', latitude: 34.1 },
  { name: 'Chicago', latitude: 41.9 },
  { name: 'New York', latitude: 40.7 },
  { name: 'Miami', latitude: 25.8 },
  { name: 'London', latitude: 51.5 },
  { name: 'Tokyo', latitude: 35.7 },
  { name: 'Singapore', latitude: 1.4 },
  { name: 'Sydney', latitude: -33.9 },
];

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

// Where the sun is in the sky for a place, a month and a time of day.
// These are the standard formulas from solar geometry, for the middle of the month:
//   declination  how far the sun is north or south of the equator on that date
//                (+23.44 degrees in late June, -23.44 in late December)
//   hour angle   how far the earth has turned since noon: 15 degrees an hour
//   elevation    how high the sun stands above the horizon
//   azimuth      its compass direction: 0 north, 90 east, 180 south, 270 west
// The time is sun time: 12:00 is when the sun is highest. A clock can differ
// from that by an hour or more (summer time, where you are in your time zone).
export function sunPosition(latitude, month, hour) {
  const dayOfYear = Math.round((month - 0.5) * 30.4); // the middle of the month
  const declination = toRadians(23.44 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81))));
  const where = toRadians(latitude);
  const hourAngle = toRadians(15 * (hour - 12));
  const elevation = Math.asin(
    Math.sin(where) * Math.sin(declination) + Math.cos(where) * Math.cos(declination) * Math.cos(hourAngle)
  );
  const azimuth =
    Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(where) - Math.tan(declination) * Math.cos(where)) + Math.PI;
  // Sunrise and sunset: the hour angle at which the elevation is zero.
  const edge = -Math.tan(where) * Math.tan(declination);
  const halfDay = edge <= -1 ? 12 : edge >= 1 ? 0 : toDegrees(Math.acos(edge)) / 15; // hours from noon; 12 = never sets, 0 = never rises
  return { elevation: toDegrees(elevation), azimuth: toDegrees(azimuth), rise: 12 - halfDay, set: 12 + halfDay };
}

// 7.5 -> "7:30"
export function formatHour(hour) {
  const minutes = Math.round(hour * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

// The sun as the room sees it, for the lighting the person described.
// Returns: up (is it day), direct (does it shine in through the window), the
// direction from the room toward the sun, its colour in Kelvin, its strength
// 0 to 1, its elevation in degrees, and the hours it rises and sets.
const FACING = { north: 0, east: 90, south: 180, west: 270 };
export function getSun(lighting) {
  const { elevation, azimuth, rise, set } = sunPosition(lighting.latitude, lighting.month, lighting.hour);
  if (!lighting.daylight || elevation <= 0) {
    return { up: false, direct: false, direction: [0, 1, 0], kelvin: 5500, strength: 0, elevation, rise, set };
  }
  // the sun's angle from "straight out of the window": 0 is dead ahead, positive is to the right
  const off = ((azimuth - FACING[lighting.windowFaces] + 540) % 360) - 180;
  const a = toRadians(off);
  const e = toRadians(elevation);
  return {
    up: true,
    direct: Math.abs(off) < 80,
    // the window is on the back wall, so "straight out" is -z and "to the right" is +x
    direction: [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)],
    // warm near the horizon (2300 K), full daylight (5500 K) from about 35 degrees up
    kelvin: Math.round((2300 + 3200 * Math.min(1, elevation / 35)) / 100) * 100,
    strength: Math.sqrt(Math.sin(e)),
    elevation,
    rise,
    set,
  };
}

// Does the sun shine on at least one window right now? A window gets sun when the
// sun stands on the outer side of its wall (and not almost edge-on to it).
const OUTWARD = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0] }; // [x, z]
export function sunOnWindows(sun, windows) {
  if (!sun.up) return false;
  return windows.some((win) => {
    const [x, z] = OUTWARD[win.wall];
    return sun.direction[0] * x + sun.direction[2] * z > 0.17;
  });
}

// How much light a bulb gives right now: its lumens, turned down by its dimmer (0 to 100 percent).
// A bulb saved before dimmers existed has no `dim`, which counts as 100.
export function lightOutput(bulb) {
  return (bulb.lumens * (bulb.dim === undefined ? 100 : bulb.dim)) / 100;
}

// The colour of a light from its Kelvin number, as 'rgb(r, g, b)'.
// This is a well-known curve fit (by Tanner Helland) to how a glowing body changes
// colour with temperature: red is full below 6600 K, blue fades out toward 1900 K.
export function kelvinToColor(kelvin) {
  const t = kelvin / 100;
  const clamp = (value) => Math.round(Math.min(255, Math.max(0, value)));
  const red = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
  const green = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return `rgb(${clamp(red)}, ${clamp(green)}, ${clamp(blue)})`;
}

// The everyday name for a Kelvin number.
export function nameOfKelvin(kelvin) {
  if (kelvin < 2500) return 'Candle warm';
  if (kelvin < 3300) return 'Warm white';
  if (kelvin < 4500) return 'Neutral white';
  if (kelvin < 5500) return 'Cool white';
  return 'Daylight';
}

// The ceiling light can hang in one of nine spots: a 3 by 3 grid over the room,
// numbered 0 to 8 from the back left to the front right. Returns its x and z.
export function spotPosition(spot, room) {
  const across = (spot % 3) - 1; // -1 left, 0 middle, 1 right
  const deep = Math.floor(spot / 3) - 1; // -1 back, 0 middle, 1 front
  return { x: across * room.width * 0.3, z: deep * room.length * 0.3 };
}

// three.js measures a point light in candela. A bulb that shines evenly all round
// gives lumens / (4 x pi) candela. The live view is not a calibrated camera, so one
// more number (EXPOSURE) brings bulbs into the same range as the view's daylight.
const EXPOSURE = 0.12;
export function bulbIntensity(lumens) {
  return (lumens / (4 * Math.PI)) * EXPOSURE;
}
