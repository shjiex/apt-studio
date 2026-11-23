// The furniture a person can try in their room.
// Sizes are in metres: w is across, d is front to back, h is height.

export const CATEGORY_COLORS = {
  desks: '#FFE03A',
  tables: '#FFE03A',
  seating: '#FF7AD1',
  storage: '#8F6BFF',
  lighting: '#FF9A3D',
  beds: '#7DEBC2',
  plants: '#1FA85A',
  rugs: '#A9623F',
  decor: '#A9623F',
  wall: '#5BB8FF',
};

// Every piece you can add. Sizes are in metres: w is the width, d the depth, h the height.
//   baseType  an entry that is another piece in a different size ('bed_king' is a 'bed').
//             It uses that piece's 3D model, stretched to its own size, and counts as
//             that kind of furniture for the fit check and the room score.
//   model     the 3D model file. An entry without one is built from simple shapes
//             (see SimpleModel in components/FurnitureModel.jsx).
//   tone      the piece's own colour, when it should not take its group's tile colour.
//   wall      true for things that hang on a wall. `hang` is how high the middle of
//             the piece is above the floor.
export const CATALOG = [
  // Sofas and armchairs
  { type: 'sofa', name: 'Sofa', category: 'seating', size: { w: 1.8, d: 0.85, h: 0.8 }, image: '/furniture/sofa.png', model: '/models/catalog/sofa.glb' },
  { type: 'sofa_loveseat', baseType: 'sofa', name: 'Loveseat', category: 'seating', size: { w: 1.4, d: 0.85, h: 0.8 }, image: '/furniture/sofa.png', model: '/models/catalog/sofa.glb' },
  { type: 'sofa_long', baseType: 'sofa', name: 'Three seat sofa', category: 'seating', size: { w: 2.3, d: 0.92, h: 0.8 }, image: '/furniture/sofa.png', model: '/models/catalog/sofa.glb' },
  { type: 'armchair', name: 'Armchair', category: 'seating', size: { w: 0.82, d: 0.83, h: 0.86 }, image: '/furniture/armchair.png', model: '/models/catalog/armchair.glb' },
  { type: 'pouf', name: 'Pouf', category: 'seating', size: { w: 0.5, d: 0.5, h: 0.4 }, image: '/furniture/pouf.png', model: '/models/catalog/pouf.glb' },
  { type: 'bench', name: 'Bench', category: 'seating', size: { w: 1.2, d: 0.38, h: 0.45 }, image: '/furniture/bench.png' },
  // Beds and nightstands
  { type: 'bed_single', baseType: 'bed', name: 'Single bed', category: 'beds', size: { w: 0.95, d: 2.0, h: 0.9 }, image: '/furniture/bed.png', model: '/models/catalog/bed.glb' },
  { type: 'bed_double', baseType: 'bed', name: 'Double bed', category: 'beds', size: { w: 1.4, d: 2.0, h: 0.95 }, image: '/furniture/bed.png', model: '/models/catalog/bed.glb' },
  { type: 'bed', name: 'Queen bed', category: 'beds', size: { w: 1.5, d: 2.05, h: 0.95 }, image: '/furniture/bed.png', model: '/models/catalog/bed.glb' },
  { type: 'bed_king', baseType: 'bed', name: 'King bed', category: 'beds', size: { w: 1.95, d: 2.05, h: 0.95 }, image: '/furniture/bed.png', model: '/models/catalog/bed.glb' },
  { type: 'nightstand', name: 'Nightstand', category: 'beds', size: { w: 0.45, d: 0.43, h: 0.55 }, image: '/furniture/nightstand.png', model: '/models/catalog/nightstand.glb' },
  { type: 'nightstand_narrow', baseType: 'nightstand', name: 'Narrow nightstand', category: 'beds', size: { w: 0.32, d: 0.35, h: 0.6 }, image: '/furniture/nightstand.png', model: '/models/catalog/nightstand.glb' },
  { type: 'nightstand_wide', baseType: 'nightstand', name: 'Wide nightstand', category: 'beds', size: { w: 0.65, d: 0.43, h: 0.48 }, image: '/furniture/nightstand.png', model: '/models/catalog/nightstand.glb' },
  // Tables and chairs
  { type: 'dining_table', name: 'Dining table', category: 'tables', size: { w: 1.4, d: 0.8, h: 0.75 }, image: '/furniture/dining_table.png', model: '/models/catalog/dining_table.glb' },
  { type: 'dining_table_small', baseType: 'dining_table', name: 'Small dining table', category: 'tables', size: { w: 0.8, d: 0.8, h: 0.75 }, image: '/furniture/dining_table.png', model: '/models/catalog/dining_table.glb' },
  { type: 'dining_table_long', baseType: 'dining_table', name: 'Long dining table', category: 'tables', size: { w: 1.9, d: 0.9, h: 0.75 }, image: '/furniture/dining_table.png', model: '/models/catalog/dining_table.glb' },
  { type: 'round_table', name: 'Round table', category: 'tables', size: { w: 1.0, d: 1.0, h: 0.75 }, image: '/furniture/round_table.png' },
  { type: 'dining_chair', name: 'Dining chair', category: 'tables', size: { w: 0.43, d: 0.47, h: 0.84 }, image: '/furniture/dining_chair.png', model: '/models/catalog/dining_chair.glb' },
  { type: 'bar_stool', name: 'Bar stool', category: 'tables', size: { w: 0.38, d: 0.38, h: 0.75 }, image: '/furniture/bar_stool.png' },
  { type: 'coffee_table', name: 'Coffee table', category: 'tables', size: { w: 1.0, d: 0.55, h: 0.4 }, image: '/furniture/coffee_table.png', model: '/models/catalog/coffee_table.glb' },
  { type: 'side_table', name: 'Side table', category: 'tables', size: { w: 0.45, d: 0.45, h: 0.5 }, image: '/furniture/side_table.png', model: '/models/catalog/side_table.glb' },
  // Desks
  { type: 'desk', name: 'Compact desk', category: 'desks', size: { w: 1.15, d: 0.58, h: 0.75 }, image: '/furniture/desk.png', model: '/models/catalog/desk.glb' },
  { type: 'desk_wide', baseType: 'desk', name: 'Wide desk', category: 'desks', size: { w: 1.5, d: 0.7, h: 0.75 }, image: '/furniture/desk.png', model: '/models/catalog/desk.glb' },
  { type: 'chair', name: 'Desk chair', category: 'desks', size: { w: 0.46, d: 0.5, h: 0.9 }, image: '/furniture/chair.png', model: '/models/catalog/chair.glb' },
  // Storage
  { type: 'shelf', name: 'Open shelf', category: 'storage', size: { w: 0.8, d: 0.3, h: 1.6 }, image: '/furniture/shelf.png', model: '/models/catalog/shelf.glb' },
  { type: 'shelf_tall', baseType: 'shelf', name: 'Tall shelf', category: 'storage', size: { w: 0.8, d: 0.3, h: 2.0 }, image: '/furniture/shelf.png', model: '/models/catalog/shelf.glb' },
  { type: 'bookcase', name: 'Low bookcase', category: 'storage', size: { w: 1.0, d: 0.32, h: 0.9 }, image: '/furniture/bookcase.png', model: '/models/catalog/bookcase.glb' },
  { type: 'dresser', name: 'Dresser', category: 'storage', size: { w: 1.2, d: 0.48, h: 0.8 }, image: '/furniture/dresser.png', model: '/models/catalog/dresser.glb' },
  { type: 'sideboard', baseType: 'dresser', name: 'Sideboard', category: 'storage', size: { w: 1.6, d: 0.45, h: 0.75 }, image: '/furniture/dresser.png', model: '/models/catalog/dresser.glb' },
  { type: 'wardrobe', name: 'Wardrobe', category: 'storage', size: { w: 1.02, d: 0.6, h: 1.9 }, image: '/furniture/wardrobe.png', model: '/models/catalog/wardrobe.glb' },
  { type: 'wardrobe_wide', baseType: 'wardrobe', name: 'Wide wardrobe', category: 'storage', size: { w: 1.5, d: 0.6, h: 2.0 }, image: '/furniture/wardrobe.png', model: '/models/catalog/wardrobe.glb' },
  { type: 'tv_stand', name: 'TV stand', category: 'storage', size: { w: 1.5, d: 0.42, h: 0.5 }, image: '/furniture/tv_stand.png', model: '/models/catalog/tv_stand.glb' },
  // Lighting
  { type: 'lamp', name: 'Floor lamp', category: 'lighting', size: { w: 0.4, d: 0.4, h: 1.6 }, image: '/furniture/lamp.png', model: '/models/catalog/lamp.glb' },
  { type: 'table_lamp', name: 'Table lamp', category: 'lighting', size: { w: 0.26, d: 0.26, h: 0.45 }, image: '/furniture/table_lamp.png' },
  { type: 'wall_lamp', name: 'Wall lamp', category: 'lighting', wall: true, hang: 1.7, size: { w: 0.16, d: 0.2, h: 0.28 }, image: '/furniture/wall_lamp.png' },
  // Rugs
  { type: 'rug', name: 'Rug', category: 'rugs', size: { w: 2.0, d: 1.3, h: 0.02 }, image: '/furniture/rug.png', model: '/models/catalog/rug.glb' },
  { type: 'rug_small', baseType: 'rug', name: 'Small rug', category: 'rugs', size: { w: 1.2, d: 0.8, h: 0.02 }, image: '/furniture/rug.png', model: '/models/catalog/rug.glb' },
  { type: 'rug_large', baseType: 'rug', name: 'Large rug', category: 'rugs', size: { w: 2.9, d: 2.0, h: 0.02 }, image: '/furniture/rug.png', model: '/models/catalog/rug.glb' },
  { type: 'rug_runner', baseType: 'rug', name: 'Runner', category: 'rugs', size: { w: 0.7, d: 2.2, h: 0.02 }, image: '/furniture/rug.png', model: '/models/catalog/rug.glb' },
  { type: 'round_rug', name: 'Round rug', category: 'rugs', size: { w: 1.6, d: 1.6, h: 0.02 }, image: '/furniture/round_rug.png' },
  // Plants
  { type: 'plant_small', baseType: 'plant', name: 'Small plant', category: 'plants', size: { w: 0.25, d: 0.25, h: 0.5 }, image: '/furniture/plant.png', model: '/models/catalog/plant.glb' },
  { type: 'plant', name: 'Plant', category: 'plants', size: { w: 0.4, d: 0.4, h: 1.0 }, image: '/furniture/plant.png', model: '/models/catalog/plant.glb' },
  { type: 'plant_tall', baseType: 'plant', name: 'Tall plant', category: 'plants', size: { w: 0.6, d: 0.6, h: 1.7 }, image: '/furniture/plant.png', model: '/models/catalog/plant.glb' },
  // Wall decor: these hang on a wall. `hang` is how high their middle is above the floor, in metres.
  { type: 'wall_art', name: 'Framed print', category: 'wall', wall: true, hang: 1.5, size: { w: 0.5, d: 0.03, h: 0.7 }, tone: '#FFE03A', image: '/furniture/wall_art.png' },
  { type: 'wall_canvas', name: 'Large canvas', category: 'wall', wall: true, hang: 1.5, size: { w: 1.2, d: 0.04, h: 0.8 }, tone: '#8F6BFF', image: '/furniture/wall_canvas.png' },
  { type: 'wall_gallery', name: 'Set of three prints', category: 'wall', wall: true, hang: 1.5, size: { w: 1.5, d: 0.03, h: 0.6 }, tone: '#FFE03A', image: '/furniture/wall_gallery.png' },
  { type: 'round_mirror', name: 'Round mirror', category: 'wall', wall: true, hang: 1.5, size: { w: 0.7, d: 0.03, h: 0.7 }, image: '/furniture/round_mirror.png' },
  { type: 'wall_mirror', name: 'Wall mirror', category: 'wall', wall: true, hang: 1.3, size: { w: 0.5, d: 0.03, h: 1.3 }, image: '/furniture/wall_mirror.png' },
  { type: 'wall_shelf', name: 'Wall shelf', category: 'wall', wall: true, hang: 1.4, size: { w: 0.8, d: 0.2, h: 0.24 }, image: '/furniture/wall_shelf.png' },
  { type: 'wall_clock', name: 'Wall clock', category: 'wall', wall: true, hang: 1.9, size: { w: 0.35, d: 0.04, h: 0.35 }, image: '/furniture/wall_clock.png' },
  { type: 'wall_tv', name: 'Wall TV', category: 'wall', wall: true, hang: 1.3, size: { w: 1.25, d: 0.06, h: 0.72 }, image: '/furniture/wall_tv.png' },
  { type: 'curtains', name: 'Curtains', category: 'wall', wall: true, hang: 1.2, size: { w: 1.8, d: 0.1, h: 2.3 }, tone: '#F4F3EF', image: '/furniture/curtains.png' },
  // Decor that stands on the floor
  { type: 'floor_mirror', name: 'Floor mirror', category: 'decor', size: { w: 0.6, d: 0.39, h: 1.69 }, image: '/furniture/floor_mirror.png', model: '/models/catalog/floor_mirror.glb' },
];

