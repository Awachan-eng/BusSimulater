import * as THREE from "three";
import { CITY, SIGNAL, signalState } from "./data.js";

function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addInstances(scene, geometry, material, items) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const axis = new THREE.Vector3(0, 1, 0);

  items.forEach((item, i) => {
    position.set(item.x, item.y, item.z);
    quaternion.setFromAxisAngle(axis, item.ry || 0);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

export function createWorld(scene) {
  const spacing = CITY.spacing;
  const range = CITY.range;
  const half = CITY.roadWidth / 2;
  const length = CITY.roadHalfLength;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0x4caf50 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const darkMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });

  const roadGeometryZ = new THREE.PlaneGeometry(CITY.roadWidth, length * 2);
  const roadGeometryX = new THREE.PlaneGeometry(length * 2, CITY.roadWidth);

  for (let k = -range; k <= range; k++) {
    const roadZ = new THREE.Mesh(roadGeometryZ, roadMaterial);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(k * spacing, 0.03, 0);
    scene.add(roadZ);

    const roadX = new THREE.Mesh(roadGeometryX, roadMaterial);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.03, k * spacing);
    scene.add(roadX);
  }

  const dashZ = [];
  const dashX = [];
  const stripeZ = [];
  const stripeX = [];
  const stopH = [];
  const stopV = [];
  const poles = [];
  const housings = [];
  const lamps = [];
  const heads = [];
  const intersections = [];

  for (let k = -range; k <= range; k++) {
    for (let t = -length + 4; t < length; t += 8) {
      const nearest = Math.max(-range, Math.min(range, Math.round(t / spacing))) * spacing;
      if (Math.abs(t - nearest) < half + 10) continue;
      dashZ.push({ x: k * spacing, y: 0.06, z: t });
      dashX.push({ x: t, y: 0.06, z: k * spacing });
    }
  }

  const headDefs = [
    { dx: -8, dz: -8, theta: 0, axis: "z" },
    { dx: 8, dz: 8, theta: Math.PI, axis: "z" },
    { dx: 8, dz: -8, theta: -Math.PI / 2, axis: "x" },
    { dx: -8, dz: 8, theta: Math.PI / 2, axis: "x" }
  ];

  const lampHeights = [8.6, 7.9, 7.2];
  const stripeOffsets = [-5, -3, -1, 1, 3, 5];

  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      const cx = i * spacing;
      const cz = j * spacing;
      const offset = ((i + range) * 7 + (j + range) * 11) % SIGNAL.period;
      const intersection = { x: cx, z: cz, offset: offset };
      intersections.push(intersection);

      stripeOffsets.forEach((s) => {
        stripeZ.push({ x: cx + s, y: 0.06, z: cz + 8.5 });
        stripeZ.push({ x: cx + s, y: 0.06, z: cz - 8.5 });
        stripeX.push({ x: cx + 8.5, y: 0.06, z: cz + s });
        stripeX.push({ x: cx - 8.5, y: 0.06, z: cz + s });
      });

      stopH.push({ x: cx - 3, y: 0.06, z: cz + 11 });
      stopH.push({ x: cx + 3, y: 0.06, z: cz - 11 });
      stopV.push({ x: cx - 11, y: 0.06, z: cz - 3 });
      stopV.push({ x: cx + 11, y: 0.06, z: cz + 3 });

      headDefs.forEach((def) => {
        const px = cx + def.dx;
        const pz = cz + def.dz;
        poles.push({ x: px, y: 3.25, z: pz });
        housings.push({ x: px, y: 7.9, z: pz, ry: def.theta });
        lampHeights.forEach((y) => {
          lamps.push({
            x: px + 0.4 * Math.sin(def.theta),
            y: y,
            z: pz + 0.4 * Math.cos(def.theta)
          });
        });
        heads.push({
          index: heads.length,
          axis: def.axis,
          offset: offset,
          last: null
        });
      });
    }
  }

  addInstances(scene, new THREE.BoxGeometry(0.2, 0.02, 3), whiteMaterial, dashZ);
  addInstances(scene, new THREE.BoxGeometry(3, 0.02, 0.2), whiteMaterial, dashX);
  addInstances(scene, new THREE.BoxGeometry(1.2, 0.02, 3), whiteMaterial, stripeZ);
  addInstances(scene, new THREE.BoxGeometry(3, 0.02, 1.2), whiteMaterial, stripeX);
  addInstances(scene, new THREE.BoxGeometry(5.6, 0.02, 0.4), whiteMaterial, stopH);
  addInstances(scene, new THREE.BoxGeometry(0.4, 0.02, 5.6), whiteMaterial, stopV);

  addInstances(scene, new THREE.BoxGeometry(0.3, 6.5, 0.3), darkMaterial, poles);
  addInstances(scene, new THREE.BoxGeometry(1.0, 2.8, 0.8), housingMaterial, housings);

  const lampMesh = addInstances(
    scene,
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshBasicMaterial(),
    lamps
  );

  const redOn = new THREE.Color(0xff2b2b);
  const redOff = new THREE.Color(0x330808);
  const yellowOn = new THREE.Color(0xffd60a);
  const yellowOff = new THREE.Color(0x332b05);
  const greenOn = new THREE.Color(0x2bff6a);
  const greenOff = new THREE.Color(0x0a3318);

  function update(time) {
    let changed = false;

    heads.forEach((head) => {
      const state = signalState(time, head.offset, head.axis);
      if (state === head.last) return;
      head.last = state;
      const base = head.index * 3;
      lampMesh.setColorAt(base, state === "red" ? redOn : redOff);
      lampMesh.setColorAt(base + 1, state === "yellow" ? yellowOn : yellowOff);
      lampMesh.setColorAt(base + 2, state === "green" ? greenOn : greenOff);
      changed = true;
    });

    if (changed && lampMesh.instanceColor) {
      lampMesh.instanceColor.needsUpdate = true;
    }
  }

  const random = seeded(12345);
  const palette = [0xb0bec5, 0x90a4ae, 0xcfd8dc, 0xa1887f, 0xbcaaa4, 0xc5cae9];
  const buildingMaterials = palette.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const blockSize = spacing - CITY.roadWidth;
  const blockGeometry = new THREE.PlaneGeometry(blockSize, blockSize);

  for (let ix = -range; ix < range; ix++) {
    for (let iz = -range; iz < range; iz++) {
      const bx = (ix + 0.5) * spacing;
      const bz = (iz + 0.5) * spacing;

      const block = new THREE.Mesh(blockGeometry, sidewalkMaterial);
      block.rotation.x = -Math.PI / 2;
      block.position.set(bx, 0.04, bz);
      scene.add(block);

      [-1, 1].forEach((sx) => {
        [-1, 1].forEach((sz) => {
          const w = 30 + random() * 10;
          const d = 30 + random() * 10;
          const h = 10 + random() * 30;
          const material = buildingMaterials[Math.floor(random() * buildingMaterials.length)];
          const building = new THREE.Mesh(unitBox, material);
          building.scale.set(w, h, d);
          building.position.set(bx + sx * 27, h / 2 + 0.04, bz + sz * 27);
          scene.add(building);
        });
      });
    }
  }

  update(0);

  return { intersections: intersections, update: update };
}
