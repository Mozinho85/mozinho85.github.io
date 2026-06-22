// 3D goalkeeper layer for the 2D canvas game.
// - Lazy-loads the DEFENDING team's rigged FBX only when that team is defending
//   (cached per team, so a 2P match loads each side's keeper once).
// - Renders to an OFFSCREEN canvas with a transparent background; the game blits it
//   between the pitch and the ball via ctx.drawImage, so layering stays correct.
// - Drives the shared procedural clips (keeper-anims.js) from the engine's keeper state.
//
// Exposes window.Keeper3D = { ready, canvas, frame(keeper, cv, goal, nation, gameState) }.
// frame() returns true if a 3D keeper was rendered this frame (caller then blits
// Keeper3D.canvas and skips the 2D keeper); false → caller draws the 2D keeper.

// 'three' + 'three/addons/' are resolved via the import map in game.html.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { buildKeeperClips } from './keeper-anims.js';

const TARGET_H_FACTOR = .9;    // keeper height as a multiple of goal.h (tune to taste)
const FEET_NUDGE      = 0.3;   // fraction of goal.h to drop feet below the goal line

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x404036, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 6, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0xffe6c0, 0.5); fill.position.set(4, 2, 4); scene.add(fill);

let camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
camera.position.z = 1000;

const loader = new FBXLoader();
const cache = new Map();          // team -> { wrapper, model, mixer, actions, current }
let curTeam = null, cur = null;
let lastT = performance.now();
let cw = 0, ch = 0;

function teamKey(nation){ return nation && nation.name ? nation.name.toLowerCase() : null; }

function beginLoad(team){
  if (cache.has(team)) return;
  cache.set(team, null);          // mark "loading" so we don't double-fetch
  loader.load('assets/'+team+'.fbx', (obj) => {
    obj.name = 'Root';
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.x = -center.x;
    obj.position.y = -box.min.y;   // feet to wrapper origin
    obj.position.z = -center.z;
    const wrapper = new THREE.Group();
    wrapper.add(obj);
    const clips = buildKeeperClips(THREE, obj);
    const mixer = new THREE.AnimationMixer(obj);
    const actions = {};
    for (const k in clips){
      const a = mixer.clipAction(clips[k]);
      if (clips[k].userData && clips[k].userData.loop === false){ a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      actions[k] = a;
    }
    cache.set(team, { wrapper, model: obj, mixer, actions, current: null, height: size.y });
  }, undefined, () => { cache.set(team, 'failed'); });
}

function setClip(entry, name){
  if (entry.current === name) return;
  const next = entry.actions[name]; if (!next) return;
  const prev = entry.current && entry.actions[entry.current];
  next.reset();
  if (prev && prev !== next){ next.crossFadeFrom(prev, 0.12, false); }
  next.play();
  entry.current = name;
}

function desiredClip(keeper){
  if (keeper.state === 'celebrating') return 'celebrate';
  if (keeper.state !== 'idling') return (keeper.diveDir < 0) ? 'dive_left' : 'dive_right';
  return 'idle';
}

window.Keeper3D = {
  ready: true,
  canvas: renderer.domElement,

  frame(keeper, cv, goal, nation, gameState){
    const team = teamKey(nation);
    if (!team) return false;
    if (team !== curTeam){ curTeam = team; if (!cache.has(team)) beginLoad(team); }
    const entry = cache.get(team);
    if (!entry || entry === 'failed') return false;   // loading or unavailable → 2D fallback

    // swap active model in the scene
    if (cur !== entry){ if (cur) scene.remove(cur.wrapper); scene.add(entry.wrapper); cur = entry; }

    // size renderer + ortho camera to the game canvas (1 world unit = 1 px)
    if (cv.width !== cw || cv.height !== ch){
      cw = cv.width; ch = cv.height;
      renderer.setSize(cw, ch, false);
      camera.left = 0; camera.right = cw; camera.top = ch; camera.bottom = 0; camera.updateProjectionMatrix();
    }

    // placement: feet on the goal line at keeper.x; height scales with the goal
    const targetH = goal.h * TARGET_H_FACTOR;
    const s = (targetH / entry.height) * (keeper.scale || 1);
    entry.wrapper.scale.setScalar(s);
    const feetScreenY = keeper.baselineY + goal.h * FEET_NUDGE;
    entry.wrapper.position.set(keeper.x, ch - feetScreenY, 0);

    setClip(entry, desiredClip(keeper));

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    entry.mixer.update(dt);

    renderer.clear();
    renderer.render(scene, camera);
    return true;
  },
};
