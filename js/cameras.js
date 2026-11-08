import * as THREE from "three";

export function createCameraRig(camera, bus) {
  let mode = "chase";

  const forward = new THREE.Vector3();
  const target = new THREE.Vector3();
  const look = new THREE.Vector3();

  function place(dt, snap) {
    const heading = bus.rotation.y;
    forward.set(-Math.sin(heading), 0, -Math.cos(heading));

    bus.userData.exterior.visible = mode !== "driver";
    bus.userData.cockpit.visible = mode === "driver";
    bus.updateMatrixWorld(true);

    const fov = mode === "driver" ? 75 : 60;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (mode === "chase") {
      target.copy(bus.position).addScaledVector(forward, -15);
      target.y = 6.5;
      if (snap) {
        camera.position.copy(target);
      } else {
        camera.position.lerp(target, 1 - Math.exp(-6 * dt));
      }
      look.copy(bus.position).addScaledVector(forward, 8);
      look.y = 2;
      camera.lookAt(look);
    } else {
      target.set(0.7, 2.6, -3.4);
      bus.localToWorld(target);
      camera.position.copy(target);
      look.set(0.7, 2.45, -30);
      bus.localToWorld(look);
      camera.lookAt(look);
    }
  }

  return {
    update(dt) {
      place(dt, false);
    },
    snap() {
      place(0, true);
    },
    toggle() {
      mode = mode === "chase" ? "driver" : "chase";
      place(0, true);
      return mode;
    },
    getMode() {
      return mode;
    }
  };
}
