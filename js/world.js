import * as THREE from "three";

export function createWorld(scene) {
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

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 1000),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const dashGeometry = new THREE.BoxGeometry(0.2, 0.02, 3);

  for (let z = -480; z <= 480; z += 8) {
    const dash = new THREE.Mesh(dashGeometry, lineMaterial);
    dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  const edgeGeometry = new THREE.BoxGeometry(0.15, 0.02, 1000);

  [-4.7, 4.7].forEach((x) => {
    const edge = new THREE.Mesh(edgeGeometry, lineMaterial);
    edge.position.set(x, 0.02, 0);
    scene.add(edge);
  });

  const heights = [8, 14, 10, 18, 12, 9, 16];
  const colors = [0xb0bec5, 0x90a4ae, 0xcfd8dc, 0xa1887f, 0xbcaaa4];
  const materials = colors.map((c) => new THREE.MeshLambertMaterial({ color: c }));

  for (let i = -24; i <= 24; i++) {
    [-1, 1].forEach((side) => {
      const index = i + 24 + (side === 1 ? 3 : 0);
      const h = heights[index % heights.length];
      const material = materials[(i + 24 + (side === 1 ? 2 : 0)) % materials.length];
      const building = new THREE.Mesh(new THREE.BoxGeometry(8, h, 10), material);
      building.position.set(side * (14 + ((i + 24) % 3) * 3), h / 2, i * 20);
      scene.add(building);
    });
  }
}
