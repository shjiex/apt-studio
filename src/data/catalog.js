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