// Which tile colour each kind of furniture uses.
export const TYPE_CATEGORY = {
  desk: 'desks',
  chair: 'seating',
  sofa: 'seating',
  shelf: 'storage',
  lamp: 'lighting',
  bed: 'beds',
  plant: 'plants',
  rug: 'rugs',
};

// Furniture made from moodboard images. It is filled in when the app starts,
// from the list the 3D pipeline writes to /models/pins/manifest.json.
const pinItems = [];

// Turn that list into catalog entries and remember them.
// A plain name for a colour such as '#02233f' ('Navy'). Used to tell apart pieces
// that would otherwise share one name: four couches become a navy, a grey, a black
// and a charcoal couch.
function colourName(hex) {
  const number = parseInt(hex.slice(1), 16);
  const r = ((number >> 16) & 255) / 255;
  const g = ((number >> 8) & 255) / 255;
  const b = (number & 255) / 255;
  const most = Math.max(r, g, b);
  const least = Math.min(r, g, b);
  const light = (most + least) / 2; // 0 is black, 1 is white
  const strength = most - least; // 0 is a grey, more is a stronger colour
  if (light < 0.08) return 'Black';
  if (strength < 0.12) {
    if (light < 0.3) return 'Charcoal';
    return light < 0.75 ? 'Grey' : 'White';
  }
  // the hue as an angle round the colour wheel, 0 to 360
  let hue = 0;
  if (most === r) hue = ((g - b) / strength) % 6;
  else if (most === g) hue = (b - r) / strength + 2;
  else hue = (r - g) / strength + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 20 || hue >= 340) return light < 0.3 ? 'Maroon' : 'Red';
  if (hue < 45) return light < 0.4 ? 'Brown' : 'Orange';
  if (hue < 70) return light < 0.4 ? 'Olive' : 'Yellow';
  if (hue < 165) return 'Green';
  if (hue < 195) return 'Teal';
  if (hue < 260) return light < 0.25 ? 'Navy' : 'Blue';
  if (hue < 300) return 'Purple';
  return 'Pink';
}

