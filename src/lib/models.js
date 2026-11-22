// Loads 3D model files (.glb) and remembers them, so a model that is used
// five times in the room is only downloaded once.

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Demo build only: the demo's frame may not let scripts fetch the pictures packed inside a
// model. Without createImageBitmap the loader uses plain <img> elements, which are allowed.
if (import.meta.env.VITE_DEMO) window.createImageBitmap = undefined;

const loader = new GLTFLoader();
const loaded = new Map(); // url -> Promise of the model

// Returns a Promise that gives the model's 3D scene.
export function loadModel(url) {
  if (!loaded.has(url)) {
    const promise = new Promise((resolve, reject) => {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
    loaded.set(url, promise);
  }
  return loaded.get(url);
}
