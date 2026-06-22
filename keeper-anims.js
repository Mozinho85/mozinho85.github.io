// Procedural goalkeeper animation clips, authored against the shared 24-bone rig
// (Hips/Spine/.../LeftArm/RightArm/LeftUpLeg/...). Because every team model uses the
// same skeleton + bone names, these clips apply to ALL of them — pass any loaded model.
//
//   import { buildKeeperClips } from './keeper-anims.js';
//   const clips = buildKeeperClips(THREE, model);   // {idle, dive_left, dive_right, celebrate}
//   const mixer = new THREE.AnimationMixer(model);
//   mixer.clipAction(clips.dive_left).play();
//
// Rotations are deltas in the bone's PARENT frame, premultiplied onto the rest pose,
// so they're independent of the model's bind orientation. 'Root' = the whole body.

const A = (x, y, z, a) => ({ ax: [x, y, z], a });   // axis-angle rotation delta
const P = (x, y, z)    => ({ pos: [x, y, z] });     // position delta (added to rest)

const DEFS = {
  // Subtle "alive" idle: gentle vertical bob + faint spine breathe. Loops.
  idle: { duration: 2.0, loop: true, times: [0, 0.5, 1.0, 1.5, 2.0], tracks: {
    Root:  [P(0,0,0), P(0,-1,0), P(0,0,0), P(0,-1,0), P(0,0,0)],
    Spine: [A(1,0,0,0), A(1,0,0,0.03), A(1,0,0,0), A(1,0,0,0.03), A(1,0,0,0)],
  }},

  // Dive to the keeper's LEFT (body tips toward -X). Plays once, holds the save.
  dive_left: { duration: 0.6, loop: false, times: [0, 0.18, 0.40, 0.60], tracks: {
    Root:       [A(0,0,1,0), A(0,0,1,0.35), A(0,0,1,0.85), A(0,0,1,1.25)],
    LeftArm:    [A(1,0,0,0), A(1,0,0,-0.5), A(1,0,0,-1.0), A(1,0,0,-1.3)],
    RightArm:   [A(1,0,0,0), A(1,0,0,-0.5), A(1,0,0,-1.0), A(1,0,0,-1.3)],
    LeftUpLeg:  [A(0,0,1,0), A(0,0,1,0.10), A(0,0,1,0.25), A(0,0,1,0.35)],
    RightUpLeg: [A(0,0,1,0), A(0,0,1,-0.10),A(0,0,1,-0.25),A(0,0,1,-0.35)],
  }},

  // Dive to the keeper's RIGHT — mirror of the left (Root + leg splay negated).
  dive_right: { duration: 0.6, loop: false, times: [0, 0.18, 0.40, 0.60], tracks: {
    Root:       [A(0,0,1,0), A(0,0,1,-0.35), A(0,0,1,-0.85), A(0,0,1,-1.25)],
    LeftArm:    [A(1,0,0,0), A(1,0,0,-0.5), A(1,0,0,-1.0), A(1,0,0,-1.3)],
    RightArm:   [A(1,0,0,0), A(1,0,0,-0.5), A(1,0,0,-1.0), A(1,0,0,-1.3)],
    LeftUpLeg:  [A(0,0,1,0), A(0,0,1,-0.10),A(0,0,1,-0.25),A(0,0,1,-0.35)],
    RightUpLeg: [A(0,0,1,0), A(0,0,1,0.10), A(0,0,1,0.25), A(0,0,1,0.35)],
  }},

  // Both arms aloft with a celebratory bob/pump. Loops.
  celebrate: { duration: 0.8, loop: true, times: [0, 0.4, 0.8], tracks: {
    LeftArm:  [A(1,0,0,-2.75), A(1,0,0,-3.0), A(1,0,0,-2.75)],
    RightArm: [A(1,0,0,-2.75), A(1,0,0,-3.0), A(1,0,0,-2.75)],
    Root:     [P(0,0,0), P(0,2.5,0), P(0,0,0)],
  }},
};

export function buildKeeperClips(THREE, model) {
  const nodes = { Root: model };
  model.traverse(o => { if (o.isBone) nodes[o.name] = o; });
  const restQ = {}, restP = {};
  for (const k in nodes) { restQ[k] = nodes[k].quaternion.clone(); restP[k] = nodes[k].position.clone(); }

  const build = (name, def) => {
    const tracks = [];
    for (const node in def.tracks) {
      if (!nodes[node]) { console.warn('[keeper-anims] missing bone:', node); continue; }
      const seq = def.tracks[node];
      if (seq[0].pos) {
        const vals = [];
        seq.forEach(s => vals.push(restP[node].x + s.pos[0], restP[node].y + s.pos[1], restP[node].z + s.pos[2]));
        tracks.push(new THREE.VectorKeyframeTrack(node + '.position', def.times, vals));
      } else {
        const vals = [];
        seq.forEach(s => {
          const dq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(s.ax[0], s.ax[1], s.ax[2]), s.a);
          const q = dq.multiply(restQ[node]);          // delta (parent frame) * rest
          vals.push(q.x, q.y, q.z, q.w);
        });
        tracks.push(new THREE.QuaternionKeyframeTrack(node + '.quaternion', def.times, vals));
      }
    }
    const clip = new THREE.AnimationClip(name, def.duration, tracks);
    clip.userData = { loop: def.loop };
    return clip;
  };

  const out = {};
  for (const name in DEFS) out[name] = build(name, DEFS[name]);
  return out;
}