export function setPinItems(manifest) {
  pinItems.length = 0;
  // Names that more than one piece has ("couch"). Those pieces get a colour in front,
  // so no name is shown twice in the furniture list.
  const timesUsed = {};
  manifest.forEach((entry) => {
    timesUsed[entry.name] = (timesUsed[entry.name] || 0) + 1;
  });
  const taken = new Set();
  const nameFor = (entry) => {
    if (timesUsed[entry.name] < 2) return entry.name;
    // try the piece's colours in order, and take the first name nobody has yet
    const tries = (entry.colors || []).map((hex) => `${colourName(hex)} ${entry.name}`);
    const free = tries.find((name) => !taken.has(name.toLowerCase()));
    if (free) return free;
    let count = 2;
    while (taken.has(`${entry.name} ${count}`)) count += 1;
    return `${entry.name} ${count}`;
  };
  manifest.forEach((entry) => {
    const name = nameFor(entry);
    taken.add(name.toLowerCase());
    pinItems.push({
      type: `pin-${entry.id}`,
      baseType: entry.type,
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      category: TYPE_CATEGORY[entry.type],
      size: entry.size,
      image: `/models/pins/${entry.thumb}`,
      model: `/models/pins/${entry.model}`,
      pinId: entry.id,
      box: entry.source.box, // where the object is in the image: [left, top, right, bottom] from 0 to 1
      outline: entry.source.outline, // the object's shape in the image, as corner points from 0 to 1
      link: entry.source.link, // the page the Pin came from, for a later shop list
      backend: entry.backend,
    });
  });
  return [...pinItems];
}

// The size of one piece in the room, in metres: its own size if the person changed
// it in the piece panel, or else the size its catalog entry gives.
export function sizeOf(piece) {
  return piece.size || getItem(piece.type).size;
}

// Does this type hang on a wall (a print, a mirror, a wall shelf)?
export function hangsOnWall(type) {
  const item = getItem(type);
  return Boolean(item && item.wall);
}

// What kind of furniture a type is: 'bed' for 'bed_king', and 'desk' for 'desk'.
export function kindOfType(type) {
  const item = getItem(type);
  return (item && item.baseType) || type;
}

// Look up one catalog entry by its type, e.g. getItem('desk').
export function getItem(type) {
  return CATALOG.find((item) => item.type === type) || pinItems.find((item) => item.type === type);
}
