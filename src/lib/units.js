// Lengths are kept in metres everywhere in the app. These functions only change
// how a length is written on screen, and read back what a person types.
// `units` is 'metric' (metres and centimetres) or 'imperial' (feet and inches).

const INCH = 0.0254; // metres in one inch
const FOOT = 0.3048; // metres in one foot

// A room-sized length: "3.6 m", or "11 ft 10 in".
export function formatLength(metres, units) {
  if (units !== 'imperial') return `${Number(metres.toFixed(2))} m`;
  const inches = Math.round(metres / INCH);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return rest === 0 ? `${feet} ft` : `${feet} ft ${rest} in`;
}

// A furniture-sized length: "150 cm", or "59 in".
export function formatSmall(metres, units) {
  return `${toSmall(metres, units)} ${smallUnit(units)}`;
}

// The small unit's name, to print after a number field.
export function smallUnit(units) {
  return units === 'imperial' ? 'in' : 'cm';
}

// Metres to whole centimetres, or to inches with one decimal at most (59.5).
export function toSmall(metres, units) {
  if (units === 'imperial') return Math.round((metres / INCH) * 2) / 2;
  return Math.round(metres * 100);
}

// What a person typed in the small unit, back to metres.
export function fromSmall(value, units) {
  return units === 'imperial' ? value * INCH : value / 100;
}

// The name of the big unit, to print after a number field for a room-sized length.
export function bigUnit(units) {
  return units === 'imperial' ? 'ft' : 'm';
}

// A room-sized length as the number put in a field: metres to the centimetre, or
// feet with one decimal (11.8).
export function toBig(metres, units) {
  if (units === 'imperial') return Math.round((metres / FOOT) * 10) / 10;
  return Math.round(metres * 100) / 100;
}

// What a person typed in the big unit, back to metres (to the centimetre).
export function fromBig(value, units) {
  return Math.round((units === 'imperial' ? value * FOOT : value) * 100) / 100;
}

// A floor area: "10.8 m²", or "116 ft²".
export function formatArea(squareMetres, units) {
  if (units !== 'imperial') return `${Number(squareMetres.toFixed(1))} m²`;
  return `${Math.round(squareMetres / (FOOT * FOOT))} ft²`;
}

// A room's two sides: "3.6 × 3 m", or "11 ft 10 in × 9 ft 10 in".
export function formatRoomSize(room, units) {
  if (units !== 'imperial') return `${room.width} × ${room.length} m`;
  return `${formatLength(room.width, units)} × ${formatLength(room.length, units)}`;
}
