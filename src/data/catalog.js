// The furniture a person can try in their room.
// Sizes are in metres: w is across, d is front to back, h is height.

export const CATEGORY_COLORS = {
  desks: '#FFE03A',
  seating: '#FF7AD1',
  storage: '#8F6BFF',
  lighting: '#FF9A3D',
  beds: '#7DEBC2',
  plants: '#1FA85A',
  decor: '#A9623F',
};

export const CATALOG = [
  { type: 'desk', name: 'Compact desk', category: 'desks', size: { w: 1.15, d: 0.58, h: 0.75 }, image: '/furniture/desk.png', model: '/models/catalog/desk.glb' },
  { type: 'chair', name: 'Desk chair', category: 'seating', size: { w: 0.46, d: 0.5, h: 0.9 }, image: '/furniture/chair.png', model: '/models/catalog/chair.glb' },
  { type: 'shelf', name: 'Open shelf', category: 'storage', size: { w: 0.8, d: 0.3, h: 1.6 }, image: '/furniture/shelf.png', model: '/models/catalog/shelf.glb' },
  { type: 'lamp', name: 'Floor lamp', category: 'lighting', size: { w: 0.4, d: 0.4, h: 1.6 }, image: '/furniture/lamp.png', model: '/models/catalog/lamp.glb' },
  { type: 'bed', name: 'Bed', category: 'beds', size: { w: 1.5, d: 2.05, h: 0.95 }, image: '/furniture/bed.png', model: '/models/catalog/bed.glb' },
  { type: 'plant', name: 'Plant', category: 'plants', size: { w: 0.4, d: 0.4, h: 1.0 }, image: '/furniture/plant.png', model: '/models/catalog/plant.glb' },
  { type: 'rug', name: 'Rug', category: 'decor', size: { w: 2.0, d: 1.3, h: 0.02 }, image: '/furniture/rug.png', model: '/models/catalog/rug.glb' },
  { type: 'sofa', name: 'Sofa', category: 'seating', size: { w: 1.8, d: 0.85, h: 0.8 }, image: '/furniture/sofa.png', model: '/models/catalog/sofa.glb' },
  { type: 'armchair', name: 'Armchair', category: 'seating', size: { w: 0.82, d: 0.83, h: 0.86 }, image: '/furniture/armchair.png', model: '/models/catalog/armchair.glb' },
  { type: 'nightstand', name: 'Nightstand', category: 'storage', size: { w: 0.45, d: 0.43, h: 0.55 }, image: '/furniture/nightstand.png', model: '/models/catalog/nightstand.glb' },
  { type: 'dresser', name: 'Dresser', category: 'storage', size: { w: 1.2, d: 0.48, h: 0.8 }, image: '/furniture/dresser.png', model: '/models/catalog/dresser.glb' },
  { type: 'bookcase', name: 'Low bookcase', category: 'storage', size: { w: 1.0, d: 0.32, h: 0.9 }, image: '/furniture/bookcase.png', model: '/models/catalog/bookcase.glb' },
  { type: 'coffee_table', name: 'Coffee table', category: 'desks', size: { w: 1.0, d: 0.55, h: 0.4 }, image: '/furniture/coffee_table.png', model: '/models/catalog/coffee_table.glb' },
  { type: 'dining_table', name: 'Dining table', category: 'desks', size: { w: 1.4, d: 0.8, h: 0.75 }, image: '/furniture/dining_table.png', model: '/models/catalog/dining_table.glb' },
  { type: 'dining_chair', name: 'Dining chair', category: 'seating', size: { w: 0.43, d: 0.47, h: 0.84 }, image: '/furniture/dining_chair.png', model: '/models/catalog/dining_chair.glb' },
  { type: 'tv_stand', name: 'TV stand', category: 'storage', size: { w: 1.5, d: 0.42, h: 0.5 }, image: '/furniture/tv_stand.png', model: '/models/catalog/tv_stand.glb' },
  { type: 'wardrobe', name: 'Wardrobe', category: 'storage', size: { w: 1.02, d: 0.6, h: 1.9 }, image: '/furniture/wardrobe.png', model: '/models/catalog/wardrobe.glb' },
  { type: 'side_table', name: 'Side table', category: 'desks', size: { w: 0.45, d: 0.45, h: 0.5 }, image: '/furniture/side_table.png', model: '/models/catalog/side_table.glb' },
  { type: 'floor_mirror', name: 'Floor mirror', category: 'decor', size: { w: 0.6, d: 0.39, h: 1.69 }, image: '/furniture/floor_mirror.png', model: '/models/catalog/floor_mirror.glb' },
  { type: 'pouf', name: 'Pouf', category: 'seating', size: { w: 0.5, d: 0.5, h: 0.4 }, image: '/furniture/pouf.png', model: '/models/catalog/pouf.glb' },
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
  rug: 'decor',
};

// Furniture made from moodboard images. It is filled in when the app starts,
// from the list the 3D pipeline writes to /models/pins/manifest.json.
const pinItems = [];

// Turn that list into catalog entries and remember them.
export function setPinItems(manifest) {
  pinItems.length = 0;
  manifest.forEach((entry) => {
    pinItems.push({
      type: `pin-${entry.id}`,
      baseType: entry.type,
      name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
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

// Look up one catalog entry by its type, e.g. getItem('desk').
export function getItem(type) {
  return CATALOG.find((item) => item.type === type) || pinItems.find((item) => item.type === type);
}
