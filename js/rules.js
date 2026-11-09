import * as THREE from "three";
import { CITY, signalState, STOPS, STOP, START, routeMultiplier } from "./data.js";

const HALF = CITY.roadWidth / 2;
const OUTER = 24;
const FRONT = 4.5;
const TURN_ANGLE = 0.7;

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

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

function placement(def) {
  if (def.dir === "n") return { x: def.road - 3, z: def.at, heading: 0 };
  if (def.dir === "s") return { x: def.road + 3, z: def.at, heading: Math.PI };
  if (def.dir === "e") return { x: def.at, z: def.road - 3, heading: -Math.PI / 2 };
  return { x: def.at, z: def.road + 3, heading: Math.PI / 2 };
}

export function courseInfo(indices) {
  let length = 0;
  let px = START.x;
  let pz = START.z;
  indices.forEach((i) => {
    const p = placement(STOPS[i]);
    length += Math.abs(p.x - px) + Math.abs(p.z - pz);
    px = p.x;
    pz = p.z;
  });
  const rounded = Math.round(length);
  return { length: rounded, multiplier: routeMultiplier(rounded) };
}

export function makeDailyStops(date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const random = seeded(seed);
  const count = 3 + Math.floor(random() * 4);
  const indices = STOPS.map((def, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = indices[i];
    indices[i] = indices[j];
    indices[j] = t;
  }
  return indices.slice(0, count);
}

export function createRules(world, bus, controls, onEvent) {
  let session = null;
  let hasPrev = false;
  let prevFx = 0;
  let prevFz = 0;
  let runCoins = 0;

  function award(amount, text) {
    runCoins += amount;
    onEvent({ amount: amount, text: text, total: runCoins });
  }

  function nearestIntersection() {
    let best = null;
    let bestDist = Infinity;
    world.intersections.forEach((inter) => {
      const dx = bus.position.x - inter.x;
      const dz = bus.position.z - inter.z;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = inter;
      }
    });
    return best;
  }

  function startSession(inter, prevX, prevZ, time, heading) {
    const axis = Math.abs(prevZ) > Math.abs(prevX) ? "z" : "x";
    const state = signalState(time, inter.offset, axis);

    session = {
      inter: inter,
      heading: heading,
      blinker: controls.input.blinker
    };

    if (state === "green") {
      award(100, "青信号で通過");
    } else if (state === "red") {
      award(-50, "赤信号を無視");
    } else {
      onEvent({ amount: 0, text: "黄信号で通過", total: runCoins });
    }
  }

  function finishSession() {
    const delta = normalizeAngle(bus.rotation.y - session.heading);

    if (Math.abs(delta) > TURN_ANGLE) {
      const direction = delta > 0 ? "left" : "right";
      if (session.blinker === direction) {
        award(100, "方向指示OK");
      } else if (session.blinker) {
        award(-50, "ウインカーの向きが違う");
      } else {
        award(-50, "ウインカーなしで曲がった");
      }
    }

    controls.clearBlinker();
    session = null;
  }

  function update(time) {
    const heading = bus.rotation.y;
    const fx = bus.position.x - Math.sin(heading) * FRONT;
    const fz = bus.position.z - Math.cos(heading) * FRONT;

    if (session) {
      const dx = Math.abs(bus.position.x - session.inter.x);
      const dz = Math.abs(bus.position.z - session.inter.z);
      if (dx >= OUTER || dz >= OUTER) {
        finishSession();
      }
    } else if (hasPrev) {
      const inter = nearestIntersection();
      const prevX = prevFx - inter.x;
      const prevZ = prevFz - inter.z;
      const nowX = fx - inter.x;
      const nowZ = fz - inter.z;
      const insideNow = Math.abs(nowX) < HALF && Math.abs(nowZ) < HALF;
      const insidePrev = Math.abs(prevX) < HALF && Math.abs(prevZ) < HALF;
      if (insideNow && !insidePrev) {
        startSession(inter, prevX, prevZ, time, heading);
      }
    }

    prevFx = fx;
    prevFz = fz;
    hasPrev = true;
  }

  function reset() {
    session = null;
    hasPrev = false;
    runCoins = 0;
  }

  function getRunCoins() {
    return runCoins;
  }

  return { update: update, reset: reset, getRunCoins: getRunCoins };
}

