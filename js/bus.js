import * as THREE from "three";

export function createBus(color) {
  const bus = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.8, 10),
    new THREE.MeshLambertMaterial({ color: color })
  );
  body.position.y = 2.0;
  bus.add(body);

  const glassMaterial = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });

  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.9, 8), glassMaterial);
  sideWindows.position.set(0, 2.5, 0.2);
  bus.add(sideWindows);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 0.05), glassMaterial);
  windshield.position.set(0, 2.4, -5.01);
  bus.add(windshield);

  const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff176 });

  [-0.9, 0.9].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), lightMaterial);
    headlight.position.set(x, 1.0, -5.01);
    bus.add(headlight);
  });

  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

  [-1.3, 1.3].forEach((x) => {
    [-3, 3].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.5, z);
      bus.add(wheel);
    });
  });

  bus.userData.speed = 0;

  return bus;
}

export function resetBus(bus, x, z, heading) {
  bus.position.set(x, 0, z);
  bus.rotation.y = heading;
  bus.userData.speed = 0;
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
}
