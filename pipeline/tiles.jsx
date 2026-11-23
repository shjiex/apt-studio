import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import FurnitureModel from '../src/components/FurnitureModel.jsx';
import { CATEGORY_COLORS, getItem } from '../src/data/catalog.js';

// Which piece to draw comes from the address: tiles.html?type=wall_art
const type = new URLSearchParams(window.location.search).get('type');
const item = getItem(type);

// Point the camera at the middle of the piece from the front left and a little above,
// the same angle the Blender tile pictures use, and zoom so the piece fills the picture.
function Aim() {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    // a plain lit room for shiny things (a mirror) to reflect
    scene.environment = new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45; // quiet, so it lights the mirror without washing out the colours
    const { w, d, h } = item.size;
    const turn = THREE.MathUtils.degToRad(item.wall ? -24 : -32);
    const lift = THREE.MathUtils.degToRad(item.wall ? 8 : 22);
    camera.position.set(Math.sin(turn) * Math.cos(lift) * 10, h / 2 + Math.sin(lift) * 10, Math.cos(turn) * Math.cos(lift) * 10);
    camera.lookAt(0, h / 2, 0);
    // the widest the piece can look from this angle, in metres, fitted into 250 of the 320 pixels
    const across = Math.hypot(w, d);
    const tall = h + d * 0.4;
    camera.zoom = 250 / Math.max(across, tall);
    camera.updateProjectionMatrix();
    window.tileReady = true; // render_tiles.py waits for this
  }, [camera, gl, scene]);
  return null;
}

// A soft dark patch on the floor under the piece, fading out to nothing at its edge.
function FloorShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <planeGeometry args={[item.size.w * 1.5, item.size.d * 1.7]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

createRoot(document.getElementById('stage')).render(
  <Canvas orthographic gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }} dpr={1} camera={{ near: 0.1, far: 100 }}>
    <Aim />
    <ambientLight intensity={0.9} />
    <directionalLight position={[-4, 8, 6]} intensity={1.9} />
    <directionalLight position={[5, 3, 2]} intensity={0.6} />
    {!item.wall && item.size.h > 0.05 && <FloorShadow />}
    <FurnitureModel type={item.baseType || type} size={item.size} color={item.tone || CATEGORY_COLORS[item.category]} model={item.model} />
  </Canvas>
);
