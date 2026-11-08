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

  return bus;
}
