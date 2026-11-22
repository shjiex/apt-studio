import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { DenoiseMaterial, GradientEquirectTexture, WebGLPathTracer } from 'three-gpu-pathtracer';
import { windowInRoom } from '../lib/room.js';

// The realistic picture of the inside view.
//
// The normal view draws each surface once, with light that comes straight from
// the lamps and the sun. A path tracer works the way a camera does: for every
// pixel it follows light as it bounces around the room, so walls pick up colour
// from the floor, corners get darker, and shadows are soft. One pass is grainy;
// every further pass is averaged in, so the picture clears up while you hold
// still and starts again when anything moves.
//
// In the traced picture daylight and bulbs keep their real proportions. The normal
// view brightens bulbs so they show up beside its daylight; a real 450 lumen bulb
// gives about a thirtieth of the light a window does. Here the sky is DAYLIGHT
// times brighter than in the normal view, which puts it in the same units as the
// bulbs, and the exposure is set like a camera's: low by day, high at night.
const DAYLIGHT = 180;

// How bright the sky is, in the picture's units, for a sun strength from 0 to 1.
function skyBrightness(daylight, strength) {
  return daylight ? (1.2 + 1.6 * strength) * DAYLIGHT : 0.03;
}

// It needs a closed room, which is why it is offered only in the inside view.
// `signature` is a text that changes whenever the room's contents change.
// `onPasses` is told how many passes have been averaged so far.
// `brightness` is the person's own adjustment on top of the exposure: 1 leaves it as it is.
function PathTraced({ room, signature, daylight, strength, brightness, onPasses }) {
  const { gl, scene, camera } = useThree();
  const tracer = useRef(null);
  const isBuilt = useRef(false);
  const meshCount = useRef(0);
  const lastView = useRef(new THREE.Matrix4());
  const lastFov = useRef(0);
  const lastPasses = useRef(-1);

  // Make the tracer once. It draws into the same canvas as the normal view.
  useEffect(() => {
    const made = new WebGLPathTracer(gl);
    made.bounces = 5; // how many times light may bounce before it is dropped
    made.filterGlossyFactor = 0.5; // calms the bright speckles shiny surfaces cause
    made.renderDelay = 0;
    made.fadeDuration = 0;
    made.minSamples = 1;
    made.rasterizeScene = false;
    made.dynamicLowRes = true; // show a small rough picture at once, then the sharp one
    made.lowResScale = 0.2;
    made.renderScale = Math.min(1, 1 / gl.getPixelRatio()); // one traced pixel per screen point is enough
    // For testing on a slow machine: ?trace=0.2 in the address traces a picture a fifth the size.
    const testScale = Number(new URLSearchParams(window.location.search).get('trace'));
    if (testScale > 0) made.renderScale = testScale;

    // The traced picture is grainy until many passes have been averaged. A denoiser
    // smooths the grain away before the picture is shown: each pixel is blended with
    // the neighbours that look like it, so flat walls go smooth and edges stay sharp.
    // It works on the picture shown, not on the passes, so the detail still improves
    // as passes come in. The first two passes are shown as they are.
    const smooth = new FullScreenQuad(new DenoiseMaterial({ map: null, blending: THREE.NoBlending }));
    smooth.material.sigma = 3; // how far (in pixels) a pixel looks for neighbours
    smooth.material.kSigma = 1.2;
    const drawPlain = made.renderToCanvasCallback;
    made.renderToCanvasCallback = (target, renderer, quad) => {
      if (made.samples < 2) {
        drawPlain(target, renderer, quad);
        return;
      }
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      smooth.material.map = target.texture;
      // How different a neighbour may be and still count as "like it". It starts at
      // about a third of the way from black to white and halves each time the number
      // of passes quadruples (as the grain itself does), so the smoothing fades out
      // as the real picture comes in. The picture is stored before exposure is
      // applied, so the allowance is divided by the exposure.
      smooth.material.threshold = 0.3 / Math.sqrt(Math.max(made.samples, 4) / 4) / renderer.toneMappingExposure;
      smooth.render(renderer);
      renderer.autoClear = autoClear;
    };

    tracer.current = made;
    return () => {
      made.dispose();
      smooth.material.dispose();
      smooth.dispose();
    };
  }, [gl]);

  // While this is on, the sky seen through the window, and the light it sends in,
  // come from a simple blue sky. The normal view's surroundings are put back after.
  useEffect(() => {
    const sky = new GradientEquirectTexture();
    sky.topColor.set(daylight ? '#8DB8EC' : '#05070D');
    sky.bottomColor.set(daylight ? '#EAF2F9' : '#0B0F18');
    sky.update();
    const before = {
      environment: scene.environment,
      background: scene.background,
      intensity: scene.environmentIntensity,
      backgroundIntensity: scene.backgroundIntensity,
    };
    scene.environment = sky;
    scene.background = sky; // what is seen through the window
    scene.backgroundIntensity = skyBrightness(daylight, strength); // as bright as the light it sends in
    scene.environmentIntensity = 0.02;

    // The sky's light comes in through the window. Left to chance, very few of the
    // traced paths would find the window, and the picture would stay grainy for
    // minutes. So each window opening is itself made a light: a glowing rectangle
    // the size of the window, as bright as the sky behind it. Every point in the
    // room can then aim at it directly, and the picture clears up many times faster.
    const skylights = new THREE.Group();
    room.windows.forEach((win) => {
      const opening = windowInRoom(win, room);
      const middle = (opening.top + opening.bottom) / 2;
      const skylight = new THREE.RectAreaLight(daylight ? '#D6E6F8' : '#0B0F18', skyBrightness(daylight, strength), opening.half * 2, opening.top - opening.bottom);
      // 5 cm outside the wall's inner face, turned to shine into the room (a panel shines along its own -z)
      skylight.position.set(opening.x - opening.inward[0] * 0.05, middle, opening.z - opening.inward[1] * 0.05);
      skylight.rotation.y = Math.atan2(-opening.inward[0], -opening.inward[1]);
      skylights.add(skylight);
    });
    scene.add(skylights);
    isBuilt.current = false; // the light changed, so start again
    return () => {
      scene.environment = before.environment;
      scene.background = before.background;
      scene.environmentIntensity = before.intensity;
      scene.backgroundIntensity = before.backgroundIntensity;
      scene.remove(skylights);
      skylights.children.forEach((light) => light.dispose());
      sky.dispose();
    };
  }, [gl, scene, daylight, strength, room]);

  // Exposure: how bright the finished picture is shown. A room lit only through its
  // window is much darker than the sky outside; a photographer exposes for the room
  // and lets the window go bright, and so do we. Changing it does not restart the
  // picture, because it is applied when the picture is shown, not while it is traced.
  useEffect(() => {
    const before = gl.toneMappingExposure;
    gl.toneMappingExposure = (daylight ? 0.035 : 1.5) * brightness;
    return () => {
      gl.toneMappingExposure = before;
    };
  }, [gl, daylight, brightness]);

  // Hand the room to the tracer. Helper shapes (floor patches, the unseen sheet
  // that hears clicks, the selection mark) are hidden while it reads the scene.
  function build() {
    const hidden = [];
    const dimmed = [];
    const suns = [];
    const panels = new THREE.Group(); // the glowing panels that stand in for bulbs, see below
    let count = 0;
    scene.traverse((part) => {
      if (part.userData.helper && part.visible) {
        part.visible = false;
        hidden.push(part);
      }
      // A bulb here is a point with no size. Any surface right next to a point light
      // gets enormously bright, and traced paths that stumble on that spot show up as
      // white specks all over the picture. A real bulb has a size, so for the traced
      // picture each bulb becomes one or two small glowing panels giving the same
      // amount of light: a lamp shines down and up out of its shade, a ceiling light
      // shines down, a wall light or strip shines into the room.
      if (part.isPointLight && part.visible) {
        const at = part.getWorldPosition(new THREE.Vector3());
        // A point light of I candela gives 4 x pi x I of light in all. A panel of
        // area A and brightness L gives pi x L x A. So L = 4 x I / A for one panel.
        const panel = (size, share) => new THREE.RectAreaLight(part.color, (4 * part.intensity * share) / (size * size), size, size);
        if (part.userData.lampHeight) {
          const down = panel(0.3, 0.5);
          down.position.set(at.x, part.userData.lampHeight * 0.66, at.z);
          down.rotation.x = -Math.PI / 2; // a panel shines along its own -z; this turns that to straight down
          const up = panel(0.3, 0.5);
          up.position.set(at.x, part.userData.lampHeight * 1.01, at.z);
          up.rotation.x = Math.PI / 2;
          panels.add(down, up);
        } else if (part.userData.fixedKind === 'ceiling') {
          const down = panel(0.3, 1);
          down.position.copy(at);
          down.rotation.x = -Math.PI / 2;
          panels.add(down);
        } else {
          // on a wall: face away from whichever wall is nearest
          const inward = panel(0.2, 1);
          inward.position.copy(at);
          const nearSideWall = room.width / 2 - Math.abs(at.x) < room.length / 2 - Math.abs(at.z);
          if (nearSideWall) inward.rotation.y = at.x > 0 ? Math.PI / 2 : -Math.PI / 2;
          else inward.rotation.y = at.z > 0 ? 0 : Math.PI;
          panels.add(inward);
        }
        part.visible = false;
        hidden.push(part);
      }
      // The sun, in the same units as the sky. On a clear day it is about four times as
      // strong as the whole sky's light; here it is held to one and a half times. A small,
      // very bright sun patch is exactly what keeps a traced picture grainy for longest,
      // and a softer sun trades a little truth for a picture that clears up sooner.
      if (part.isDirectionalLight) {
        suns.push([part, part.intensity]);
        part.intensity = part.intensity > 0 ? 1.5 * Math.PI * skyBrightness(daylight, strength) * strength : 0;
      }
      // A surface that glows (a lampshade) is found by traced paths only by luck, and
      // each lucky hit lands as one bright speck. The bulb already lights the room, so
      // for the traced picture the glow is turned down to a soft one.
      if (part.isMesh && part.material.emissiveIntensity > 0.4 && !part.userData.helper) {
        dimmed.push([part.material, part.material.emissiveIntensity]);
        part.material.emissiveIntensity = 0.4;
      }
      if (part.isMesh) count += 1;
    });
    scene.add(panels);
    scene.updateMatrixWorld(true);
    tracer.current.setScene(scene, camera);
    scene.remove(panels);
    panels.children.forEach((light) => light.dispose());
    hidden.forEach((part) => (part.visible = true));
    dimmed.forEach(([material, glow]) => (material.emissiveIntensity = glow));
    suns.forEach(([light, intensity]) => (light.intensity = intensity));
    meshCount.current = count;
    isBuilt.current = true;
  }

  // Anything in the room changed: wait a moment (a drag changes it many times a
  // second), then start the picture again.
  useEffect(() => {
    isBuilt.current = false;
    const timer = setTimeout(build, 500); // longer than a new piece takes to settle into place
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // The number 1 makes this the function that draws each frame, in place of the normal view.
  useFrame(() => {
    if (!tracer.current) return;
    if (!isBuilt.current) {
      gl.render(scene, camera); // the normal view, until the tracer has the room
      return;
    }
    // A furniture model that finished loading adds meshes: read the room again.
    let count = 0;
    scene.traverse((part) => {
      if (part.isMesh) count += 1;
    });
    if (count !== meshCount.current) build();
    // The camera moved or zoomed: keep the room, restart the averaging. The camera
    // eases into place, so differences too small to see are ignored.
    let moved = Math.abs(camera.fov - lastFov.current);
    for (let i = 0; i < 16; i += 1) moved += Math.abs(camera.matrixWorld.elements[i] - lastView.current.elements[i]);
    if (moved > 0.0005) {
      lastView.current.copy(camera.matrixWorld);
      lastFov.current = camera.fov;
      tracer.current.updateCamera();
    }
    tracer.current.renderSample();
    const passes = Math.floor(tracer.current.samples);
    if (passes !== lastPasses.current) {
      lastPasses.current = passes;
      onPasses(passes);
    }
  }, 1);

  return null;
}

export default PathTraced;
