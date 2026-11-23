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

// The most pixels the picture is traced at. A big window on a sharp screen has
// several million, and every pass has to follow light for each of them. Past
// about 1.2 million the eye gains little, so a bigger stage is traced at this
// many pixels and stretched to fit.
const MOST_PIXELS = 1200000;

// For testing on a slow machine: ?trace=0.2 in the address traces a picture a fifth the size.
const TEST_SCALE = Number(new URLSearchParams(window.location.search).get('trace')) || 0;

// How bright the sky is, in the picture's units, for a sun strength from 0 to 1.
function skyBrightness(daylight, strength) {
  return daylight ? (1.2 + 1.6 * strength) * DAYLIGHT : 0.03;
}

// It needs a closed room, which is why it is offered only in the inside view.
// `signature` is a text that changes whenever the room's contents change.
// `onPasses` is told how many passes have been averaged so far.
// `brightness` is the person's own adjustment on top of the exposure: 1 leaves it as it is.
// `onShown` is told true once the first traced frame is on screen (and false when this
// is switched off), so Room3D knows how long to keep the normal picture going.
function PathTraced({ room, signature, daylight, strength, brightness, onPasses, onShown }) {
  const { gl, scene, camera } = useThree();
  const tracer = useRef(null);
  const sky = useRef(null); // the simple blue sky the traced room is lit by
  const isBuilt = useRef(false);
  const isFirstBuild = useRef(true);
  const hasShown = useRef(false); // has a traced frame been drawn yet
  const frameTime = useRef(0.03); // seconds one frame takes, smoothed
  const tileCount = useRef(2); // each pass is drawn in tileCount x tileCount pieces
  const bufferSize = useRef(new THREE.Vector2());
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
    if (TEST_SCALE > 0) made.renderScale = TEST_SCALE;
    made.textureSize.set(1024, 1024); // wood, fabric and photos are handed over at most this size
    // A pass is drawn in pieces (tiles), one piece per frame, so the page keeps
    // answering clicks while it works. It starts at 2 x 2; the drawing loop below
    // uses fewer, bigger pieces on a fast graphics card and more on a slow one.
    made.tiles.set(2, 2);
    // While the tracer is still getting ready it would draw the plain scene itself.
    // Room3D is already drawing the normal picture at that point, so it draws nothing.
    made.rasterizeSceneCallback = () => {};
    sky.current = new GradientEquirectTexture();

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
    performance.mark('apt-realistic-switched-on');
    return () => {
      onShown(false); // the normal picture takes over again
      sky.current.dispose();
      made.dispose();
      smooth.material.dispose();
      smooth.dispose();
    };
  }, [gl]);

  // Exposure: how bright the finished picture is shown. A room lit only through its
  // window is much darker than the sky outside; a photographer exposes for the room
  // and lets the window go bright, and so do we. It is applied when the picture is
  // shown, not while it is traced, so changing it (the Brightness slider) neither
  // rebuilds the room nor restarts the picture.
  const exposure = (daylight ? 0.035 : 1.5) * brightness;

  // Hand the room to the tracer. Helper shapes (floor patches, the unseen sheet
  // that hears clicks, the selection mark) are hidden while it reads the scene.
  function build() {
    const made = tracer.current;
    if (!made) return;
    isFirstBuild.current = false;
    // performance.mark leaves a named time stamp that the browser's Performance
    // panel shows, so the start-up can be timed: switched on, room read, first frame.
    performance.mark('apt-realistic-reading-room');

    // For the traced picture, the sky seen through the window, and the light it
    // sends in, come from a simple blue sky. The room is switched over to it only
    // while the tracer reads the scene, and put back at the end of this function,
    // so the normal picture never shows the tracer's lighting.
    sky.current.topColor.set(daylight ? '#8DB8EC' : '#05070D');
    sky.current.bottomColor.set(daylight ? '#EAF2F9' : '#0B0F18');
    sky.current.update();
    const before = {
      environment: scene.environment,
      background: scene.background,
      intensity: scene.environmentIntensity,
      backgroundIntensity: scene.backgroundIntensity,
    };
    scene.environment = sky.current;
    scene.background = sky.current; // what is seen through the window
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
    made.setScene(scene, camera);
    scene.remove(panels);
    panels.children.forEach((light) => light.dispose());
    // put the normal picture's surroundings back
    scene.remove(skylights);
    skylights.children.forEach((light) => light.dispose());
    scene.environment = before.environment;
    scene.background = before.background;
    scene.environmentIntensity = before.intensity;
    scene.backgroundIntensity = before.backgroundIntensity;
    hidden.forEach((part) => (part.visible = true));
    dimmed.forEach(([material, glow]) => (material.emissiveIntensity = glow));
    suns.forEach(([light, intensity]) => (light.intensity = intensity));
    meshCount.current = count;
    isBuilt.current = true;
    performance.mark('apt-realistic-room-read');
  }

  // Anything in the room changed: wait a moment (a drag changes it many times a
  // second), then start the picture again. The very first time nothing is moving,
  // so there is nothing to wait for.
  useEffect(() => {
    isBuilt.current = false;
    const timer = setTimeout(build, isFirstBuild.current ? 0 : 500); // 500: longer than a new piece takes to settle into place
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // This runs every frame. A number above 0 tells React Three Fiber that the
  // drawing is done by hand; 2 puts it after Room3D's own extra pass (which is 1),
  // so while both are on, the traced picture is the one drawn last, on top.
  useFrame((state, delta) => {
    const made = tracer.current;
    if (!made) return;
    if (!isBuilt.current) {
      // The tracer does not have the room yet. Before the first traced frame Room3D
      // is still drawing the normal picture, so there is nothing to do. After it
      // (a piece was moved while Realistic is on) the normal view is drawn here.
      if (hasShown.current) gl.render(scene, camera);
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
      made.updateCamera();
    }

    // How many pixels to trace: one per screen point, but never more than MOST_PIXELS.
    if (!TEST_SCALE) {
      const buffer = gl.getDrawingBufferSize(bufferSize.current);
      const scale = Math.min(1 / gl.getPixelRatio(), Math.sqrt(MOST_PIXELS / Math.max(buffer.x * buffer.y, 1)), 1);
      if (Math.abs(made.renderScale - scale) > 0.001) made.renderScale = scale;
    }
    // The picture is shown with a camera-like roll-off (tone mapping) at the exposure
    // above. Those are set just for this drawing and put back, so the normal picture,
    // while it is still on screen, keeps its own.
    const mappingBefore = gl.toneMapping;
    const exposureBefore = gl.toneMappingExposure;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    made.renderSample();
    gl.toneMapping = mappingBefore;
    gl.toneMappingExposure = exposureBefore;

    // The tracer first has the graphics card prepare its program, and draws nothing
    // until that is done. The first frame after it is the first traced picture.
    if (!hasShown.current && !made.isCompiling) {
      hasShown.current = true;
      onShown(true);
      performance.mark('apt-realistic-first-frame');
    }

    const passes = Math.floor(made.samples);
    if (passes !== lastPasses.current) {
      lastPasses.current = passes;
      onPasses(passes);
      // Once per pass, fit the number of tiles to the speed of this graphics card.
      // Frames arriving faster than 50 a second: it has time to spare, so use fewer,
      // bigger tiles and the picture clears up sooner. Slower than about 22 a second:
      // use more, smaller tiles so the page stays quick to answer.
      if (frameTime.current < 0.02 && tileCount.current > 1) tileCount.current -= 1;
      else if (frameTime.current > 0.045 && tileCount.current < 3) tileCount.current += 1;
      made.tiles.set(tileCount.current, tileCount.current);
    }
    // a running average of the time per frame (a long pause, such as a hidden tab, counts as 0.2 s)
    frameTime.current = frameTime.current * 0.8 + Math.min(delta, 0.2) * 0.2;
  }, 2);

  return null;
}

export default PathTraced;
