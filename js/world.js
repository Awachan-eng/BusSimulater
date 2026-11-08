import * as THREE from "three";

export function createWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshLambertMaterial({ color: 0x4caf50 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 1000),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

  for (let z = -240; z <= 240; z += 8) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 3), lineMaterial);
    dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  [-4.7, 4.7].forEach((x) => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 1000), lineMaterial);
    edge.position.set(x, 0.02, 0);
    scene.add(edge);
  });

  const heights = [8, 14, 10, 18, 12, 9, 16];
  const colors = [0xb0bec5, 0x90a4ae, 0xcfd8dc, 0xa1887f, 0xbcaaa4];

  for (let i = -10; i <= 10; i++) {
    [-1, 1].forEach((side) => {
      const h = heights[(i + 10 + (side === 1 ? 3 : 0)) % heights.length];
      const color = colors[(i + 10 + (side === 1 ? 2 : 0)) % colors.length];
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(8, h, 10),
        new THREE.MeshLambertMaterial({ color: color })
      );
      building.position.set(side * (14 + ((i + 10) % 3) * 3), h / 2, i * 20);
      scene.add(building);
    });
  }
}
