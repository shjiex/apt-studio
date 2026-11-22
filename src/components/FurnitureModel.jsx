import { useState } from 'react';
import GlbModel from './GlbModel.jsx';

// Furniture in the room. If the catalog entry has a real 3D model file, that is
// shown. Until it has loaded (or if it fails to load) a simple stand-in built
// from boxes and cylinders is shown instead, so the room is never empty.
// Each model stands on the floor (y = 0), is centred on its footprint and
// faces the front of the room (+z).

const WOOD = '#C9A27A';
const WHITE = '#FBFAF7';
const DARK = '#2B2B29';
const MUTED = '#D8D7D2';
const MUTED_DARK = '#C4C3BE';

function Box({ size, position, color }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

// radiusTop, radiusBottom and height, like a tin can or a lamp shade.
function Cylinder({ radiusTop, radiusBottom, height, position, color }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, 32]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function Legs({ w, d, height, inset = 0.05, color }) {
  const x = w / 2 - inset;
  const z = d / 2 - inset;
  return (
    <>
      <Box size={[0.04, height, 0.04]} position={[-x, height / 2, -z]} color={color} />
      <Box size={[0.04, height, 0.04]} position={[x, height / 2, -z]} color={color} />
      <Box size={[0.04, height, 0.04]} position={[-x, height / 2, z]} color={color} />
      <Box size={[0.04, height, 0.04]} position={[x, height / 2, z]} color={color} />
    </>
  );
}

// muted is true for furniture that was already in the room: it is drawn grey.
function FurnitureModel({ type, size, color, muted, model }) {
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  if (!model || hasFailed) {
    return <SimpleModel type={type} size={size} color={color} muted={muted} />;
  }

  return (
    <>
      {!isReady && <SimpleModel type={type} size={size} color={color} muted={muted} />}
      <GlbModel
        url={model}
        size={size}
        muted={muted}
        onReady={() => setIsReady(true)}
        onFail={() => setHasFailed(true)}
      />
    </>
  );
}

// The stand-in built from boxes and cylinders.
function SimpleModel({ type, size, color, muted }) {
  const { w, d, h } = size;
  const main = muted ? MUTED : color;
  const wood = muted ? MUTED_DARK : WOOD;
  const soft = muted ? '#E6E5E0' : WHITE;
  const dark = muted ? MUTED_DARK : DARK;

  if (type === 'desk') {
    return (
      <group>
        <Box size={[w, 0.04, d]} position={[0, h - 0.02, 0]} color={main} />
        <Box size={[0.4, 0.12, d - 0.1]} position={[w / 2 - 0.26, h - 0.1, 0]} color={main} />
        <Legs w={w} d={d} height={h - 0.04} color={wood} />
      </group>
    );
  }

  if (type === 'chair') {
    return (
      <group>
        <Box size={[w, 0.07, d - 0.04]} position={[0, 0.45, 0.02]} color={main} />
        <Box size={[w, 0.36, 0.05]} position={[0, 0.72, -d / 2 + 0.025]} color={main} />
        <Legs w={w} d={d} height={0.42} color={wood} />
      </group>
    );
  }

  if (type === 'shelf') {
    const levels = [0.06, 0.44, 0.82, 1.2, h - 0.015];
    return (
      <group>
        <Box size={[0.03, h, d]} position={[-w / 2 + 0.015, h / 2, 0]} color={main} />
        <Box size={[0.03, h, d]} position={[w / 2 - 0.015, h / 2, 0]} color={main} />
        {levels.map((y) => (
          <Box key={y} size={[w - 0.06, 0.03, d]} position={[0, y, 0]} color={main} />
        ))}
        <Box size={[0.22, 0.24, 0.18]} position={[-0.18, 0.97, 0]} color={soft} />
        <Box size={[0.16, 0.2, 0.18]} position={[0.16, 0.57, 0]} color={dark} />
        <Box size={[0.26, 0.06, 0.2]} position={[0.1, 1.25, 0]} color={soft} />
      </group>
    );
  }

  if (type === 'lamp') {
    return (
      <group>
        <Cylinder radiusTop={0.15} radiusBottom={0.15} height={0.03} position={[0, 0.015, 0]} color={dark} />
        <Cylinder radiusTop={0.012} radiusBottom={0.012} height={h - 0.3} position={[0, (h - 0.3) / 2, 0]} color={dark} />
        <Cylinder radiusTop={0.13} radiusBottom={0.2} height={0.28} position={[0, h - 0.14, 0]} color={main} />
      </group>
    );
  }

  if (type === 'bed') {
    return (
      <group>
        <Box size={[w, 0.28, d]} position={[0, 0.2, 0]} color={wood} />
        <Box size={[w, h, 0.06]} position={[0, h / 2, -d / 2 + 0.03]} color={wood} />
        <Box size={[w - 0.06, 0.2, d - 0.12]} position={[0, 0.44, 0.03]} color={soft} />
        <Box size={[0.6, 0.12, 0.38]} position={[-0.36, 0.6, -d / 2 + 0.34]} color={soft} />
        <Box size={[0.6, 0.12, 0.38]} position={[0.36, 0.6, -d / 2 + 0.34]} color={soft} />
        <Box size={[w - 0.02, 0.22, d * 0.58]} position={[0, 0.45, d / 2 - (d * 0.58) / 2 - 0.02]} color={main} />
      </group>
    );
  }

  if (type === 'plant') {
    const pot = muted ? MUTED_DARK : '#C8754F';
    return (
      <group>
        <Cylinder radiusTop={0.15} radiusBottom={0.11} height={0.28} position={[0, 0.14, 0]} color={pot} />
        <mesh position={[0, 0.58, 0]} scale={[1, 1.5, 1]} castShadow>
          <sphereGeometry args={[0.2, 24, 16]} />
          <meshStandardMaterial color={main} roughness={0.85} />
        </mesh>
        <mesh position={[0.08, 0.86, 0.04]} castShadow>
          <sphereGeometry args={[0.12, 24, 16]} />
          <meshStandardMaterial color={main} roughness={0.85} />
        </mesh>
      </group>
    );
  }

  if (type === 'rug') {
    return (
      <group>
        <Box size={[w, 0.016, d]} position={[0, 0.008, 0]} color={main} />
        <Box size={[w - 0.3, 0.018, d - 0.3]} position={[0, 0.009, 0]} color={muted ? '#E6E5E0' : '#C98F6B'} />
      </group>
    );
  }

  if (type === 'sofa') {
    return (
      <group>
        <Box size={[w, 0.3, d]} position={[0, 0.25, 0]} color={main} />
        <Box size={[w, 0.4, 0.2]} position={[0, 0.6, -d / 2 + 0.1]} color={main} />
        <Box size={[0.18, 0.5, d]} position={[-w / 2 + 0.09, 0.35, 0]} color={main} />
        <Box size={[0.18, 0.5, d]} position={[w / 2 - 0.09, 0.35, 0]} color={main} />
        <Legs w={w} d={d} height={0.1} inset={0.08} color={wood} />
      </group>
    );
  }

  // Anything we have no model for is a plain box of the right size.
  return <Box size={[w, h, d]} position={[0, h / 2, 0]} color={main} />;
}

export default FurnitureModel;
