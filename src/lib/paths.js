// Files in the public folder (models, textures, photos) are written in the code as "/models/x.glb".
// That works when the app is served from the top of a site. On GitHub Pages the app lives in a
// folder ("/apt-studio/"), so the folder name has to go in front. asset() adds it.
// Full web addresses, such as Pinterest images, are left alone.
//
// The hosted demo keeps its 3D model files at other addresses (it cannot serve .glb files next to
// the page). demoFiles.json lists them, and only the demo build (VITE_DEMO) looks there.
import demoFiles from '../demoFiles.json';

export function asset(path) {
  if (path.startsWith('http')) return path;
  if (import.meta.env.VITE_DEMO && demoFiles[path]) return demoFiles[path];
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}
