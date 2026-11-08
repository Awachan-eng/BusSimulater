export function createControls() {
  const touch = { left: false, right: false, accel: false, brake: false };
  const key = { left: false, right: false, accel: false, brake: false };
  const input = { throttle: 0, brake: 0, steer: 0 };

  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "accel",
    KeyW: "accel",
    ArrowDown: "brake",
    KeyS: "brake",
    Space: "brake"
  };

  function bindButton(id, name) {
    const el = document.getElementById(id);
    const release = () => {
      touch[name] = false;
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      touch[name] = true;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  bindButton("btn-left", "left");
  bindButton("btn-right", "right");
  bindButton("btn-accel", "accel");
  bindButton("btn-brake", "brake");

  window.addEventListener("keydown", (e) => {
    const name = keyMap[e.code];
    if (name) {
      key[name] = true;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const name = keyMap[e.code];
    if (name) {
      key[name] = false;
      e.preventDefault();
    }
  });

  function update(dt) {
    const left = touch.left || key.left;
    const right = touch.right || key.right;
    const target = (right ? 1 : 0) - (left ? 1 : 0);
    const rate = (target === 0 ? 6 : 4) * dt;

    if (input.steer < target) {
      input.steer = Math.min(target, input.steer + rate);
    } else if (input.steer > target) {
      input.steer = Math.max(target, input.steer - rate);
    }

    input.throttle = touch.accel || key.accel ? 1 : 0;
    input.brake = touch.brake || key.brake ? 1 : 0;
  }

  function reset() {
    Object.keys(touch).forEach((name) => {
      touch[name] = false;
      key[name] = false;
    });
    input.throttle = 0;
    input.brake = 0;
    input.steer = 0;
  }

  return { input: input, update: update, reset: reset };
}
