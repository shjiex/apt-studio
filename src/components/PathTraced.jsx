import { useLayoutEffect, useRef } from 'react';
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

// For testing where the browser cannot prepare a program in the background (software
// graphics in a test browser): ?prepare in the address gets the tracer ready anyway.
// How many passes are averaged before the traced picture is put on screen.
// At 4 the picture came on screen still full of bright specks. At 24 the grain is fine
// enough for the two clean-up steps below to deal with, and it is about two seconds on
// a laptop graphics card. The normal picture stays on screen until then.
const WARM_PASSES = Number(new URLSearchParams(window.location.search).get('warm')) || 24; // ?warm=3 in the address shows it sooner, for testing on a slow machine

// A clean-up step for the traced picture: take bright specks out.
// A traced path now and then finds a very bright spot by luck, and that lands as one
// pixel far brighter than everything round it. The smoothing step that follows keeps
// such a pixel, because it only blends a pixel with neighbours that look like it. So
// before it, each pixel is compared with the middle value (the median) of the nine
// pixels it sits in. A speck is far above that middle value however many other specks
// are near it, which an average would not tell you. A pixel more than 1.8 times the
// middle value is replaced by the average of the neighbours that are not specks.
const SPECK_SHADER = {
  uniforms: { map: { value: null }, texel: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D map;
    uniform vec2 texel; // the size of one pixel, as a share of the picture
    varying vec2 vUv;
    float brightness(vec3 colour) {
      return dot(colour, vec3(0.2126, 0.7152, 0.0722));
    }
    void main() {
      // the nine pixels: colour, and brightness twice (one copy gets sorted)
      vec3 colours[9];
      float lights[9];
      float sorted[9];
      float alpha = texture2D(map, vUv).a;
      int count = 0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          colours[count] = texture2D(map, vUv + vec2(float(x), float(y)) * texel).rgb;
          lights[count] = brightness(colours[count]);
          sorted[count] = lights[count];
          count++;
        }
      }
      // sort the nine brightnesses, smallest first (a bubble sort is plenty for nine)
      for (int i = 0; i < 8; i++) {
        for (int j = 0; j < 8 - i; j++) {
          float low = min(sorted[j], sorted[j + 1]);
          float high = max(sorted[j], sorted[j + 1]);
          sorted[j] = low;
          sorted[j + 1] = high;
        }
      }
      float limit = 1.8 * sorted[4] + 0.02; // sorted[4] is the middle one of nine
      if (lights[4] <= limit) {
        gl_FragColor = vec4(colours[4], alpha); // lights[4] is the pixel itself: not a speck
        return;
      }
      vec3 sum = vec3(0.0);
      float used = 0.0;
      for (int i = 0; i < 9; i++) {
        if (lights[i] <= limit) {
          sum += colours[i];
          used += 1.0;
        }
      }
      gl_FragColor = vec4(sum / max(used, 1.0), alpha);
    }`,
};
const TEST_PREPARE = new URLSearchParams(window.location.search).has('prepare');

// How bright the sky is, in the picture's units, for a sun strength from 0 to 1.
function skyBrightness(daylight, strength) {
  return daylight ? (1.2 + 1.6 * strength) * DAYLIGHT : 0.03;
}

// It needs a closed room, which is why it is offered only in the inside view.
//
// Room3D keeps this part mounted the whole time you are in the inside view, and
// `isOn` says whether Realistic is switched on. While it is off, the tracer gets
// ready in the background (see getReady below), so switching it on can start at
// once. The drawing itself is done by TracedPicture, further down, only while it is on.
//
// `signature` is a text that changes whenever the room's contents change.
// `onPasses` is told how many passes have been averaged so far.
// `brightness` is the person's own adjustment on top of the exposure: 1 leaves it as it is.
// `onShown` is told true once the first traced frame is on screen (and false when this
// is switched off), so Room3D knows how long to keep the normal picture going.
function PathTraced({ isOn, room, signature, daylight, strength, brightness, onPasses, onShown }) {
  const { gl, scene, camera } = useThree();
  const tracer = useRef(null);
  const sky = useRef(null); // the simple blue sky the traced room is lit by
  const isBuilt = useRef(false); // does the tracer have the room as it is now?
  const builtSignature = useRef(null); // the room's signature when the tracer last read it (null: never)
  const wasOn = useRef(isOn); // was Realistic on the last time the room or the switch changed?
  const readyCheck = useRef(null); // the timer that watches the program being prepared
  const meshCount = useRef(0);

  // Make the tracer once. It draws into the same canvas as the normal view.
  // A layout effect, like the one further down that hands it the room, and listed
  // first, so the tracer is made before that one runs.
  useLayoutEffect(() => {
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

    // A limit on how bright one traced path may be. Now and then a path bounces off a
    // shiny surface straight into a bulb and comes back thousands of times brighter than
    // its neighbours. Averaged over 64 passes that one path is still a white dot, and a
    // room with two lamps on had them all over. Two lines are added to the tracer's own
    // program: a number called speckLimit, and a line that scales a path's colour down
    // to that limit just before it is stored. The limit is set every frame further down,
    // to six times the brightness that shows as white, so lamps and sun patches still
    // look as bright as before and only the freak paths are held back.
    const program = made._pathTracer.material;
    program.uniforms.speckLimit = { value: 1000000 };
    program.fragmentShader = program.fragmentShader
      .replace('uniform float filterGlossyFactor;', 'uniform float filterGlossyFactor;\n\t\t\t\tuniform float speckLimit;')
      .replace(
        'gl_FragColor.a *= opacity;',
        'float brightest = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b));\n\t\t\t\t\tif (brightest > speckLimit) gl_FragColor.rgb *= speckLimit / brightest;\n\t\t\t\t\tgl_FragColor.a *= opacity;',
      );
    program.needsUpdate = true;
    sky.current = new GradientEquirectTexture();

    // The traced picture is grainy until many passes have been averaged. A denoiser
    // smooths the grain away before the picture is shown: each pixel is blended with
    // the neighbours that look like it, so flat walls go smooth and edges stay sharp.
    // It works on the picture shown, not on the passes, so the detail still improves
    // as passes come in. The first two passes are shown as they are.
    const smooth = new FullScreenQuad(new DenoiseMaterial({ map: null, blending: THREE.NoBlending }));
    smooth.material.sigma = 3; // how far (in pixels) a pixel looks for neighbours
    smooth.material.kSigma = 1.2;
    // The speck step draws into a picture of its own (`cleaned`), which the smoothing
    // step then reads from.
    const speck = new FullScreenQuad(new THREE.ShaderMaterial({ ...SPECK_SHADER, uniforms: THREE.UniformsUtils.clone(SPECK_SHADER.uniforms), depthTest: false, depthWrite: false }));
    const cleaned = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    const drawPlain = made.renderToCanvasCallback;
    made.renderToCanvasCallback = (target, renderer, quad) => {
      if (made.samples < 2) {
        drawPlain(target, renderer, quad);
        return;
      }
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      // 1. specks out, into `cleaned` (kept the same size as the traced picture)
      if (cleaned.width !== target.width || cleaned.height !== target.height) cleaned.setSize(target.width, target.height);
      speck.material.uniforms.map.value = target.texture;
      speck.material.uniforms.texel.value.set(1 / target.width, 1 / target.height);
      const drawingTo = renderer.getRenderTarget();
      renderer.setRenderTarget(cleaned);
      speck.render(renderer);
      renderer.setRenderTarget(drawingTo);
      // 2. smoothing, from `cleaned` onto the screen
      smooth.material.map = cleaned.texture;
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
      clearInterval(readyCheck.current);
      sky.current.dispose();
      made.dispose();
      smooth.material.dispose();
      smooth.dispose();
      speck.material.dispose();
      speck.dispose();
      cleaned.dispose();
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
      // What is behind an open doorway (marked `recess` in Room3D.jsx) is a closed box
      // that no light reaches, so traced it would be pitch black. It gets a glow of its
      // own, set so it shows as a dim grey: about a seventh of white at this exposure.
      const inRecess = part.isMesh && part.parent && part.parent.userData.recess;
      if (inRecess) {
        dimmed.push([part.material, part.material.emissiveIntensity]);
        part.material.emissiveIntensity = 2 / Math.max(exposure, 0.0001);
      } else if (part.isMesh && part.material.emissiveIntensity > 0.4 && !part.userData.helper) {
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
    builtSignature.current = signature;
    performance.mark('apt-realistic-room-read');
  }

  // Have the graphics card prepare the tracer's program now, so it is ready before
  // Realistic is switched on. The program is large, and preparing it is most of the
  // wait after the click. Asking the tracer for one sample, without drawing it on the
  // screen, is what starts the preparing. While the program is being prepared the
  // tracer traces nothing, so this costs nothing else.
  function getReady() {
    const made = tracer.current;
    if (!made) return;
    build();
    made.renderToCanvas = false; // trace into the tracer's own picture, not the screen
    made.renderSample();
    made.renderToCanvas = true;
    // Leave a time stamp once the program is ready, for the browser's Performance panel.
    clearInterval(readyCheck.current);
    readyCheck.current = setInterval(() => {
      if (made.isCompiling) return;
      clearInterval(readyCheck.current);
      performance.mark('apt-realistic-ready');
    }, 200);
  }

  // Runs when the room changes and when Realistic is switched on or off. It is a
  // layout effect so it runs before the next frame is drawn: a frame drawn in
  // between would still show the tracer's old copy of the room.
  useLayoutEffect(() => {
    const switchedOn = isOn && !wasOn.current;
    wasOn.current = isOn;

    if (isOn) {
      // Nothing changed since the tracer last read the room: nothing to do.
      if (!switchedOn && builtSignature.current === signature) return undefined;
      isBuilt.current = false;
      // Hand the tracer the room. Right after switching on it reads the room afresh,
      // even if it read it while getting ready, because pictures and models may have
      // finished loading since; that takes a fraction of a second. When the room
      // changes while it is on, wait a moment first (a drag changes it many times a
      // second). Right after switching on, or the very first time, nothing is moving.
      const isFirst = builtSignature.current === null;
      const timer = setTimeout(build, switchedOn || isFirst ? 0 : 500); // 500: longer than a new piece takes to settle into place
      return () => clearTimeout(timer);
    }

    // Realistic is off. The first time, get the tracer ready in the background, one
    // second after you step inside so the step itself stays smooth. Later changes
    // wait until it is switched on, so moving furniture costs nothing extra while
    // Realistic is off. This needs a browser that can prepare a program in the
    // background (most can). Without that, preparing it would freeze the page for a
    // few seconds while you look around, which is worse than waiting after the click.
    const canPrepareQuietly = gl.extensions.has('KHR_parallel_shader_compile') || TEST_PREPARE;
    if (builtSignature.current === null && canPrepareQuietly) {
      const timer = setTimeout(getReady, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, isOn]);

  if (!isOn) return null;
  return (
    <TracedPicture
      tracer={tracer}
      isBuilt={isBuilt}
      meshCount={meshCount}
      build={build}
      exposure={exposure}
      onPasses={onPasses}
      onShown={onShown}
    />
  );
}

// The drawing part of the realistic picture. It is there only while Realistic is
// on, because while it is there it takes over drawing the whole stage.
// The tracer and what it knows about the room come from PathTraced above.
function TracedPicture({ tracer, isBuilt, meshCount, build, exposure, onPasses, onShown }) {
  const { gl, scene, camera } = useThree();
  const hasShown = useRef(false); // has a traced frame been drawn yet
  const frameTime = useRef(0.03); // seconds one frame takes, smoothed
  const tileCount = useRef(2); // each pass is drawn in tileCount x tileCount pieces
  const bufferSize = useRef(new THREE.Vector2());
  const lastView = useRef(new THREE.Matrix4());
  const lastFov = useRef(0);
  const lastPasses = useRef(-1);

  // Switched on: leave a time stamp. Switched off: the normal picture takes over again.
  // A layout effect runs as soon as this part is on the page, before the next frame
  // is drawn, so the time stamp is not held up by a slow first frame.
  useLayoutEffect(() => {
    performance.mark('apt-realistic-switched-on');
    return () => onShown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // white on screen is about 1 / exposure in the tracer's units; allow six times that
    made._pathTracer.material.uniforms.speckLimit.value = 6 / Math.max(exposure, 0.0001);
    // The first few passes are grainy. Until WARM_PASSES of them have been averaged the
    // tracer works out of sight (renderToCanvas off) and the normal picture stays on
    // screen. So a picture that is still speckled never shows: not at the start, and
    // not each time you turn your head or move, which starts the averaging again.
    const isWarm = !made.isCompiling && made.samples >= WARM_PASSES;
    made.renderToCanvas = isWarm;
    made.renderSample();
    gl.toneMapping = mappingBefore;
    gl.toneMappingExposure = exposureBefore;

    // The tracer first has the graphics card prepare its program, and draws nothing
    // until that is done. The first frame after it is the first traced picture.
    if (isWarm !== hasShown.current) {
      hasShown.current = isWarm;
      onShown(isWarm); // Room3D draws the normal picture whenever this is false
      if (isWarm) performance.mark('apt-realistic-first-frame');
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