function makeSignTexture(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 56px sans-serif";
  ctx.fillText("バス停", 256, 80);
  ctx.font = "bold 96px sans-serif";
  ctx.fillText(name, 256, 196);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeZoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 448;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255, 213, 79, 0.4)";
  ctx.fillRect(0, 0, 128, 448);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  [70, 190, 310].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(24, y + 44);
    ctx.lineTo(64, y);
    ctx.lineTo(104, y + 44);
    ctx.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function randomCount() {
  return 1 + Math.floor(Math.random() * STOP.maxWaiting);
}

export function createStops(scene, bus, onEvent, onRouteFinish) {
  let runCoins = 0;
  let routeMode = false;
  let route = [];
  let routeIndex = 0;
  let finished = false;
  let advancing = false;
  let advanceTimer = 0;

  bus.userData.passengers = 0;

  const zoneGeometry = new THREE.PlaneGeometry(4, 14);
  const zoneMaterial = new THREE.MeshBasicMaterial({
    map: makeZoneTexture(),
    transparent: true,
    depthWrite: false
  });
  const beaconGeometry = new THREE.CylinderGeometry(0.5, 0.5, 16, 12, 1, true);
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd54f,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
  const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x777777 });
  const roofGeometry = new THREE.BoxGeometry(3.0, 0.15, 5.0);
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const panelGeometry = new THREE.BoxGeometry(0.1, 2.4, 5.0);
  const panelMaterial = new THREE.MeshLambertMaterial({
    color: 0x90caf9,
    transparent: true,
    opacity: 0.6
  });
  const postGeometry = new THREE.BoxGeometry(0.12, 2.6, 0.12);
  const signGeometry = new THREE.PlaneGeometry(2.4, 1.2);
  const bodyGeometry = new THREE.CylinderGeometry(0.28, 0.28, 1.1, 8);
  const headGeometry = new THREE.SphereGeometry(0.22, 8, 6);
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xf1c27d });
  const shirtMaterials = [0xe57373, 0x64b5f6, 0x81c784, 0xffb74d, 0xba68c8, 0x4db6ac].map(
    (c) => new THREE.MeshLambertMaterial({ color: c })
  );

  function buildStop(def, index) {
    const info = placement(def);
    const group = new THREE.Group();
    group.position.set(info.x, 0, info.z);
    group.rotation.y = info.heading;
    scene.add(group);

    const zone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(0, 0.07, 0);
    group.add(zone);

    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.set(-3.8, 8, -6);
    group.add(beacon);

    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(-3.8, 2, -6);
    group.add(pole);

    const sign = new THREE.Mesh(
      signGeometry,
      new THREE.MeshBasicMaterial({ map: makeSignTexture(def.name), side: THREE.DoubleSide })
    );
    sign.position.set(-3.8, 4.4, -6);
    group.add(sign);

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(-6.3, 2.6, -3.5);
    group.add(roof);

    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(-7.8, 1.4, -3.5);
    group.add(panel);

    [-1.2, -5.8].forEach((z) => {
      const post = new THREE.Mesh(postGeometry, poleMaterial);
      post.position.set(-4.9, 1.3, z);
      group.add(post);
    });

    const passengers = [];
    for (let i = 0; i < STOP.maxWaiting; i++) {
      const person = new THREE.Group();
      const body = new THREE.Mesh(bodyGeometry, shirtMaterials[(index + i) % shirtMaterials.length]);
      body.position.y = 0.8;
      person.add(body);
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.6;
      person.add(head);
      person.position.set(-5.4, 0, -2.5 - 0.7 * i);
      group.add(person);
      passengers.push(person);
    }

    return {
      x: info.x,
      z: info.z,
      heading: info.heading,
      ax: -Math.sin(info.heading),
      az: -Math.cos(info.heading),
      ox: -Math.cos(info.heading),
      oz: Math.sin(info.heading),
      zone: zone,
      beacon: beacon,
      passengers: passengers,
      count: 0,
      active: true,
      cooldown: 0,
      dwell: 0,
      boardTimer: 0,
      boarding: false
    };
  }

  const stops = STOPS.map((def, index) => buildStop(def, index));

  function setWaiting(stop, count) {
    stop.active = true;
    stop.count = count;
    stop.dwell = 0;
    stop.boardTimer = 0;
    stop.boarding = false;
    stop.zone.visible = true;
    stop.beacon.visible = true;
    stop.passengers.forEach((person, i) => {
      person.visible = i < count;
    });
  }

  function setCooldown(stop) {
    stop.active = false;
    stop.cooldown = STOP.cooldown;
    stop.dwell = 0;
    stop.boardTimer = 0;
    stop.boarding = false;
    stop.zone.visible = false;
    stop.beacon.visible = false;
    stop.passengers.forEach((person) => {
      person.visible = false;
    });
  }

  function award(amount, text) {
    runCoins += amount;
    onEvent({ amount: amount, text: text, total: runCoins });
  }

  function update(dt) {
    if (advancing) {
      advanceTimer -= dt;
      if (advanceTimer <= 0) {
        advancing = false;
        routeIndex += 1;
        if (routeIndex >= route.length) {
          routeIndex = route.length - 1;
          finished = true;
          onRouteFinish();
        } else {
          setWaiting(stops[route[routeIndex]], randomCount());
          onEvent({
            amount: 0,
            text: "次は「" + STOPS[route[routeIndex]].name + "」へ",
            total: runCoins
          });
        }
      }
    }

    if (finished) return;

    stops.forEach((stop) => {
      if (!stop.active) {
        if (!routeMode) {
          stop.cooldown -= dt;
          if (stop.cooldown <= 0) {
            setWaiting(stop, randomCount());
          }
        }
        return;
      }

      const dx = bus.position.x - stop.x;
      const dz = bus.position.z - stop.z;
      const along = dx * stop.ax + dz * stop.az;
      const lateral = dx * stop.ox + dz * stop.oz;
      const headingDiff = Math.abs(normalizeAngle(bus.rotation.y - stop.heading));
      const inZone =
        Math.abs(along) <= 7 &&
        Math.abs(lateral) <= 2 &&
        headingDiff <= 0.5 &&
        bus.userData.speed < 0.6;

      if (!inZone) {
        stop.dwell = 0;
        stop.boarding = false;
        stop.boardTimer = 0;
        return;
      }

      if (!stop.boarding) {
        stop.dwell += dt;
        if (stop.dwell < STOP.dwell) return;
        stop.boarding = true;
        stop.boardTimer = STOP.interval;
        const onboard = bus.userData.passengers;
        if (onboard > 0) {
          bus.userData.passengers = 0;
          onEvent({ amount: 0, text: onboard + "人が降車", total: runCoins });
        }
      }

      stop.boardTimer += dt;
      while (stop.boardTimer >= STOP.interval && stop.count > 0) {
        stop.boardTimer -= STOP.interval;
        stop.count -= 1;
        stop.passengers[stop.count].visible = false;
        bus.userData.passengers += 1;
        award(STOP.reward, "乗客が乗車");
      }

      if (stop.count === 0) {
        setCooldown(stop);
        if (routeMode) {
          advancing = true;
          advanceTimer = 1.5;
        }
      }
    });
  }

  function reset() {
    runCoins = 0;
    routeIndex = 0;
    finished = false;
    advancing = false;
    advanceTimer = 0;
    bus.userData.passengers = 0;

    if (routeMode && route.length > 0) {
      stops.forEach((stop) => {
        setCooldown(stop);
      });
      setWaiting(stops[route[0]], randomCount());
    } else {
      stops.forEach((stop) => {
        setWaiting(stop, randomCount());
      });
    }
  }

  function setRoute(list) {
    routeMode = Array.isArray(list);
    route = routeMode ? list.slice() : [];
    reset();
  }

  function getRouteInfo() {
    if (!routeMode || route.length === 0) return null;
    const target = stops[route[routeIndex]];
    return {
      index: routeIndex,
      total: route.length,
      name: STOPS[route[routeIndex]].name,
      x: target.x,
      z: target.z,
      finished: finished
    };
  }

  function getRunCoins() {
    return runCoins;
  }

  reset();

  return {
    update: update,
    reset: reset,
    setRoute: setRoute,
    getRouteInfo: getRouteInfo,
    getRunCoins: getRunCoins
  };
}
