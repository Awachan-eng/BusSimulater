import * as THREE from "three";

function createExterior(color) {
  const exterior = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.8, 10),
    new THREE.MeshLambertMaterial({ color: color })
  );
  body.position.y = 2.0;
  exterior.add(body);

  const glassMaterial = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });

  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.9, 8), glassMaterial);
  sideWindows.position.set(0, 2.5, 0.2);
  exterior.add(sideWindows);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 0.05), glassMaterial);
  windshield.position.set(0, 2.4, -5.01);
  exterior.add(windshield);

  const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff176 });

  [-0.9, 0.9].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), lightMaterial);
    headlight.position.set(x, 1.0, -5.01);
    exterior.add(headlight);
  });

  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

  [-1.3, 1.3].forEach((x) => {
    [-3, 3].forEach((z) => {
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

export function createBus(color) {
  const bus = new THREE.Group();

  const exterior = createExterior(color);
  bus.add(exterior);

  const cockpit = createCockpit();
  cockpit.visible = false;
  bus.add(cockpit);

  bus.userData.speed = 0;
  bus.userData.exterior = exterior;
  bus.userData.cockpit = cockpit;
  bus.userData.wheel = cockpit.userData.wheel;

  return bus;
}

export function resetBus(bus, x, z, heading) {
  bus.position.set(x, 0, z);
  bus.rotation.y = heading;
  bus.userData.speed = 0;
  bus.userData.wheel.rotation.z = 0;
}

export function updateBus(bus, input, dt) {
  const maxSpeed = 22;
  const accel = 5;
  const brakePower = 12;
  const drag = 1.5;
  const limit = 450;

  let speed = bus.userData.speed;

  if (input.throttle > 0) {
    speed += accel * input.throttle * dt;
  }
  if (input.brake > 0) {
    speed -= brakePower * input.brake * dt;
  }
  if (input.throttle === 0 && input.brake === 0) {
    speed -= drag * dt;
  }

  speed = Math.max(0, Math.min(maxSpeed, speed));

  const turnFactor = Math.min(1, speed / 5);
  const turnRate = 0.8 * (1 - 0.5 * (speed / maxSpeed));
  bus.rotation.y -= input.steer * turnRate * turnFactor * dt;

  const heading = bus.rotation.y;
  bus.position.x += -Math.sin(heading) * speed * dt;
  bus.position.z += -Math.cos(heading) * speed * dt;
  bus.position.x = Math.max(-limit, Math.min(limit, bus.position.x));
  bus.position.z = Math.max(-limit, Math.min(limit, bus.position.z));

  bus.userData.speed = speed;
  bus.userData.wheel.rotation.z = -input.steer * 1.6;
}
