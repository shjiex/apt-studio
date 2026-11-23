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

// A round flat shape that faces into the room (+z): a clock face, a round mirror.
// A cylinder stands upright, so it is tipped a quarter turn forward.
function Disc({ radius, thick, position, color, shiny }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, thick, 48]} />
      {/* shiny: all metal and almost no roughness, so it mirrors the light around it */}
      <meshStandardMaterial color={color} roughness={shiny ? 0.06 : 0.85} metalness={shiny ? 1 : 0} />
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
function FurnitureModel({ type, size, color, muted, model, tint, finish }) {
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  if (!model || hasFailed) {
    return <SimpleModel type={type} size={size} color={tint || color} muted={muted} />;
  }

  return (
    <>
      {!isReady && <SimpleModel type={type} size={size} color={color} muted={muted} />}
      <GlbModel
        url={model}
        size={size}
        muted={muted}
        tint={tint}
        finish={finish}
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

  // ---------- more furniture for the floor ----------
  if (type === 'bench') {
    return (
      <group>
        <Box size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color={wood} />
        <Legs w={w} d={d} height={h - 0.05} inset={0.06} color={dark} />
      </group>
    );
  }

  if (type === 'bar_stool') {
    return (
      <group>
        <Cylinder radiusTop={w / 2} radiusBottom={w / 2} height={0.05} position={[0, h - 0.025, 0]} color={wood} />
        <Legs w={w * 0.8} d={d * 0.8} height={h - 0.05} inset={0.02} color={dark} />
        {/* the ring you rest your feet on */}
        <Cylinder radiusTop={w * 0.36} radiusBottom={w * 0.36} height={0.02} position={[0, h * 0.35, 0]} color={dark} />
      </group>
    );
  }

  if (type === 'round_table') {
    return (
      <group>
        <Cylinder radiusTop={w / 2} radiusBottom={w / 2} height={0.04} position={[0, h - 0.02, 0]} color={wood} />
        <Cylinder radiusTop={0.05} radiusBottom={0.07} height={h - 0.07} position={[0, (h - 0.04) / 2 + 0.015, 0]} color={dark} />
        <Cylinder radiusTop={w * 0.28} radiusBottom={w * 0.3} height={0.03} position={[0, 0.015, 0]} color={dark} />
      </group>
    );
  }

  if (type === 'table_lamp') {
    return (
      <group>
        <Cylinder radiusTop={w * 0.28} radiusBottom={w * 0.34} height={0.03} position={[0, 0.015, 0]} color={dark} />
        <Cylinder radiusTop={0.012} radiusBottom={0.012} height={h * 0.55} position={[0, h * 0.3, 0]} color={dark} />
        <Cylinder radiusTop={w * 0.34} radiusBottom={w / 2} height={h * 0.42} position={[0, h * 0.79, 0]} color={soft} />
      </group>
    );
  }

  if (type === 'round_rug') {
    return (
      <group>
        <Cylinder radiusTop={w / 2} radiusBottom={w / 2} height={0.016} position={[0, 0.008, 0]} color={main} />
        <Cylinder radiusTop={w / 2 - 0.15} radiusBottom={w / 2 - 0.15} height={0.018} position={[0, 0.009, 0]} color={muted ? '#E6E5E0' : '#C98F6B'} />
      </group>
    );
  }

  // ---------- things that hang on a wall ----------
  // Each is built from the floor up (y from 0 to h) with its back at -d / 2, like the
  // rest. Room3D lifts it to its height on the wall.
  if (type === 'wall_art') {
    return (
      <group>
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={dark} />
        <Box size={[w - 0.05, h - 0.05, 0.004]} position={[0, h / 2, d / 2]} color={soft} />
        {/* the print: a block of colour with a sun over it */}
        <Box size={[w - 0.16, h * 0.4, 0.004]} position={[0, h * 0.34, d / 2 + 0.003]} color={main} />
        <Disc radius={w * 0.14} thick={0.004} position={[w * 0.08, h * 0.68, d / 2 + 0.003]} color={muted ? MUTED_DARK : '#FF9A3D'} />
      </group>
    );
  }

  if (type === 'wall_canvas') {
    return (
      <group>
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={soft} />
        <Box size={[w * 0.5, h, 0.004]} position={[-w * 0.25, h / 2, d / 2]} color={main} />
        <Disc radius={h * 0.28} thick={0.004} position={[w * 0.12, h * 0.5, d / 2 + 0.003]} color={muted ? MUTED_DARK : '#FF4F2B'} />
        <Box size={[w * 0.22, h * 0.2, 0.004]} position={[w * 0.32, h * 0.2, d / 2 + 0.003]} color={muted ? MUTED_DARK : '#FFE03A'} />
      </group>
    );
  }

  if (type === 'wall_gallery') {
    // three frames side by side, with a gap of 6 cm between them
    const each = (w - 0.12) / 3;
    const colours = muted ? [MUTED_DARK, MUTED_DARK, MUTED_DARK] : [main, '#FF7AD1', '#7DEBC2'];
    return (
      <group>
        {[-1, 0, 1].map((place) => (
          <group key={place} position={[place * (each + 0.06), 0, 0]}>
            <Box size={[each, h, d]} position={[0, h / 2, 0]} color={wood} />
            <Box size={[each - 0.04, h - 0.04, 0.004]} position={[0, h / 2, d / 2]} color={soft} />
            <Box size={[each - 0.14, h - 0.2, 0.004]} position={[0, h / 2, d / 2 + 0.003]} color={colours[place + 1]} />
          </group>
        ))}
      </group>
    );
  }

  if (type === 'round_mirror') {
    return (
      <group>
        <Disc radius={w / 2} thick={d} position={[0, h / 2, 0]} color={wood} />
        <Disc radius={w / 2 - 0.025} thick={0.004} position={[0, h / 2, d / 2]} color={muted ? MUTED : '#E4EAEC'} shiny={!muted} />
      </group>
    );
  }

  if (type === 'wall_mirror') {
    return (
      <group>
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={dark} />
        <mesh position={[0, h / 2, d / 2]} receiveShadow>
          <boxGeometry args={[w - 0.04, h - 0.04, 0.004]} />
          <meshStandardMaterial color={muted ? MUTED : '#E4EAEC'} roughness={muted ? 0.85 : 0.06} metalness={muted ? 0 : 1} />
        </mesh>
      </group>
    );
  }

  if (type === 'wall_shelf') {
    return (
      <group>
        <Box size={[w, 0.03, d]} position={[0, 0.045, 0]} color={wood} />
        {/* two small brackets under the plank */}
        <Box size={[0.02, 0.045, d * 0.7]} position={[-w * 0.35, 0.022, -d * 0.15]} color={dark} />
        <Box size={[0.02, 0.045, d * 0.7]} position={[w * 0.35, 0.022, -d * 0.15]} color={dark} />
        {/* three books and a small pot, so it reads as a shelf in use */}
        <Box size={[0.035, h - 0.07, d * 0.7]} position={[-w * 0.3, 0.06 + (h - 0.07) / 2, 0]} color={main} />
        <Box size={[0.03, h - 0.1, d * 0.7]} position={[-w * 0.3 + 0.04, 0.06 + (h - 0.1) / 2, 0]} color={soft} />
        <Box size={[0.04, h - 0.08, d * 0.7]} position={[-w * 0.3 + 0.08, 0.06 + (h - 0.08) / 2, 0]} color={muted ? MUTED_DARK : '#FF9A3D'} />
        <Cylinder radiusTop={0.05} radiusBottom={0.04} height={0.08} position={[w * 0.25, 0.1, 0]} color={soft} />
      </group>
    );
  }

  if (type === 'wall_clock') {
    return (
      <group>
        <Disc radius={w / 2} thick={d} position={[0, h / 2, 0]} color={dark} />
        <Disc radius={w / 2 - 0.02} thick={0.004} position={[0, h / 2, d / 2]} color={soft} />
        {/* the two hands, at ten past ten */}
        <group position={[0, h / 2, d / 2 + 0.004]}>
          <mesh rotation={[0, 0, 1.05]} position={[-0.035, 0.02, 0]}>
            <boxGeometry args={[w * 0.26, 0.012, 0.004]} />
            <meshStandardMaterial color={dark} />
          </mesh>
          <mesh rotation={[0, 0, -1.05]} position={[0.045, 0.026, 0]}>
            <boxGeometry args={[w * 0.34, 0.01, 0.004]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      </group>
    );
  }

  if (type === 'wall_tv') {
    return (
      <group>
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={dark} />
        <mesh position={[0, h / 2, d / 2]}>
          <boxGeometry args={[w - 0.03, h - 0.03, 0.004]} />
          <meshStandardMaterial color="#17181A" roughness={0.15} metalness={0.4} />
        </mesh>
      </group>
    );
  }

  if (type === 'wall_lamp') {
    return (
      <group>
        <Box size={[0.08, 0.12, 0.02]} position={[0, h * 0.35, -d / 2 + 0.01]} color={dark} />
        <Box size={[0.015, 0.015, d * 0.6]} position={[0, h * 0.35, -d / 2 + d * 0.3]} color={dark} />
        <Cylinder radiusTop={w * 0.3} radiusBottom={w / 2} height={h * 0.6} position={[0, h * 0.7, d * 0.1]} color={soft} />
      </group>
    );
  }

  if (type === 'curtains') {
    // a rod and two panels, drawn open with a gap between them for the window
    const panel = w * 0.24;
    return (
      <group>
        <Box size={[w, 0.025, 0.025]} position={[0, h - 0.0125, 0]} color={dark} />
        <Box size={[panel, h - 0.03, d * 0.6]} position={[-w / 2 + panel / 2, (h - 0.03) / 2, 0]} color={main} />
        <Box size={[panel, h - 0.03, d * 0.6]} position={[w / 2 - panel / 2, (h - 0.03) / 2, 0]} color={main} />
      </group>
    );
  }

  // Anything we have no model for is a plain box of the right size.
  return <Box size={[w, h, d]} position={[0, h / 2, 0]} color={main} />;
}

export default FurnitureModel;
