import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

// One more pass over the 3D and inside pictures before they are shown.
// Ambient occlusion (N8AO) darkens the places light reaches least: corners, under
// furniture, where a wall meets the floor. That is what makes things look like
// they sit in the room. Then tone mapping rolls bright areas off the way a camera
// does. It lives in its own file so Room3D.jsx can fetch it only when a view
// that uses it is opened; the plan never needs it.
function RoomEffects() {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.55} distanceFalloff={1} intensity={2.4} quality="medium" />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export default RoomEffects;
