import * as THREE from "three";
import { STEER, DRIVE } from "./data.js";

function createExterior(spec) {
  const exterior = new THREE.Group();
  const isTour = spec.type === "tour";
  const isHybrid = spec.type === "hybrid";
  const length = isTour ? 12 : 10;
  const height = isTour ? 3.2 : 2.8;
  const centerZ = isTour ? 1 : 0;
  const bodyY = 0.6 + height / 2;

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: spec.color });
  const accentMaterial = new THREE.MeshLambertMaterial({ color: spec.accent });
  const glassMaterial = new THREE.MeshLambertMaterial({ color: isTour ? 0x4a7fa8 : 0x1e3a5f });
  const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff176 });
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, height, length), bodyMaterial);
  body.position.set(0, bodyY, centerZ);
  exterior.add(body);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.22, length - 0.1), accentMaterial);
  stripe.position.set(0, 1.15, centerZ);
  exterior.add(stripe);

  const windowHeight = isTour ? 1.3 : 0.9;
  const windowY = isTour ? 2.95 : 2.5;
  const windowLength = isTour ? 10 : 8;
  const sideWindows = new THREE.Mesh(
    new THREE.BoxGeometry(2.64, windowHeight, windowLength),
    glassMaterial
  );
  sideWindows.position.set(0, windowY, centerZ + 0.2);
  exterior.add(sideWindows);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(isTour ? 2.3 : 2.1, isTour ? 1.7 : 1.3, 0.05),
    glassMaterial
  );
  windshield.position.set(0, isTour ? 2.85 : 2.4, -5.01);
  exterior.add(windshield);

  [-0.9, 0.9].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), lightMaterial);
    headlight.position.set(x, 1.0, -5.01);
    exterior.add(headlight);
  });

  if (isHybrid) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 3.2), accentMaterial);
    pod.position.set(0, 0.6 + height + 0.17, -0.5);
    exterior.add(pod);
  }

  const wheelZs = isTour ? [-3, 3, 6] : [-3, 3];

  [-1.3, 1.3].forEach((x) => {
    wheelZs.forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.5, z);
      exterior.add(wheel);
    });
  });

  return exterior;
}

function createCockpit() {
  const cockpit = new THREE.Group();

  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
  const darker = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const red = new THREE.MeshLambertMaterial({ color: 0xff4444 });

  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 1.2), dark);
  dash.position.set(0, 1.65, -4.4);
  cockpit.add(dash);

  const cluster = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.3), darker);
  cluster.position.set(0.7, 2.14, -4.75);
  cockpit.add(cluster);

  [-1.22, 1.22].forEach((x) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.15), darker);
    pillar.position.set(x, 2.65, -4.92);
    cockpit.add(pillar);
  });

  const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), darker);
  centerPillar.position.set(0, 2.5, -4.95);
  cockpit.add(centerPillar);

  const header = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.8), dark);
  header.position.set(0, 3.38, -4.1);
  cockpit.add(header);

  const pivot = new THREE.Group();
  pivot.position.set(0.7, 2.3, -4.4);
  pivot.rotation.x = -0.8;
  cockpit.add(pivot);

  const column = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), darker);
  column.position.set(0, 0, -0.27);
  pivot.add(column);

  const wheel = new THREE.Group();
  pivot.add(wheel);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 8, 32), darker);
  wheel.add(rim);

  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.03), darker);
  wheel.add(spokeH);

  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.03), darker);
  spokeV.position.set(0, -0.12, 0);
  wheel.add(spokeV);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), darker);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), red);
  marker.position.set(0, 0.24, 0);
  wheel.add(marker);

  cockpit.userData.wheel = wheel;

  return cockpit;
}

export function applyBusSpec(bus, spec) {
  const old = bus.userData.exterior;
  if (old) {
    bus.remove(old);
    old.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }

  const exterior = createExterior(spec);
  bus.add(exterior);

  bus.userData.exterior = exterior;
  bus.userData.specId = spec.id;
  bus.userData.stats = {
    maxSpeed: spec.maxSpeed,
    accel: spec.accel,
    brake: spec.brake,
    turn: spec.turn
  };
}

export function createBus(spec) {
  const bus = new THREE.Group();

  const cockpit = createCockpit();
  cockpit.visible = false;
  bus.add(cockpit);

  bus.userData.speed = 0;
  bus.userData.pedal = 0;
  bus.userData.gear = "D";
  bus.userData.wheelValue = 0;
  bus.userData.cockpit = cockpit;
  bus.userData.wheel = cockpit.userData.wheel;

  applyBusSpec(bus, spec);

  return bus;
}

export function resetBus(bus, x, z, heading) {
  bus.position.set(x, 0, z);
  bus.rotation.y = heading;
  bus.userData.speed = 0;
  bus.userData.pedal = 0;
  bus.userData.gear = "D";
  bus.userData.wheelValue = 0;
  bus.userData.wheel.rotation.z = 0;
}

export function updateBus(bus, input, dt) {
  const stats = bus.userData.stats;
  const maxSpeed = stats.maxSpeed;
  const accel = DRIVE.accel * stats.accel;
  const brakePower = DRIVE.brake * stats.brake;
  const turnBase = DRIVE.turnRate * stats.turn;
  const drag = 1.5;
  const limit = 450;
  const wheelMax = (STEER.maxDegrees * Math.PI) / 180;
  const reverse = bus.userData.gear === "R";

  let speed = bus.userData.speed;
  let pedal = bus.userData.pedal;

  const pedalRate = (input.throttle > pedal ? DRIVE.pedalRise : DRIVE.pedalFall) * dt;
  if (pedal < input.throttle) {
    pedal = Math.min(input.throttle, pedal + pedalRate);
  } else if (pedal > input.throttle) {
    pedal = Math.max(input.throttle, pedal - pedalRate);
  }

  if (pedal > 0) {
    if (reverse) {
      speed -= DRIVE.reverseAccel * pedal * (1 - Math.abs(speed) / DRIVE.reverseMax) * dt;
    } else {
      speed += accel * pedal * (1 - speed / maxSpeed) * dt;
    }
  }

  if (input.brake > 0) {
    if (speed > 0) {
      speed = Math.max(0, speed - brakePower * input.brake * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + brakePower * input.brake * dt);
    }
  }

  if (input.throttle === 0 && input.brake === 0) {
    if (speed > 0) {
      speed = Math.max(0, speed - drag * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + drag * dt);
    }
  }

  if (reverse) {
    speed = Math.max(-DRIVE.reverseMax, Math.min(0, speed));
  } else {
    speed = Math.max(0, Math.min(maxSpeed, speed));
  }

  const direction = speed < 0 ? -1 : 1;
  const turnFactor = Math.min(1, Math.abs(speed) / 3) * direction;
  const turnRate = turnBase * (1 - DRIVE.highSpeedLoss * (Math.abs(speed) / maxSpeed));
  bus.rotation.y -= input.steer * turnRate * turnFactor * dt;

  const heading = bus.rotation.y;
  bus.position.x += -Math.sin(heading) * speed * dt;
  bus.position.z += -Math.cos(heading) * speed * dt;
  bus.position.x = Math.max(-limit, Math.min(limit, bus.position.x));
  bus.position.z = Math.max(-limit, Math.min(limit, bus.position.z));

  bus.userData.speed = speed;
  bus.userData.pedal = pedal;

  const follow = 1 - Math.exp(-14 * dt);
  bus.userData.wheelValue += (input.steer - bus.userData.wheelValue) * follow;
  bus.userData.wheel.rotation.z = -bus.userData.wheelValue * wheelMax;
}
