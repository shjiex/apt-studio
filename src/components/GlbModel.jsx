import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { loadModel } from '../lib/models.js';
import { asset } from '../lib/paths.js';

const MUTED = new THREE.Color('#D8D7D2');

// Shows a real 3D model file, stretched to the size given in metres.
// It stands on the floor (y = 0) and is centred on its footprint.
// muted is true for furniture that was already in the room: it is drawn grey.
function GlbModel({ url, size, muted, tint, finish, onReady, onFail }) {
  const [model, setModel] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    loadModel(asset(url))
      .then((scene) => {
        if (!isCurrent) return;

        // Each piece gets its own copy, so two sofas can stand in two places.
        const copy = scene.clone(true);

        copy.traverse((part) => {
          if (!part.isMesh) return;
          part.castShadow = true;
          part.receiveShadow = true;
          // A colour or finish chosen in the piece panel. The material is copied first,
          // because the same loaded model is shared by every piece of this kind.
          if (!muted && (tint || finish)) {
            part.material = part.material.clone();
            // The colour is multiplied into the model's own picture, so wood grain
            // and fabric weave stay visible under the new colour.
            if (tint) part.material.color = new THREE.Color(tint);
            if (finish === 'matte') {
              part.material.roughness = 1;
              part.material.metalness = 0;
            }
            if (finish === 'gloss') {
              part.material.roughness = 0.2;
              part.material.metalness = 0;
            }
            if (finish === 'metal') {
              part.material.roughness = 0.35;
              part.material.metalness = 0.9;
            }
          }
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
  }, [url, muted, tint, finish, size.w, size.d, size.h]);

  if (!model) return null;
  return <primitive object={model} />;
}

export default GlbModel;
