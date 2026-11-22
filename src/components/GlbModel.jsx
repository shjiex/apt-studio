import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { loadModel } from '../lib/models.js';

const MUTED = new THREE.Color('#D8D7D2');

// Shows a real 3D model file, stretched to the size given in metres.
// It stands on the floor (y = 0) and is centred on its footprint.
// muted is true for furniture that was already in the room: it is drawn grey.
function GlbModel({ url, size, muted, onReady, onFail }) {
  const [model, setModel] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    loadModel(url)
      .then((scene) => {
        if (!isCurrent) return;

        // Each piece gets its own copy, so two sofas can stand in two places.
        const copy = scene.clone(true);

        copy.traverse((part) => {
          if (!part.isMesh) return;
          part.castShadow = true;
          part.receiveShadow = true;
          if (muted) {
            part.material = part.material.clone();
            part.material.map = null;
            part.material.emissiveMap = null;
            part.material.emissive = new THREE.Color('#000000');
            part.material.color = MUTED;
          }
        });

        // Measure the model, then scale and move it to fit the catalog size.
        const box = new THREE.Box3().setFromObject(copy);
        const measured = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const scale = new THREE.Vector3(size.w / measured.x, size.h / measured.y, size.d / measured.z);
        copy.scale.copy(scale);
        copy.position.set(-centre.x * scale.x, -box.min.y * scale.y, -centre.z * scale.z);

        setModel(copy);
        onReady();
      })
      .catch(() => {
        if (isCurrent) onFail();
      });

    return () => {
      isCurrent = false;
    };
    // onReady and onFail are left out on purpose: they are new functions on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, muted, size.w, size.d, size.h]);

  if (!model) return null;
  return <primitive object={model} />;
}

export default GlbModel;
